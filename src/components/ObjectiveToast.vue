<script setup lang="ts">
import { inject, ref, watch, onBeforeUnmount, type Ref } from "vue";
import { useRoute } from "vue-router";

/* Bandeau d'objectif, comme dans un jeu d'action : à l'arrivée sur une
   page, une consigne courte s'affiche en haut à gauche avec son icône
   hexagonale, puis s'efface. Elle donne au visiteur la « mission » de la
   page. Affichée seulement après le voile d'intro, pour ne pas se perdre
   dessous. */
const route = useRoute();
const introActive = inject<Ref<boolean>>("introActive", ref(false));

function objectiveFor(path: string) {
  if (path === "/") return "Découvrir mes projets.";
  if (path === "/projets") return "Choisir un projet à analyser.";
  if (path.startsWith("/projets/")) return "Analyser le projet.";
  if (path === "/contact") return "Établir le contact.";
  return "";
}

const text = ref("");
const visible = ref(false);
let showTimer: number | undefined;
let hideTimer: number | undefined;

function schedule() {
  window.clearTimeout(showTimer);
  window.clearTimeout(hideTimer);
  visible.value = false;
  const next = objectiveFor(route.path);
  if (!next || introActive.value) return;
  showTimer = window.setTimeout(() => {
    text.value = next;
    visible.value = true;
    hideTimer = window.setTimeout(() => (visible.value = false), 4800);
  }, 450);
}

watch(() => route.path, schedule);
// Le voile d'intro se lève : c'est le bon moment pour afficher la consigne.
watch(introActive, (active) => {
  if (!active) schedule();
}, { immediate: true });

onBeforeUnmount(() => {
  window.clearTimeout(showTimer);
  window.clearTimeout(hideTimer);
});
</script>

<template>
  <div class="objective" :class="{ 'is-on': visible }" role="status">
    <svg class="objective-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5 20.2 7.25v9.5L12 21.5 3.8 16.75v-9.5z" fill="none" stroke="currentColor" stroke-width="2" />
    </svg>
    <span v-if="visible">
      <span class="sr-only">Objectif : </span>{{ text }}
    </span>
  </div>
</template>

<style scoped>
.objective {
  position: fixed;
  top: 5.25rem;
  left: 1rem;
  z-index: 46;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1.1rem 0.7rem 0.9rem;
  background: rgba(0, 0, 0, 0.78);
  border-bottom: 2px solid var(--foreground);
  color: var(--foreground);
  font-size: 15px;
  font-weight: 500;
  pointer-events: none;
  visibility: hidden;
}
@media (min-width: 640px) {
  .objective {
    left: 1.5rem;
  }
}
/* Entrée : le bandeau se déroule de gauche à droite, par crans. */
.objective.is-on {
  visibility: visible;
  animation: objectiveIn 0.32s steps(6, end) both;
}
@keyframes objectiveIn {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}
.objective-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .objective.is-on {
    animation: none;
  }
}
</style>
