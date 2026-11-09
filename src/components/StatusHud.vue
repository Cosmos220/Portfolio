<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

/* Ligne d'état en bas à gauche de l'écran, comme dans un menu de jeu :
   une progression et une aide de navigation. La progression est réelle :
   c'est la part de la page déjà lue.
   Purement décoratif pour les lecteurs d'écran (aria-hidden), et affiché
   seulement sur grand écran : en dessous, la marge à gauche du contenu est
   trop étroite et la ligne recouvrirait le texte. */
const pct = ref(0);
let raf = 0;
let ro: ResizeObserver | null = null;

function update() {
  raf = 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  pct.value = max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 100;
}
function onScroll() {
  if (!raf) raf = requestAnimationFrame(update);
}

const label = computed(() =>
  pct.value >= 100 ? "Analyse terminée." : `Analyse ${pct.value}%.`,
);

onMounted(() => {
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  // La hauteur de la page change sans défilement (images chargées, autre
  // page affichée) : sans ça, le pourcentage resterait celui de l'ancienne.
  ro = new ResizeObserver(onScroll);
  ro.observe(document.body);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  ro?.disconnect();
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
});
</script>

<template>
  <div class="sys-hud" aria-hidden="true">
    <p>{{ label }}</p>
    <p class="sys-hud-hint">
      <span class="sys-hud-key">↕</span>
      Naviguer
      <span class="sys-hud-key sys-hud-key--wide">Clic</span>
      Sélectionner
      <span class="sys-hud-key">S</span>
      Scanner
    </p>
  </div>
</template>

<style scoped>
.sys-hud {
  position: fixed;
  left: 1.5rem;
  bottom: 1.25rem;
  z-index: 44;
  display: none;
  pointer-events: none;
  font-family: var(--font-geist-mono);
  font-size: 11px;
  line-height: 1.5;
  color: var(--foreground);
  text-shadow: 0 0 6px #000;
}
@media (min-width: 1400px) {
  .sys-hud {
    display: block;
  }
}
.sys-hud p {
  margin: 0;
}
.sys-hud-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem !important;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
/* Touche ronde, comme les icônes de manette du jeu. */
.sys-hud-key {
  display: inline-grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 10px;
}
/* Touche rectangulaire pour un libellé plus long. */
.sys-hud-key--wide {
  width: auto;
  padding: 0 4px;
  border-radius: 0;
  margin-left: 0.5rem;
  font-size: 9px;
}
</style>
