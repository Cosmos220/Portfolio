/* Les cinq rubriques du portfolio, définies UNE fois.

   Le menu « smartphone », la mini-carte et la barre d'en-tête les lisent toutes
   ici : ajouter ou renommer une rubrique ne se fait qu'à un endroit, et les
   trois navigations ne peuvent pas diverger.

   « Parcours » n'a pas de page propre : il pointe sur la section « À propos »
   (formation et situation), qui existe déjà. Rien n'a été inventé pour la
   remplir. */
import { computed, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { camForRubric, cityState, connectCamera } from "../city/state";
import type { StationId } from "../city/stations";

export type RubricId = "profil" | "projets" | "competences" | "parcours" | "contact";

export type Rubric = {
  id: RubricId;
  label: string;
  /* Page visée, et section de l'accueil à atteindre (sans « # »). */
  path: string;
  section?: string;
};

export const RUBRICS: Rubric[] = [
  { id: "profil", label: "Profil", path: "/", section: "top" },
  { id: "projets", label: "Projets", path: "/projets" },
  { id: "competences", label: "Compétences", path: "/", section: "stack" },
  { id: "parcours", label: "Parcours", path: "/", section: "about" },
  { id: "contact", label: "Contact", path: "/contact" },
];

/* Point de vue de la ville → rubrique correspondante. Une fiche projet reste
   dans la rubrique « Projets ». */
const STATION_TO_RUBRIC: Partial<Record<StationId, RubricId>> = {
  profil: "profil",
  parcours: "parcours",
  competences: "competences",
  projets: "projets",
  contact: "contact",
  detail: "projets",
};

export function useRubrics() {
  const route = useRoute();
  const router = useRouter();

  /* Rubrique courante : on se fie au point de vue de la caméra (qui suit le
     défilement) sur l'accueil, et à la route ailleurs. */
  const activeId = computed<RubricId | null>(() => {
    if (route.name === "home") return STATION_TO_RUBRIC[cityState.station] ?? "profil";
    if (route.name === "projects" || route.name === "project") return "projets";
    if (route.name === "contact") return "contact";
    return null;
  });

  /* `viaCamera` : appel venu du réseau de surveillance (la caméra est déjà
     en place, il ne reste qu'à ouvrir la rubrique). Sinon, en mode caméra,
     choisir une rubrique revient à changer de caméra : les deux restent
     synchronisés. */
  async function go(r: Rubric, viaCamera = false) {
    if (!viaCamera && cityState.surv.mode === "camera") {
      const cam = camForRubric(r.id);
      if (cam) {
        connectCamera(cam.id);
        return;
      }
    }
    const sameRoute = route.path === r.path;
    if (!sameRoute) await router.push({ path: r.path });
    await nextTick();
    /* Même page : le routeur ne fait rien, on défile nous-mêmes. */
    if (r.path === "/" && r.section) {
      if (r.section === "top") window.scrollTo({ top: 0, behavior: "smooth" });
      else document.getElementById(r.section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (sameRoute) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return { rubrics: RUBRICS, activeId, go };
}
