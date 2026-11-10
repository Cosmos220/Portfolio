/* Points de vue de la caméra.

   Chaque rubrique du portfolio a un quartier et un angle de prise de vue :
   passer d'une section à l'autre, c'est donc voyager d'un endroit de la ville
   à un autre, pas changer de fond d'écran.

   Les coordonnées sont choisies À LA MAIN en connaissant la grille de
   `generate.ts` : les rues passent par x = k × 18 et z = k × 18 (les blocs sont
   centrés sur ±9, ±27…). Une caméra posée sur x = 0 descend donc dans
   l'avenue centrale sans traverser de façade. Si la grille change, ces points
   sont à revoir. */
import type { CityCam, DistrictId } from "./generate";

export type Vec3 = [number, number, number];

export type Station = {
  pos: Vec3;
  look: Vec3;
  fov: number;
  /* Opacité du voile sombre posé sur la ville pour garder le texte lisible :
     léger sur l'accueil (la ville est le sujet), plus dense sur les pages de
     lecture. */
  veil: number;
  /* Quartier survolé, pour les notifications de déplacement. */
  district: DistrictId;
};

export type StationId =
  | "intro-far"
  | "intro-mid"
  | "profil"
  | "parcours"
  | "competences"
  | "projets"
  | "contact"
  | "detail";

export const STATIONS: Record<StationId, Station> = {
  /* Survol d'ouverture : on arrive de très haut et très loin, puis on
     descend vers la ville pendant l'introduction. */
  "intro-far": {
    pos: [0, 340, 450],
    look: [0, 10, 0],
    fov: 44,
    veil: 0,
    district: "centre",
  },
  "intro-mid": {
    pos: [-150, 130, 230],
    look: [10, 45, -10],
    fov: 48,
    veil: 0,
    district: "centre",
  },
  /* PROFIL : le centre vu de loin et de côté, le gros des tours à droite de
     l'écran pour laisser la gauche au texte. */
  profil: {
    pos: [-120, 70, 250],
    look: [-10, 18, -20],
    fov: 50,
    veil: 0.32,
    district: "centre",
  },
  /* PARCOURS : quartiers résidentiels du nord, plus bas et plus calmes. */
  parcours: {
    pos: [40, 62, -250],
    look: [-20, 14, -150],
    fov: 50,
    veil: 0.5,
    district: "nord",
  },
  /* COMPÉTENCES : la zone industrielle, ses cheminées et le réseau. */
  competences: {
    pos: [-290, 56, 110],
    look: [-40, 14, -10],
    fov: 48,
    veil: 0.52,
    district: "industrie",
  },
  /* PROJETS : on s'engage dans l'avenue centrale, entre les tours. */
  projets: {
    pos: [0, 40, 225],
    look: [0, 26, -40],
    fov: 54,
    veil: 0.5,
    district: "centre",
  },
  /* CONTACT : prise de recul, toute la ville et son réseau d'un coup. */
  contact: {
    pos: [140, 130, 200],
    look: [-10, 10, 5],
    fov: 50,
    veil: 0.45,
    district: "peripherie",
  },
  /* Fiche projet : repli neutre, remplacé par `detailStation`. */
  detail: {
    pos: [70, 60, 90],
    look: [0, 20, 0],
    fov: 52,
    veil: 0.7,
    district: "centre",
  },
};

/* Caméra de surveillance → point de vue. Contrairement aux stations ci-dessus
   (aériennes, pilotées par le défilement), il est FIXE : une position dans la
   rue et un bâtiment visé. Le voile reste léger pour laisser voir le flux. */
export function camStation(cam: CityCam): Station {
  return {
    pos: cam.pos,
    look: cam.look,
    fov: cam.fov,
    veil: 0.4,
    district: cam.district,
  };
}

/* Rubriques de l'accueil, dans l'ordre où elles apparaissent à l'écran. */
export const HOME_ORDER: { id: StationId; section: string }[] = [
  { id: "profil", section: "top" },
  { id: "parcours", section: "about" },
  { id: "competences", section: "stack" },
  { id: "projets", section: "projets" },
  { id: "contact", section: "contact" },
];

/* Une fiche projet survole un quartier choisi à partir de son identifiant :
   deux projets différents n'ont pas la même vue, mais le même projet retrouve
   toujours la sienne. */
const DETAIL_SPOTS: { center: [number, number]; district: DistrictId }[] = [
  { center: [0, 0], district: "centre" },
  { center: [-20, -165], district: "nord" },
  { center: [190, 35], district: "docks" },
  { center: [-175, 140], district: "industrie" },
  { center: [120, 210], district: "peripherie" },
];

export function detailStation(slug: string): Station {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const spot = DETAIL_SPOTS[h % DETAIL_SPOTS.length]!;
  const [cx, cz] = spot.center;
  /* Dans le centre, les tours montent à plus de 150 m : la caméra monte
     aussi pour ne pas finir dans une façade. */
  const high = spot.district === "centre" ? 66 : 44;
  return {
    pos: [cx + 62, high, cz + 82],
    look: [cx, spot.district === "centre" ? 16 : 8, cz],
    fov: 52,
    veil: 0.72,
    district: spot.district,
  };
}
