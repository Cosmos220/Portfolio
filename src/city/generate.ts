/* Génération procédurale de la ville — AUCUNE dépendance à Three.js ni à Vue.

   Ce module ne produit que des données (positions, tailles, districts). Il est
   volontairement séparé du rendu : la mini-carte et la scène 3D lisent la même
   ville sans que l'une dépende du moteur 3D de l'autre, et la mini-carte ne
   force donc pas le téléchargement de Three.js.

   La génération est DÉTERMINISTE (graine fixe) : la ville est identique à
   chaque visite, ce qui permet de placer des caméras à des endroits choisis
   plutôt que de les espérer bien tombées. */

export type DistrictId = "centre" | "nord" | "docks" | "industrie" | "peripherie";

export type District = {
  id: DistrictId;
  /* Numéro et nom affichés dans les notifications. */
  code: string;
  name: string;
  /* Centre du district, dans le repère du monde (unités ≈ mètres). */
  x: number;
  z: number;
};

export type Building = {
  x: number;
  z: number;
  /* Emprise au sol et hauteur. */
  w: number;
  d: number;
  h: number;
  /* Teinte de gris (0..1) et graine pour les fenêtres. */
  tone: number;
  seed: number;
  district: DistrictId;
  /* Identifiant CAM-00n si le bâtiment porte une caméra du réseau. */
  cam?: string;
};

export type CamRubric = "profil" | "projets" | "competences" | "parcours" | "contact";

/* Caméra de surveillance : un point de vue FIXE posé dans la rue, orienté vers
   « son » bâtiment (à ne pas confondre avec les stations aériennes). */
export type CityCam = {
  id: string;
  rubric: CamRubric;
  /* Nom court affiché dans l'interface (« PROFILE », « SKILLS »…). */
  label: string;
  building: Building;
  district: DistrictId;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
};

const CAM_SPOTS: {
  id: string;
  rubric: CamRubric;
  label: string;
  anchor: [number, number];
  minH: number;
  /* Direction (radians) et distance de la caméra par rapport au bâtiment. */
  angle: number;
  dist: number;
  fov: number;
}[] = [
  { id: "CAM-001", rubric: "profil", label: "PROFILE", anchor: [-30, 15], minH: 36, angle: 0.75, dist: 64, fov: 54 },
  { id: "CAM-002", rubric: "projets", label: "PROJECTS", anchor: [0, -48], minH: 32, angle: 2.35, dist: 62, fov: 54 },
  { id: "CAM-003", rubric: "competences", label: "SKILLS", anchor: [-175, 140], minH: 28, angle: -0.6, dist: 64, fov: 54 },
  { id: "CAM-004", rubric: "parcours", label: "EDUCATION", anchor: [-20, -165], minH: 26, angle: 1.6, dist: 62, fov: 54 },
  { id: "CAM-005", rubric: "contact", label: "CONTACT", anchor: [120, 210], minH: 24, angle: 3.7, dist: 64, fov: 54 },
];

export type City = {
  buildings: Building[];
  districts: District[];
  /* Taille d'un pas de grille et nombre de blocs par côté. */
  pitch: number;
  blocks: number;
  /* Demi-côté de la ville : sert à cadrer les caméras et la mini-carte. */
  half: number;
  /* Les plus hauts bâtiments, points d'ancrage du réseau et des balises. */
  landmarks: Building[];
  /* Les cinq bâtiments du réseau de surveillance, dans l'ordre CAM-001…005. */
  cams: CityCam[];
};

export type CityQuality = "full" | "lite";

import { rngFrom } from "./random";

const PITCH = 18; // 14 de bloc + 4 de rue
const BLOCK = 14;

export const DISTRICTS: District[] = [
  { id: "centre", code: "01", name: "Centre", x: 0, z: 0 },
  { id: "nord", code: "02", name: "Quartiers nord", x: -20, z: -165 },
  { id: "docks", code: "03", name: "Docks", x: 190, z: 35 },
  { id: "industrie", code: "04", name: "Zone industrielle", x: -175, z: 140 },
  { id: "peripherie", code: "05", name: "Périphérie", x: 120, z: 210 },
];

function nearestDistrict(x: number, z: number): District {
  let best = DISTRICTS[0]!;
  let bd = Infinity;
  for (const d of DISTRICTS) {
    /* Le centre pèse plus : sa zone d'influence est plus large, sinon les
       districts voisins mangeraient les gratte-ciel. */
    const w = d.id === "centre" ? 0.72 : 1;
    const dist = Math.hypot(x - d.x, z - d.z) * w;
    if (dist < bd) {
      bd = dist;
      best = d;
    }
  }
  return best;
}

let cache: Partial<Record<CityQuality, City>> = {};

export function getCity(quality: CityQuality = "full"): City {
  const hit = cache[quality];
  if (hit) return hit;

  /* « lite » : moins de blocs, pour les petits écrans. Même graine et même
     disposition, la ville reste reconnaissable. */
  const blocks = quality === "full" ? 24 : 16;
  const rand = rngFrom(20130527);
  const half = (blocks * PITCH) / 2;
  const buildings: Building[] = [];

  for (let i = 0; i < blocks; i++) {
    for (let j = 0; j < blocks; j++) {
      const cx = (i - (blocks - 1) / 2) * PITCH;
      const cz = (j - (blocks - 1) / 2) * PITCH;
      const dist = nearestDistrict(cx, cz);
      const centreDist = Math.hypot(cx, cz);
      const push = (b: Omit<Building, "district" | "tone" | "seed">) =>
        buildings.push({
          ...b,
          district: dist.id,
          tone: 0.55 + rand() * 0.45,
          seed: rand(),
        });

      switch (dist.id) {
        case "centre": {
          /* Quartier d'affaires de taille moyenne : surtout des commerces
             (2–4 étages) et des bureaux (3–7), quelques volumes imposants et,
             très rarement, une vraie tour. Un étage ≈ 3,4 m. */
          const core = Math.max(0, 1 - centreDist / 150);
          const n = rand() < 0.5 ? 1 : 2;
          for (let k = 0; k < n; k++) {
            const w = n === 1 ? BLOCK * (0.55 + rand() * 0.3) : BLOCK * (0.4 + rand() * 0.1);
            const d = Math.min(BLOCK * 0.86, w * (0.78 + rand() * 0.45));
            const ox = n === 1 ? 0 : (k ? 1 : -1) * BLOCK * 0.24;
            const oz = n === 1 ? 0 : (k ? -1 : 1) * BLOCK * 0.24;
            const r = rand();
            let h: number;
            if (r < 0.4) h = 7 + rand() * 7; // commerces
            else if (r < 0.82) h = 12 + rand() * 14; // bureaux
            else if (r < 0.96) h = 28 + rand() * 18; // volumes imposants
            else h = 52 + rand() * (24 + core * 30); // tours (≈ 4 %)
            push({ x: cx + ox, z: cz + oz, w, d, h });
            /* Retrait au sommet des plus hauts seulement. */
            if (h > 50 && rand() < 0.6) {
              push({ x: cx + ox, z: cz + oz, w: w * 0.62, d: d * 0.62, h: h + 8 + rand() * 14 });
            }
          }
          break;
        }
        case "nord": {
          /* Résidentiel : lots serrés de 2 à 5 étages, gabarits variés. */
          for (let a = 0; a < 2; a++) {
            for (let b = 0; b < 2; b++) {
              if (rand() < 0.1) continue;
              push({
                x: cx + (a ? 1 : -1) * BLOCK * 0.25,
                z: cz + (b ? 1 : -1) * BLOCK * 0.25,
                w: BLOCK * (0.32 + rand() * 0.12),
                d: BLOCK * (0.32 + rand() * 0.12),
                h: 7 + Math.pow(rand(), 1.2) * 10,
              });
            }
          }
          break;
        }
        case "docks": {
          /* Entrepôts bas et allongés, tous dans le même sens. */
          const n = 1 + Math.floor(rand() * 2);
          for (let k = 0; k < n; k++) {
            push({
              x: cx,
              z: cz + (n === 1 ? 0 : (k ? 1 : -1) * BLOCK * 0.26),
              w: BLOCK * (0.82 + rand() * 0.1),
              d: n === 1 ? BLOCK * 0.5 : BLOCK * 0.3,
              h: 5 + rand() * 5,
            });
          }
          /* Silo ou grue : rare, plus haut que les entrepôts, sans être une tour. */
          if (rand() < 0.12) {
            push({ x: cx, z: cz, w: BLOCK * 0.2, d: BLOCK * 0.2, h: 20 + rand() * 12 });
          }
          break;
        }
        case "industrie": {
          /* Halls industriels, avec de temps en temps un bloc de bureaux
             plus compact et plus haut. */
          if (rand() < 0.35) {
            push({ x: cx, z: cz, w: BLOCK * 0.6, d: BLOCK * 0.5, h: 14 + rand() * 11 });
          } else {
            push({ x: cx, z: cz, w: BLOCK * 0.86, d: BLOCK * 0.74, h: 8 + rand() * 8 });
          }
          /* Cheminées : rares et fines. */
          if (rand() < 0.22) {
            push({
              x: cx + BLOCK * 0.28,
              z: cz - BLOCK * 0.26,
              w: BLOCK * 0.13,
              d: BLOCK * 0.13,
              h: 26 + rand() * 14,
            });
          }
          break;
        }
        case "peripherie": {
          /* Clairsemé : des parcelles vides, quelques maisons basses. */
          if (rand() < 0.38) break;
          push({
            x: cx + (rand() - 0.5) * 3,
            z: cz + (rand() - 0.5) * 3,
            w: BLOCK * (0.28 + rand() * 0.3),
            d: BLOCK * (0.28 + rand() * 0.3),
            h: 4 + rand() * 6,
          });
          break;
        }
      }
    }
  }

  /* ---- Bâtiments du réseau de surveillance ------------------------
     Cinq bâtiments existants sont désignés (pas ajoutés) : le plus
     remarquable près d'un point d'ancrage par quartier. Ils sont relevés au
     besoin pour émerger de leur voisinage, puis chacun reçoit une caméra posée
     à une intersection voisine, vue différente pour chacun. Tout est
     déterministe : même graine, même résultat. */
  const cams: CityCam[] = CAM_SPOTS.map((spot) => {
    let best = buildings[0]!;
    let bs = Infinity;
    for (const b of buildings) {
      if (b.cam) continue;
      const score = Math.hypot(b.x - spot.anchor[0], b.z - spot.anchor[1]) - b.h * 0.35;
      if (score < bs) {
        bs = score;
        best = b;
      }
    }
    best.h = Math.max(best.h, spot.minH);
    best.cam = spot.id;
    const px = Math.round((best.x + Math.cos(spot.angle) * spot.dist) / PITCH) * PITCH;
    const pz = Math.round((best.z + Math.sin(spot.angle) * spot.dist) / PITCH) * PITCH;
    const py = Math.min(60, Math.max(44, best.h + 16));
    return {
      id: spot.id,
      rubric: spot.rubric,
      label: spot.label,
      building: best,
      district: best.district,
      pos: [px, py, pz],
      look: [best.x, best.h * 0.58, best.z],
      fov: spot.fov,
    };
  });

  const landmarks = [...buildings]
    .sort((a, b) => b.h - a.h)
    .slice(0, quality === "full" ? 70 : 36);
  for (const c of cams) if (!landmarks.includes(c.building)) landmarks.push(c.building);

  const city: City = {
    buildings,
    districts: DISTRICTS,
    pitch: PITCH,
    blocks,
    half,
    landmarks,
    cams,
  };
  cache[quality] = city;
  return city;
}

/* Utile aux tests : repart d'un état vierge. */
export function _resetCityCache() {
  cache = {};
}
