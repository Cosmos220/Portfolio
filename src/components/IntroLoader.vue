<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

/* Séquence de démarrage façon hacker, inspirée des écrans de chargement
   des jeux d'infiltration : au centre, des formes filaires se replient
   l'une dans l'autre puis cèdent la place à des blocs de texte inversés ;
   dessous, l'étape en cours, une ligne de progression d'un pixel et une
   astuce surlignée. L'accès est accordé, puis vient un écran titre
   (mire géante en fond, logo qui « décroche », « Appuyez sur une
   touche »), comme au lancement d'un jeu. L'écran s'éteint enfin comme
   un vieux moniteur. L'écran titre ne s'affiche qu'une fois par session :
   le revoir à chaque rechargement deviendrait vite pénible.

   Le principe : un loader doit justifier le temps qu'il fait attendre. On
   affiche donc une progression réelle (les étapes se cochent une par une)
   plutôt qu'une animation décorative. C'est aussi ce qui remplace le faux
   terminal qui décorait l'accueil — même vocabulaire, mais ici il a une
   raison d'être. */
const props = withDefaults(
  defineProps<{ steps?: string[]; eyebrow?: string }>(),
  {
    steps: () => [
      "Connexion au réseau",
      "Contournement du pare-feu",
      "Profil trouvé : Davi, Loïck",
      "Déchiffrement du portfolio",
    ],
    eyebrow: "Loïck_Davi",
  },
);
const emit = defineEmits<{ done: [] }>();

const doneCount = ref(0);
const pct = ref(0);
const leaving = ref(false);
const granted = ref(false);
const phase = ref<"boot" | "title">("boot");

const TITLE_KEY = "title-seen";
function titleSeen() {
  try {
    return sessionStorage.getItem(TITLE_KEY) === "1";
  } catch {
    return false;
  }
}

/* Libellé sous la scène : l'étape en cours, puis la confirmation. */
const stepLabel = computed(() =>
  granted.value
    ? "Accès autorisé."
    : `${props.steps[Math.min(doneCount.value, props.steps.length - 1)]}…`,
);
/* Les formes filaires laissent place aux blocs de texte à mi-parcours. */
const blocks = computed(() => pct.value >= 55);

/* Astuces affichées pendant le chargement : toutes renvoient à quelque
   chose qui existe vraiment sur le site. */
const TIPS = [
  "Astuce : survolez une carte projet pour la verrouiller, puis cliquez pour l'analyser.",
  "Astuce : dans la stack technique, les flèches changent de catégorie de compétences.",
  "Astuce : le CV est téléchargeable depuis la section À propos.",
  "Astuce : quelque chose se cache dans le pied de page.",
];
const tip = TIPS[Math.floor(Math.random() * TIPS.length)];

const timers: number[] = [];
let progressIv: number | undefined;

function leave() {
  if (leaving.value) return;
  removeSkip();
  leaving.value = true;
  timers.push(window.setTimeout(() => emit("done"), 360));
}

/* Écran titre : il part tout seul, ou dès que le visiteur appuie sur une
   touche ou clique — comme le « Press X » du jeu, sans jamais bloquer. */
function skip() {
  leave();
}
function removeSkip() {
  window.removeEventListener("keydown", skip);
  window.removeEventListener("pointerdown", skip);
}
function showTitle() {
  phase.value = "title";
  try {
    sessionStorage.setItem(TITLE_KEY, "1");
  } catch {
    /* stockage indisponible : l'écran titre reviendra, sans gravité */
  }
  window.addEventListener("keydown", skip);
  window.addEventListener("pointerdown", skip);
  timers.push(window.setTimeout(leave, 1900));
}

/* « Accès autorisé » reste lisible un instant, puis l'écran titre (ou la
   sortie directe). */
function finish(withTitle: boolean) {
  granted.value = true;
  timers.push(
    window.setTimeout(withTitle && !titleSeen() ? showTitle : leave, 300),
  );
}

onMounted(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce) {
    doneCount.value = props.steps.length;
    pct.value = 100;
    timers.push(window.setTimeout(() => finish(false), 220));
    return;
  }

  const step = 300;
  const total = props.steps.length * step + 180;

  props.steps.forEach((_, i) =>
    timers.push(
      window.setTimeout(() => (doneCount.value = i + 1), (i + 1) * step),
    ),
  );

  /* La jauge partage l'horloge des étapes et de la sortie : elle atteint
     100 % pile quand l'écran se lève, sinon elle mentirait sur l'attente.
     D'où un `setInterval` et non un `requestAnimationFrame` — ce dernier est
     suspendu quand l'onglet n'est pas au premier plan, ce qui laisserait la
     jauge bloquée à 0 % alors que les étapes, elles, continueraient. */
  const t0 = performance.now();
  progressIv = window.setInterval(() => {
    const p = Math.min(1, (performance.now() - t0) / total);
    pct.value = p * 100;
    if (p >= 1) window.clearInterval(progressIv);
  }, 30);

  timers.push(window.setTimeout(() => finish(true), total));
});

onBeforeUnmount(() => {
  removeSkip();
  window.clearInterval(progressIv);
  timers.forEach((t) => window.clearTimeout(t));
});
</script>

<template>
  <div :class="['boot', { 'is-leaving': leaving }]">
    <div v-if="phase === 'boot'" class="boot-inner">
      <!-- Scène centrale : formes filaires, puis blocs de texte -->
      <div class="boot-stage" aria-hidden="true">
        <svg v-if="!blocks" class="boot-shapes" viewBox="0 0 120 120">
          <polygon class="shape shape-a" points="60,8 112,60 60,112 8,60" />
          <polygon class="shape shape-b" points="60,108 14,28 106,28" />
          <polygon class="shape shape-c" points="60,12 106,92 14,92" />
        </svg>
        <div v-else class="boot-blocks">
          <span class="blk blk-1" />
          <span class="blk blk-2" />
          <span class="blk-text">{{ eyebrow }}</span>
          <span class="blk blk-3" />
        </div>
      </div>

      <p class="boot-step-label" aria-live="polite">{{ stepLabel }}</p>
      <div
        class="boot-line"
        role="progressbar"
        aria-label="Chargement"
        :aria-valuenow="Math.round(pct)"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span class="boot-line-fill" :style="{ width: `${pct}%` }" />
      </div>
      <p class="boot-tip"><span>{{ tip }}</span></p>
    </div>

    <!-- Écran titre -->
    <div v-else class="title-screen">
      <!-- Mire géante en fond : quatre coins de visée autour des initiales,
           dessinés trait par trait — le même cadre que la fiche profil. -->
      <svg class="title-emblem" viewBox="0 0 200 200" aria-hidden="true">
        <path class="emblem-ring" d="M16 64V16h48M136 16h48v48M184 136v48h-48M64 184H16v-48" />
        <path class="emblem-l" d="M64 60v80h36" />
        <path class="emblem-d" d="M112 60v80h12c20 0 28-18 28-40s-8-40-28-40z" />
      </svg>

      <p class="title-logo glitch" :data-text="eyebrow">{{ eyebrow }}</p>
      <p class="title-press">Appuyez sur une touche</p>
      <p class="title-legal">Connexion établie · Bonne visite</p>
    </div>
  </div>
</template>

<style scoped>
.boot {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: #000;
  will-change: opacity;
}
/* Sortie : le moniteur s'éteint. L'image s'écrase en une ligne blanche
   horizontale, puis disparaît — par crans, comme un vieux tube. */
.boot.is-leaving {
  animation: bootOff 0.36s steps(6, end) forwards;
}
@keyframes bootOff {
  0% {
    transform: scale(1, 1);
    filter: brightness(1);
  }
  45% {
    transform: scale(1, 0.012);
    filter: brightness(3);
  }
  75% {
    transform: scale(0.3, 0.012);
    filter: brightness(3);
    opacity: 1;
  }
  100% {
    transform: scale(0, 0.012);
    opacity: 0;
  }
}

.boot-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(90vw, 44rem);
}

/* ---- scène centrale ----------------------------------------- */
.boot-stage {
  display: grid;
  place-items: center;
  width: min(16rem, 40vw);
  height: min(16rem, 40vw);
  margin-bottom: 2.4rem;
}
.boot-shapes {
  width: 100%;
  height: 100%;
  overflow: visible;
}
/* Trois polygones en traits d'un pixel qui tournent l'un dans l'autre :
   un losange et deux triangles opposés, comme une géométrie qui se replie. */
.shape {
  fill: none;
  stroke: var(--foreground);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  transform-origin: 60px 60px;
}
.shape-a {
  animation: shapeA 1.4s steps(14, end) infinite;
}
.shape-b {
  animation: shapeB 1.4s steps(14, end) infinite;
}
.shape-c {
  animation: shapeC 1.4s steps(14, end) infinite;
}
@keyframes shapeA {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(45deg) scale(0.72);
  }
  100% {
    transform: rotate(90deg) scale(1);
  }
}
@keyframes shapeB {
  0% {
    transform: rotate(0deg) scale(0.9);
  }
  50% {
    transform: rotate(-60deg) scale(1.05);
  }
  100% {
    transform: rotate(-120deg) scale(0.9);
  }
}
@keyframes shapeC {
  0% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  50% {
    transform: scale(1) rotate(30deg);
    opacity: 1;
  }
  100% {
    transform: scale(0.6) rotate(60deg);
    opacity: 0.4;
  }
}

/* Blocs : barres blanches de longueurs différentes autour du nom, qui
   s'étirent par crans comme des lignes de texte qu'on surligne. */
.boot-blocks {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
}
.blk {
  display: block;
  height: 22px;
  background: var(--foreground);
  transform-origin: left;
  animation: blkGrow 0.24s steps(4, end) both;
}
.blk-1 {
  width: 2.6rem;
}
.blk-2 {
  width: 8rem;
  animation-delay: 0.06s;
}
.blk-3 {
  width: 12rem;
  animation-delay: 0.14s;
}
.blk-text {
  font-family: var(--font-silkscreen);
  font-size: clamp(18px, 3vw, 26px);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--foreground);
  animation: blkGrow 0.24s steps(4, end) 0.1s both;
}
@keyframes blkGrow {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

/* ---- étape, ligne de progression, astuce -------------------- */
.boot-step-label {
  margin: 0 0 1rem;
  font-family: var(--font-geist-mono);
  font-size: 15px;
  color: var(--foreground);
}
.boot-line {
  position: relative;
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.18);
}
.boot-line-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--foreground);
}
/* Astuce surlignée ligne par ligne : chaque ligne a son propre fond blanc
   (`box-decoration-break`), comme du texte sélectionné. */
.boot-tip {
  margin: 1.6rem 0 0;
  max-width: 36rem;
  text-align: center;
  font-size: 16px;
  line-height: 1.75;
}
.boot-tip span {
  background: var(--foreground);
  color: #000;
  padding: 2px 6px;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

/* ---- écran titre ------------------------------------------- */
.title-screen {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.title-emblem {
  position: absolute;
  width: min(86vh, 86vw);
  height: min(86vh, 86vw);
  opacity: 0.14;
  fill: none;
  stroke: var(--foreground);
  stroke-width: 9;
  stroke-linecap: square;
  stroke-linejoin: miter;
}
/* Chaque trait se dessine par crans. `pathLength` n'est
   pas utilisé pour rester compatible : les longueurs sont surestimées, le
   surplus de tiret est simplement invisible. */
.emblem-ring,
.emblem-l,
.emblem-d {
  stroke-dasharray: 600;
  stroke-dashoffset: 600;
  animation: emblemDraw 0.7s steps(10, end) forwards;
}
.emblem-l {
  animation-delay: 0.25s;
}
.emblem-d {
  animation-delay: 0.4s;
}
@keyframes emblemDraw {
  to {
    stroke-dashoffset: 0;
  }
}

.title-logo {
  position: relative;
  margin: 0;
  font-family: var(--font-silkscreen);
  font-size: clamp(2rem, 7vw, 4.5rem);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--foreground);
}
/* Le logo de l'écran titre ne tient jamais en place : il se découpe en
   continu, comme celui du jeu. */
.title-logo::before {
  animation: glitchA 1.1s steps(1, end) infinite;
}
.title-logo::after {
  animation: glitchB 1.3s steps(1, end) infinite;
}
.title-press {
  position: absolute;
  top: calc(50% + clamp(2.4rem, 6vw, 4rem));
  margin: 0;
  font-family: var(--font-geist-mono);
  font-size: 12px;
  color: var(--muted);
  animation: bootBlink 1.1s steps(1, end) infinite;
}
.title-legal {
  position: absolute;
  bottom: 2rem;
  max-width: 32rem;
  margin: 0;
  padding: 0 1.25rem;
  text-align: center;
  font-family: var(--font-geist-mono);
  font-size: 10px;
  line-height: 1.6;
  text-transform: uppercase;
  color: var(--muted-2);
}

@keyframes bootBlink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .boot.is-leaving {
    animation: none;
    opacity: 0;
  }
  .shape,
  .blk,
  .blk-text {
    animation: none;
  }
  .title-press {
    animation: none;
  }
}
</style>
