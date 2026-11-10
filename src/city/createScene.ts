/* Rendu 3D de la ville.

   Chargé EN DIFFÉRÉ (import dynamique depuis CityBackdrop) : Three.js pèse
   plusieurs centaines de Ko, il ne doit pas retarder l'affichage du texte.

   Budget : toute la ville tient en une poignée d'appels de dessin —
   immeubles (un seul `InstancedMesh`), sol, arcs, balises, circulation,
   poussière. Rien n'est recalculé par image côté JavaScript : seuls la
   caméra et un uniforme de temps bougent, tout le reste est dans les shaders. */
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  LinearSRGBColorSpace,
  InstancedBufferAttribute,
  InstancedMesh,
  LineSegments,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  BackSide,
  Box3,
  Raycaster,
  Vector2,
  EdgesGeometry,
  LineBasicMaterial,
  CylinderGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { getCity, type CityQuality } from "./generate";
import { Director } from "./director";
import {
  ARC_FRAG,
  ARC_VERT,
  BUILDING_FRAG,
  BUILDING_VERT,
  DUST_FRAG,
  DUST_VERT,
  GROUND_FRAG,
  GROUND_VERT,
  POINT_FRAG,
  POINT_VERT,
  SKY_FRAG,
  SKY_VERT,
  TRAFFIC_FRAG,
  TRAFFIC_VERT,
} from "./shaders";
import { rngFrom } from "./random";

export type CityRenderer = {
  director: Director;
  /* Compte réel d'éléments, repris par l'introduction (« NODES 1 742 »). */
  stats: { buildings: number; arcs: number; beacons: number };
  resize(width: number, height: number): void;
  /* Avance d'une image : `dt` et `time` en secondes. */
  frame(dt: number, time: number): void;
  /* Dernière position de caméra, pour la mini-carte. */
  camera: { x: number; y: number; z: number; yaw: number };
  /* Opacité du voile sombre voulue par le point de vue courant. */
  veil: number;
  /* Qualité effective après adaptation. */
  readonly pixelRatio: number;
  /* 0 = caméra à l'arrêt, 1 = vol rapide : sert à réduire la cadence au repos. */
  speed: number;
  /* Bâtiment « sélectionné » : cadre filaire + faisceau. null = aucun. */
  select(b: { x: number; z: number; w: number; d: number; h: number } | null): void;
  /* Projette un point du monde en pixels CSS ; `on` faux s'il est derrière la caméra. */
  project(x: number, y: number, z: number): { x: number; y: number; on: boolean };
  /* Identifiant CAM-00n du bâtiment sous le pointeur (coordonnées CSS), ou null.
     Un bâtiment plus proche qui masque la cible l'emporte : pas de faux positif. */
  pick(x: number, y: number): string | null;
  dispose(): void;
};

export type CityOptions = {
  quality: CityQuality;
  pixelRatio: number;
  /* Mouvement réduit : pas de dérive ni de parallaxe. */
  reduced: boolean;
};

/* Le brouillard et l'horizon ont la MÊME couleur : les tours lointaines se
   fondent dans la lueur de l'horizon au lieu de se perdre dans le noir. */
/* Couleurs « brutes » : `new Color(0x…)` convertit le sRGB en linéaire, or nos
   `ShaderMaterial` écrivent à l'écran SANS reconversion. Passer par le
   constructeur hexadécimal afficherait ces couleurs une dizaine de fois trop
   sombres — le ciel resterait noir. On fixe donc les composantes telles
   quelles, en précisant qu'elles sont déjà dans l'espace d'affichage. */
const raw = (hex: number) =>
  new Color().setRGB(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
    LinearSRGBColorSpace,
  );
const FOG_COLOR = raw(0x111315);
const ZENITH = raw(0x020203);

export function createCityRenderer(
  canvas: HTMLCanvasElement,
  opts: CityOptions,
): CityRenderer {
  const lite = opts.quality === "lite";
  const city = getCity(opts.quality);
  const rand = rngFrom(7771);

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(FOG_COLOR, 1);
  let dpr = opts.pixelRatio;
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.5, 1800);

  const director = new Director("intro-far");
  if (opts.reduced) director.driftAmount = 0;

  /* Uniformes partagés par tous les matériaux : une mise à jour par image
     suffit pour tout le monde. */
  const shared = {
    uTime: { value: 0 },
    uFogColor: { value: FOG_COLOR },
    uFogDensity: { value: lite ? 0.0030 : 0.0024 },
    uScale: { value: 600 },
  };

  /* ---- Ciel ------------------------------------------------------ */
  const sky = new Mesh(
    new SphereGeometry(1500, 24, 12),
    new ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: { uHorizon: { value: FOG_COLOR }, uZenith: { value: ZENITH } },
      side: BackSide,
      depthWrite: false,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  /* ---- Immeubles ------------------------------------------------ */
  const n = city.buildings.length;
  const boxGeo = new BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0); // la base repose sur y = 0 : l'échelle étire vers le haut
  const seeds = new Float32Array(n);
  const tones = new Float32Array(n);
  boxGeo.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
  boxGeo.setAttribute("aTone", new InstancedBufferAttribute(tones, 1));

  const buildingMat = new ShaderMaterial({
    vertexShader: BUILDING_VERT,
    fragmentShader: BUILDING_FRAG,
    uniforms: { ...shared, uWindows: { value: lite ? 0 : 1 } },
  });
  const buildings = new InstancedMesh(boxGeo, buildingMat, n);
  const m = new Matrix4();
  city.buildings.forEach((b, i) => {
    m.makeScale(b.w, b.h, b.d);
    m.setPosition(b.x, 0, b.z);
    buildings.setMatrixAt(i, m);
    seeds[i] = b.seed;
    tones[i] = b.tone;
  });
  buildings.instanceMatrix.needsUpdate = true;
  // Les immeubles ne bougent jamais : inutile de recalculer la boîte englobante.
  buildings.frustumCulled = false;
  scene.add(buildings);

  /* ---- Détection : boîtes englobantes, une par bâtiment ----------- */
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const hitV = new Vector3();
  const boxes = city.buildings.map(
    (b) =>
      new Box3(
        new Vector3(b.x - b.w / 2, 0, b.z - b.d / 2),
        new Vector3(b.x + b.w / 2, b.h, b.z + b.d / 2),
      ),
  );

  /* ---- Sol et rues --------------------------------------------- */
  const ground = new Mesh(
    new PlaneGeometry(2600, 2600).rotateX(-Math.PI / 2),
    new ShaderMaterial({
      vertexShader: GROUND_VERT,
      fragmentShader: GROUND_FRAG,
      uniforms: {
        ...shared,
        uPitch: { value: city.pitch },
        uHalf: { value: city.half },
      },
    }),
  );
  scene.add(ground);

  /* ---- Réseau : arcs entre les plus hautes tours ----------------- */
  const SEG = 10;
  const arcMax = lite ? 38 : 92;
  const lm = city.landmarks;
  const pairKey = new Set<string>();
  const arcPos: number[] = [];
  const arcT: number[] = [];
  const arcPhase: number[] = [];
  const arcSpeed: number[] = [];
  const arcRed: number[] = [];
  let arcs = 0;

  const addArc = (ai: number, bi: number, red: boolean) => {
    const a = lm[ai]!;
    const b = lm[bi]!;
    const key = ai < bi ? `${ai}-${bi}` : `${bi}-${ai}`;
    if (pairKey.has(key) || arcs >= arcMax) return;
    pairKey.add(key);
    const dist = Math.hypot(a.x - b.x, a.z - b.z);
    const lift = 10 + dist * 0.16;
    const phase = rand();
    const speed = 0.07 + rand() * 0.09;
    const pt = (t: number): [number, number, number] => [
      a.x + (b.x - a.x) * t,
      a.h + (b.h - a.h) * t + Math.sin(Math.PI * t) * lift,
      a.z + (b.z - a.z) * t,
    ];
    for (let s = 0; s < SEG; s++) {
      const t0 = s / SEG;
      const t1 = (s + 1) / SEG;
      arcPos.push(...pt(t0), ...pt(t1));
      arcT.push(t0, t1);
      arcPhase.push(phase, phase);
      arcSpeed.push(speed, speed);
      arcRed.push(red ? 1 : 0, red ? 1 : 0);
    }
    arcs++;
  };

  for (let i = 0; i < lm.length; i++) {
    /* Chaque tour se relie à ses deux plus proches voisines. */
    const near = lm
      .map((o, j) => ({ j, d: Math.hypot(lm[i]!.x - o.x, lm[i]!.z - o.z) }))
      .filter((o) => o.j !== i && o.d < 150)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    for (const o of near) addArc(i, o.j, false);
  }
  /* Quelques liaisons rouges : des alertes, pas une couleur d'ambiance. */
  for (let k = 0; k < 3 && lm.length > 12; k++) {
    const i = 4 + Math.floor(rand() * (lm.length - 8));
    const o = lm
      .map((q, j) => ({ j, d: Math.hypot(lm[i]!.x - q.x, lm[i]!.z - q.z) }))
      .filter((q) => q.j !== i && q.d > 30 && q.d < 140)
      .sort((p, q) => p.d - q.d)[0];
    if (o) addArc(i, o.j, true);
  }

  const arcGeo = new BufferGeometry();
  arcGeo.setAttribute("position", new BufferAttribute(new Float32Array(arcPos), 3));
  arcGeo.setAttribute("aT", new BufferAttribute(new Float32Array(arcT), 1));
  arcGeo.setAttribute("aPhase", new BufferAttribute(new Float32Array(arcPhase), 1));
  arcGeo.setAttribute("aSpeed", new BufferAttribute(new Float32Array(arcSpeed), 1));
  arcGeo.setAttribute("aRed", new BufferAttribute(new Float32Array(arcRed), 1));
  const arcMat = new ShaderMaterial({
    vertexShader: ARC_VERT,
    fragmentShader: ARC_FRAG,
    uniforms: { ...shared, uIntensity: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const arcLines = new LineSegments(arcGeo, arcMat);
  arcLines.frustumCulled = false;
  scene.add(arcLines);

  /* ---- Balises sur les toits ----------------------------------- */
  const bPos: number[] = [];
  const bSize: number[] = [];
  const bPhase: number[] = [];
  const bKind: number[] = [];
  lm.forEach((b, i) => {
    bPos.push(b.x, b.h + 1.2, b.z);
    bSize.push(5 + rand() * 4);
    bPhase.push(rand());
    /* Les dix plus hautes portent un feu rouge d'avertissement. */
    bKind.push(i < 10 ? 2 : rand() < 0.35 ? 1 : 0);
  });
  /* Quelques points isolés sur des immeubles moyens, pour que le réseau
     ne se limite pas aux gratte-ciel. */
  const extra = lite ? 24 : 70;
  for (let k = 0; k < extra; k++) {
    const b = city.buildings[Math.floor(rand() * n)]!;
    bPos.push(b.x, b.h + 0.8, b.z);
    bSize.push(3 + rand() * 3);
    bPhase.push(rand());
    bKind.push(rand() < 0.12 ? 2 : rand() < 0.3 ? 1 : 0);
  }
  /* Caméras du réseau : un point cyan sur le toit du bâtiment et un autre à
     l'emplacement de l'objectif, pour qu'on les repère sans les désigner. */
  for (const c of city.cams) {
    bPos.push(c.building.x, c.building.h + 1.5, c.building.z);
    bSize.push(8);
    bPhase.push(0.3);
    bKind.push(0);
    bPos.push(c.pos[0], c.pos[1], c.pos[2]);
    bSize.push(4.5);
    bPhase.push(0.6);
    bKind.push(0);
  }
  const beaconGeo = new BufferGeometry();
  beaconGeo.setAttribute("position", new BufferAttribute(new Float32Array(bPos), 3));
  beaconGeo.setAttribute("aSize", new BufferAttribute(new Float32Array(bSize), 1));
  beaconGeo.setAttribute("aPhase", new BufferAttribute(new Float32Array(bPhase), 1));
  beaconGeo.setAttribute("aKind", new BufferAttribute(new Float32Array(bKind), 1));
  const beaconMat = new ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const beacons = new Points(beaconGeo, beaconMat);
  beacons.frustumCulled = false;
  scene.add(beacons);

  /* ---- Circulation --------------------------------------------- */
  const cars = lite ? 50 : 150;
  const lanes = new Float32Array(cars * 4);
  const k0 = Math.floor(city.blocks / 2);
  for (let c = 0; c < cars; c++) {
    const road = (Math.floor(rand() * (k0 * 2 - 1)) - (k0 - 1)) * city.pitch;
    const sign = rand() < 0.5 ? -1 : 1;
    lanes[c * 4] = road + sign * 0.7; // voie de droite / de gauche
    lanes[c * 4 + 1] = rand() < 0.5 ? 0 : 1;
    lanes[c * 4 + 2] = sign * (9 + rand() * 16);
    lanes[c * 4 + 3] = rand();
  }
  const trafficGeo = new BufferGeometry();
  trafficGeo.setAttribute("position", new BufferAttribute(new Float32Array(cars * 3), 3));
  trafficGeo.setAttribute("aLane", new BufferAttribute(lanes, 4));
  const trafficMat = new ShaderMaterial({
    vertexShader: TRAFFIC_VERT,
    fragmentShader: TRAFFIC_FRAG,
    uniforms: { ...shared, uHalf: { value: city.half } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const traffic = new Points(trafficGeo, trafficMat);
  traffic.frustumCulled = false;
  scene.add(traffic);


  /* ---- Sélection : cadre filaire + faisceau sur le bâtiment visé ---- */
  const selGeo = new EdgesGeometry(new BoxGeometry(1, 1, 1));
  const selMat = new LineBasicMaterial({ color: new Color().setRGB(0.24, 0.9, 1.0, LinearSRGBColorSpace), fog: false });
  const selBox = new LineSegments(selGeo, selMat);
  selBox.visible = false;
  selBox.frustumCulled = false;
  scene.add(selBox);
  const beamGeo = new CylinderGeometry(0.6, 0.6, 1, 6, 1, true);
  const beamMat = new ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: "varying float vY; void main(){ vY = position.y + 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform float uTime; varying float vY; void main(){ float p = 0.55 + 0.45 * sin(uTime * 3.0 - vY * 6.0); gl_FragColor = vec4(vec3(0.24,0.9,1.0), (1.0 - vY) * 0.5 * p); }",
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const beam = new Mesh(beamGeo, beamMat);
  beam.visible = false;
  beam.frustumCulled = false;
  scene.add(beam);
  const tmpV = new Vector3();
  /* Anneau de scan : une fine boîte filaire qui monte le long de la façade. */
  const scanMat = new LineBasicMaterial({ color: new Color().setRGB(0.24, 0.9, 1.0, LinearSRGBColorSpace), fog: false, transparent: true, opacity: 0.8 });
  const scanRing = new LineSegments(selGeo, scanMat);
  scanRing.visible = false;
  scanRing.frustumCulled = false;
  scene.add(scanRing);
  let selected: { w: number; d: number; h: number } | null = null;

  /* ---- Poussière (désactivée sur petit écran) -------------------- */
  let dust: Points | null = null;
  if (!lite) {
    const count = 320;
    const seedsDust = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seedsDust[i * 4] = (rand() - 0.5) * (city.half * 2 + 80);
      seedsDust[i * 4 + 1] = rand() * 240;
      seedsDust[i * 4 + 2] = (rand() - 0.5) * (city.half * 2 + 80);
      seedsDust[i * 4 + 3] = rand();
    }
    const dustGeo = new BufferGeometry();
    dustGeo.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    dustGeo.setAttribute("aSeed", new BufferAttribute(seedsDust, 4));
    const dustMat = new ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms: shared,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    dust = new Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    scene.add(dust);
  }

  /* ---- Boucle ---------------------------------------------------- */
  let width = 1;
  let height = 1;
  let lastFov = -1;

  const applyScale = () => {
    /* Conversion taille monde → pixels pour les points : dépend de la hauteur
       du canvas et du champ de vision. */
    const fovRad = (camera.fov * Math.PI) / 180;
    shared.uScale.value = (height * renderer.getPixelRatio()) / (2 * Math.tan(fovRad / 2));
  };

  /* Adaptation de la résolution : si les images tardent, on baisse le rendu
     plutôt que de laisser la page saccader. */
  let ema = 16;
  let slowFrames = 0;

  const cam = { x: 0, y: 0, z: 0, yaw: 0 };

  const api: CityRenderer = {
    director,
    stats: { buildings: n, arcs, beacons: lm.length + extra },
    camera: cam,
    veil: 0,
    speed: 0,
    get pixelRatio() {
      return dpr;
    },
    resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      applyScale();
    },
    frame(dt, time) {
      shared.uTime.value = time;
      const s = director.update(dt, time);
      camera.position.set(s.pos[0], s.pos[1], s.pos[2]);
      camera.lookAt(s.look[0], s.look[1], s.look[2]);
      /* Pendant un vol rapide le champ s'élargit un peu : effet de vitesse. */
      const fov = s.fov + s.speed01 * 7;
      if (Math.abs(fov - lastFov) > 0.02) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
        applyScale();
        lastFov = fov;
      }
      cam.x = s.pos[0];
      cam.y = s.pos[1];
      cam.z = s.pos[2];
      cam.yaw = Math.atan2(s.look[0] - s.pos[0], -(s.look[2] - s.pos[2]));
      api.veil = s.veil;
      api.speed = s.speed01;

      if (selected && scanRing.visible) {
        scanRing.position.y = ((time * 0.5) % 1) * selected.h;
      }
      renderer.render(scene, camera);

      if (dt > 0) {
        ema += (dt * 1000 - ema) * 0.05;
        slowFrames = ema > 27 ? slowFrames + 1 : 0;
        if (slowFrames > 90 && dpr > 0.7) {
          dpr = Math.max(0.7, dpr * 0.82);
          renderer.setPixelRatio(dpr);
          renderer.setSize(width, height, false);
          applyScale();
          slowFrames = 0;
        }
      }
    },
    select(b) {
      if (!b) {
        selBox.visible = false;
        beam.visible = false;
        scanRing.visible = false;
        selected = null;
        return;
      }
      selected = b;
      scanRing.scale.set(b.w * 1.04, 0.6, b.d * 1.04);
      scanRing.position.set(b.x, 0, b.z);
      scanRing.visible = !opts.reduced;
      const pad = 1.06;
      selBox.scale.set(b.w * pad, b.h, b.d * pad);
      selBox.position.set(b.x, b.h / 2, b.z);
      const bh = 260;
      beam.scale.set(1, bh, 1);
      beam.position.set(b.x, b.h + bh / 2, b.z);
      selBox.visible = true;
      beam.visible = true;
    },
    pick(cx, cy) {
      ndc.set((cx / width) * 2 - 1, -(cy / height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const o = raycaster.ray.origin;
      let best = Infinity;
      let id: string | null = null;
      for (let i = 0; i < boxes.length; i++) {
        if (raycaster.ray.intersectBox(boxes[i]!, hitV)) {
          const d = hitV.distanceToSquared(o);
          if (d < best) {
            best = d;
            id = city.buildings[i]!.cam ?? null;
          }
        }
      }
      return id;
    },
    project(x, y, z) {
      tmpV.set(x, y, z).project(camera);
      return {
        x: (tmpV.x * 0.5 + 0.5) * width,
        y: (-tmpV.y * 0.5 + 0.5) * height,
        on: tmpV.z < 1 && tmpV.z > -1,
      };
    },
    dispose() {
      scanMat.dispose();
      selGeo.dispose();
      selMat.dispose();
      beamGeo.dispose();
      beamMat.dispose();
      boxGeo.dispose();
      buildingMat.dispose();
      ground.geometry.dispose();
      (ground.material as ShaderMaterial).dispose();
      arcGeo.dispose();
      arcMat.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      trafficGeo.dispose();
      trafficMat.dispose();
      if (dust) {
        dust.geometry.dispose();
        (dust.material as ShaderMaterial).dispose();
      }
      sky.geometry.dispose();
      (sky.material as ShaderMaterial).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  return api;
}
