<script setup lang="ts">
/* Un vrai easter egg : pas une icône décorative visible en permanence, mais
   un creeper quasi invisible (couleur à 22% d'opacité sur fond noir) qu'il
   faut repérer en scrutant le pied de page. Il ne se trahit qu'au survol.

   Au clic : le son réel du creeper, puis une secousse. La synthèse maison
   reste en repli si le fichier ne se charge pas — un easter egg muet vaut
   mieux qu'un easter egg cassé. */
import { ref, onBeforeUnmount } from "vue";
import PixelSprite from "./ui/PixelSprite.vue";
import { loadSample, playSample, sfxCreeper } from "../composables/useChiptune";
import { creeperSoundUrl } from "../data/assets";

/* Mesuré sur le fichier : 4,69 s au total, 0,34 s de silence de tête, et la
   détonation à 2,63 s. On saute le silence pour que le sifflement démarre
   net au clic ; la détonation tombe alors 2,29 s après. */
const SKIP_S = 0.34;
const BOOM_AT_MS = 2290;

/* Calage du repli synthétisé, dont la détonation arrive bien plus tôt. */
const SYNTH_BOOM_AT_MS = 680;

const BOOM_MS = 420;

const exploding = ref(false);
const fusing = ref(false);
let boomTimer: number | undefined;
let endTimer: number | undefined;

const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Le son n'est téléchargé qu'ici : survoler ou tabuler jusqu'au sprite trahit
   l'intention de cliquer, et évite d'imposer 118 Ko à tous les visiteurs. */
function preload() {
  void loadSample(creeperSoundUrl);
}

function animate(boomAt: number) {
  if (reduce) return;
  exploding.value = false;
  fusing.value = false;
  window.clearTimeout(boomTimer);
  window.clearTimeout(endTimer);
  /* Retour à zéro avant relance, sinon un second clic ne rejouerait pas une
     animation déjà en cours. */
  window.setTimeout(() => (fusing.value = true), 0);
  boomTimer = window.setTimeout(() => {
    fusing.value = false;
    exploding.value = true;
  }, boomAt);
  endTimer = window.setTimeout(
    () => (exploding.value = false),
    boomAt + BOOM_MS,
  );
}

async function detonate() {
  /* Cas normal : le survol a déjà chargé le son, il part sans latence. */
  if (playSample(creeperSoundUrl, { offset: SKIP_S, gain: 0.55 })) {
    animate(BOOM_AT_MS);
    return;
  }

  /* Clic sans survol préalable (tactile, ou clic très rapide) : on attend le
     chargement pour que l'image et le son restent synchronisés. */
  const buf = await loadSample(creeperSoundUrl);
  if (buf && playSample(creeperSoundUrl, { offset: SKIP_S, gain: 0.55 })) {
    animate(BOOM_AT_MS);
    return;
  }

  sfxCreeper();
  animate(SYNTH_BOOM_AT_MS);
}

onBeforeUnmount(() => {
  window.clearTimeout(boomTimer);
  window.clearTimeout(endTimer);
});
</script>

<template>
  <button
    type="button"
    class="eeg"
    :class="{ 'is-boom': exploding, 'is-fusing': fusing }"
    aria-label="Un petit secret"
    @pointerenter="preload"
    @focus="preload"
    @click="detonate"
  >
    <!-- 16px et non 13 : la texture inclut une ligne vide en haut et en bas,
         donc le visage n'occupe que 6 lignes sur 8. -->
    <PixelSprite name="creeper" :size="16" />
  </button>
</template>

<style scoped>
.eeg {
  display: inline-flex;
  color: var(--border-strong);
  cursor: pointer;
  transition: color 0.15s steps(2, end);
}
.eeg:hover,
.eeg:focus-visible {
  color: var(--accent);
}

/* Mèche : le creeper s'éclaire et gonfle par paliers pendant le sifflement,
   pour que le clic ait un effet immédiat sans annoncer l'explosion. */
.eeg.is-fusing {
  color: var(--accent-bright);
  animation: eegFuse 2.29s steps(7, end);
}
@keyframes eegFuse {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.4);
  }
}

.eeg.is-boom {
  color: var(--accent-bright);
  animation: eegBoom 0.42s steps(6, end);
}
@keyframes eegBoom {
  0% {
    transform: scale(1.4);
  }
  15% {
    transform: scale(1.9) rotate(-6deg);
  }
  30% {
    transform: scale(1.9) rotate(6deg);
  }
  45% {
    transform: scale(2.6) rotate(-4deg);
  }
  60% {
    transform: scale(0.2);
    opacity: 0.2;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .eeg.is-boom,
  .eeg.is-fusing {
    animation: none;
  }
}
</style>
