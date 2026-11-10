<script setup lang="ts">
/* Pile de notifications système, en haut à droite, sous l'en-tête.

   Les messages sont annoncés poliment aux lecteurs d'écran (`aria-live`),
   mais sans interrompre. Le reste est décoratif. */
import { inject, ref, watch, type Ref } from "vue";
import { cityState } from "../city/state";
import { DISTRICTS } from "../city/generate";
import { dismiss, notifs, notify } from "../composables/useNotify";

/* Vrai tant que l'introduction joue. On n'utilise PAS `introActive`, qui
   inclut le fondu entre pages : un changement de page se produit justement
   pendant ce fondu, et sa notification serait avalée. */
const introActive = inject<Ref<boolean>>("loading", ref(false));

const LABEL: Record<string, string> = {
  profil: "Profil",
  parcours: "Parcours",
  competences: "Compétences",
  projets: "Projets",
  contact: "Contact",
  detail: "Fiche projet",
};

/* Rubriques déjà atteintes : la première fois, on parle de « nouvelles
   données détectées », ensuite d'un simple déplacement. */
const visited = new Set<string>();
let first = true;
let lastAt = 0;

watch(
  () => cityState.station,
  (st) => {
    if (introActive.value) return;
    // Le tout premier point de vue (arrivée sur le site) n'est pas un voyage.
    if (first) {
      first = false;
      visited.add(st);
      return;
    }
    const now = performance.now();
    if (now - lastAt < 1100) return;
    lastAt = now;

    const d = DISTRICTS.find((x) => x.id === cityState.district);
    const place = d ? `Secteur ${d.code} · ${d.name}` : "Secteur inconnu";
    const isNew = !visited.has(st);
    visited.add(st);
    notify({
      title: isNew ? "Nouvelles données détectées" : "Déplacement",
      text: `${LABEL[st] ?? st} — ${place}`,
    });
  },
);
</script>

<template>
  <div class="ns" aria-live="polite" aria-atomic="false">
    <div
      v-for="n in notifs"
      :key="n.id"
      class="ns-item"
      :class="{ 'is-alert': n.kind === 'alert' }"
      role="status"
      @click="dismiss(n.id)"
    >
      <p class="ns-title">{{ n.title }}</p>
      <p v-if="n.text" class="ns-text">{{ n.text }}</p>
    </div>
  </div>
</template>

<style scoped>
.ns {
  position: fixed;
  top: 4.6rem;
  right: 1rem;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  width: min(22rem, calc(100vw - 2rem));
  pointer-events: none;
}
.ns-item {
  width: 100%;
  border: 1px solid var(--border-strong);
  border-left: 3px solid var(--cyan);
  background: rgba(6, 6, 6, 0.86);
  padding: 0.55rem 0.8rem;
  pointer-events: auto;
  cursor: pointer;
  animation: nsIn 0.3s steps(5, end) both;
}
.ns-item.is-alert {
  border-left-color: var(--red);
}
@keyframes nsIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.ns-title {
  margin: 0;
  font-family: var(--font-silkscreen);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cyan);
}
.ns-item.is-alert .ns-title {
  color: var(--red);
}
.ns-text {
  margin: 0.2rem 0 0;
  font-family: var(--font-geist-mono);
  font-size: 12px;
  color: var(--muted);
}
@media (prefers-reduced-motion: reduce) {
  .ns-item {
    animation: none;
  }
}
</style>
