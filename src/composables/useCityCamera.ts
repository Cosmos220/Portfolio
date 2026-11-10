/* Relie la navigation à la caméra de la ville.

   · Sur l'ACCUEIL, le défilement pilote le vol : chaque section a son quartier,
     et quand on approche de la suivante la caméra glisse vers elle. Défiler
     la page, c'est survoler la ville.
   · Sur les AUTRES PAGES, chaque route a son point de vue (la liste des
     projets plonge dans l'avenue centrale, une fiche projet survole un
     quartier propre à ce projet…).

   Pendant l'introduction, c'est elle qui conduit la caméra : on ne touche à
   rien tant qu'elle n'a pas rendu la main. */
import { onBeforeUnmount, onMounted, watch, type Ref } from "vue";
import { useRoute } from "vue-router";
import { cityState, setCityCustom, setCityTarget } from "../city/state";
import { detailStation, HOME_ORDER } from "../city/stations";

const smooth = (t: number) => t * t * (3 - 2 * t);

export function useCityCamera(introActive: Ref<boolean>) {
  const route = useRoute();
  let raf = 0;

  /* Position de la sonde : un peu au-dessus du milieu de l'écran, là où l'œil
     se pose. */
  function homeTarget() {
    const probe = window.scrollY + window.innerHeight * 0.45;
    const tops = HOME_ORDER.map((h) => {
      const el = document.getElementById(h.section);
      return el ? el.getBoundingClientRect().top + window.scrollY : null;
    });

    let i = 0;
    for (let k = 0; k < tops.length; k++) {
      const t = tops[k];
      if (t !== null && t !== undefined && t <= probe) i = k;
    }
    const a = HOME_ORDER[i]!;
    const next = HOME_ORDER[i + 1];
    const topA = tops[i];
    const topB = tops[i + 1];

    if (!next || topA == null || topB == null) {
      setCityTarget(a.id);
      return;
    }
    /* La caméra reste posée sur son quartier pendant la première moitié de
       la section, puis s'en détache pour rejoindre le suivant : sans cette
       zone de repos, elle dériverait en permanence au moindre défilement. */
    const raw = (probe - topA) / Math.max(1, topB - topA);
    const t = smooth(Math.min(1, Math.max(0, (raw - 0.22) / 0.68)));
    setCityTarget(a.id, next.id, t);
  }

  function apply() {
    raf = 0;
    if (introActive.value) return;
    /* Mode caméra : la caméra de surveillance reste prioritaire. */
    if (cityState.surv.mode === "camera") return;
    const name = route.name;
    if (name === "home") homeTarget();
    else if (name === "projects") setCityTarget("projets");
    else if (name === "project") {
      const slug = String(route.params.slug ?? "");
      setCityCustom("detail", detailStation(slug));
    } else if (name === "contact") setCityTarget("contact");
  }

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };

  onMounted(() => {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
  });
  onBeforeUnmount(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
  });

  /* Changement de page : les sections de la nouvelle vue ne sont pas encore
     dans le DOM, on attend leur rendu avant de mesurer. */
  watch(
    () => route.fullPath,
    () => window.setTimeout(schedule, 60),
  );
  /* Retour à la vue aérienne : on reprend la rubrique actuellement visible. */
  watch(
    () => cityState.surv.mode,
    (m) => {
      if (m === "aerial") schedule();
    },
  );
  watch(introActive, (active) => {
    if (!active) schedule();
  });
}
