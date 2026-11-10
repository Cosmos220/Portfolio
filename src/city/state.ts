/* Pont entre la ville (qui vit hors de Vue, dans un chunk chargé en différé)
   et les composants de l'interface.

   Deux idées :
   · l'ÉTAT est réactif et utilisable tout de suite, même si Three.js n'est pas
     encore chargé — voire ne le sera jamais (pas de WebGL). Le point de vue
     courant, les notifications ou la mini-carte n'ont pas besoin de la 3D ;
   · les ORDRES (« va au quartier X ») sont retenus tant que la scène n'est pas
     prête, puis appliqués : le dernier ordre l'emporte, comme au défilement.

   Ce fichier n'importe que des TYPES de `createScene` : l'import de Three.js
   reste exclusivement dans le chunk différé. */
import { reactive } from "vue";
import type { CityRenderer } from "./createScene";
import { camStation, STATIONS, type Station, type StationId } from "./stations";
import { getCity, type CamRubric, type CityCam } from "./generate";

export const cityState = reactive({
  /* La scène 3D est montée et dessine. */
  ready: false,
  /* Faux si WebGL est absent, refusé, ou si le visiteur économise les données. */
  supported: true,
  /* Le canvas est visible (fondu d'entrée piloté par l'introduction). */
  visible: false,
  quality: "full" as "full" | "lite",
  /* Point de vue courant, et quartier survolé. */
  station: "intro-far" as StationId,
  district: "centre" as string,
  veil: 0,
  fps: 0,
  /* Position de la caméra, à ~10 Hz, pour la mini-carte et les indicateurs. */
  cam: { x: 0, y: 0, z: 0, yaw: 0 },
  nodes: 0,
  /* Réseau de surveillance. `mode` distingue l'exploration aérienne (la
     caméra suit le défilement) du mode caméra (une caméra choisie reste
     prioritaire). `phase` rythme la prise de contrôle. */
  surv: {
    mode: "aerial" as "aerial" | "camera",
    phase: "idle" as "idle" | "accessing" | "switching" | "connected" | "live",
    id: null as string | null,
    hover: null as string | null,
    /* Signal simulé, fixe par caméra (donnée d'ambiance, pas une mesure). */
    signal: 98,
  },
});

/* Les 5 caméras (même liste pour les deux qualités : seuls les bâtiments
   choisis peuvent différer). */
export const getCams = (): CityCam[] => getCity(cityState.quality).cams;
export const camForRubric = (r: CamRubric) => getCams().find((c) => c.rubric === r);
export const camById = (id: string) => getCams().find((c) => c.id === id);

/* Action « aller à la rubrique », fournie par l'interface (routeur). */
let navigator: ((r: CamRubric) => void) | null = null;
export function setCamNavigator(fn: ((r: CamRubric) => void) | null) {
  navigator = fn;
}

type Order = {
  a: StationId;
  b?: StationId;
  t?: number;
  custom?: { id: string; station: Station };
};

let renderer: CityRenderer | null = null;
let reduced = false;
let pending: Order | null = null;
let last: Order = { a: "intro-far" };

function apply(o: Order) {
  if (!renderer) return;
  if (o.custom) renderer.director.setCustomTarget(o.custom.id, o.custom.station);
  else renderer.director.setTarget(o.a, o.b, o.t);
  /* Mouvement réduit : pas de vol, on saute et on redessine une fois. */
  if (reduced) {
    renderer.director.snap();
    renderer.frame(0, 0);
  }
}

export function attachCity(r: CityRenderer | null, isReduced = false) {
  renderer = r;
  reduced = isReduced;
  if (r) apply(pending ?? last);
  pending = null;
}

export function setCityTarget(a: StationId, b?: StationId, t = 0) {
  const o: Order = { a, b, t };
  last = o;
  /* En mode caméra, la caméra choisie est prioritaire : l'ordre est mémorisé
     mais pas appliqué. */
  if (cityState.surv.mode === "camera") return;
  const cur = (b && t > 0.5 ? b : a) as StationId;
  cityState.station = cur;
  cityState.district = (STATIONS[cur] ?? STATIONS.profil).district;
  if (renderer) apply(o);
  else pending = o;
}

/* Point de vue calculé à la volée (fiche projet). */
export function setCityCustom(id: string, station: Station) {
  const o: Order = { a: "detail", custom: { id, station } };
  last = o;
  if (cityState.surv.mode === "camera") return;
  cityState.station = "detail";
  cityState.district = station.district;
  if (renderer) apply(o);
  else pending = o;
}

/* Saute au point de vue sans voyager (premier affichage). */
export function snapCity() {
  renderer?.director.snap();
}

export function showCity(visible = true) {
  cityState.visible = visible;
}

export function getCityRenderer() {
  return renderer;
}

/* ---- Prise de contrôle d'une caméra -------------------------------
   accessing  → cible verrouillée, « CAMERA ACCESSING »
   switching  → brève interférence ; PENDANT elle, la caméra change de point de
                vue d'un coup (coupure franche, comme un changement de flux)
                et la rubrique s'ouvre
   connected  → « CAMERA CONNECTED », puis live. */
const SIGNALS: Record<string, number> = {
  "CAM-001": 98, "CAM-002": 96, "CAM-003": 94, "CAM-004": 97, "CAM-005": 92,
};
let seq = 0;
let timers: number[] = [];
const later = (fn: () => void, ms: number) => {
  timers.push(window.setTimeout(fn, ms));
};
const clearTimers = () => {
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
};

function cut(station: Station, id: string) {
  if (!renderer) return;
  renderer.director.setCustomTarget(id, station);
  renderer.director.snap();
  renderer.director.driftAmount = reduced ? 0 : cityState.surv.mode === "camera" ? 0.3 : 1;
  if (reduced) renderer.frame(0, 0);
}

export function connectCamera(id: string) {
  const cam = camById(id);
  if (!cam) return;
  const s = cityState.surv;
  if (s.mode === "camera" && s.id === id && s.phase !== "idle") return;
  clearTimers();
  const mine = ++seq;
  s.id = id;
  s.hover = null;
  s.signal = SIGNALS[id] ?? 95;
  s.phase = "accessing";
  const t = reduced ? 0 : 1;
  later(() => {
    if (mine !== seq) return;
    s.phase = "switching";
    later(() => {
      if (mine !== seq) return;
      s.mode = "camera";
      cut(camStation(cam), `cam:${id}`);
      navigator?.(cam.rubric);
    }, 140 * t);
    later(() => {
      if (mine !== seq) return;
      s.phase = "connected";
    }, 380 * t);
    later(() => {
      if (mine !== seq) return;
      s.phase = "live";
    }, 2100 * t);
  }, 800 * t);
}

/* Retour à la vue aérienne : même coupure, puis le défilement reprend la main
   (le composable de caméra observe `surv.mode`). */
export function exitCamera() {
  const s = cityState.surv;
  if (s.mode !== "camera") {
    if (s.phase !== "idle") {
      clearTimers();
      seq++;
      s.phase = "idle";
      s.id = null;
    }
    return;
  }
  clearTimers();
  const mine = ++seq;
  const t = reduced ? 0 : 1;
  s.phase = "switching";
  later(() => {
    if (mine !== seq) return;
    s.mode = "aerial";
    s.id = null;
    if (renderer) renderer.director.driftAmount = reduced ? 0 : 1;
    /* Laisse le suivi du défilement poser sa cible, puis coupe dessus. */
    later(() => {
      if (mine !== seq) return;
      snapCity();
      s.phase = "idle";
    }, 90 * t);
  }, 140 * t);
}
