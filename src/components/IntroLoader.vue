<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

/* Séquence de démarrage : des vérifications système qui s'enchaînent, une
   jauge segmentée, puis l'écran se lève.

   Le principe : un loader doit justifier le temps qu'il fait attendre. On
   affiche donc une progression réelle (les étapes se cochent une par une)
   plutôt qu'une animation décorative. C'est aussi ce qui remplace le faux
   terminal qui décorait l'accueil — même vocabulaire, mais ici il a une
   raison d'être. */
const props = withDefaults(
  defineProps<{ steps?: string[]; eyebrow?: string }>(),
  {
    steps: () => ["Interface", "Projets", "Contenus"],
    eyebrow: "Loïck Davi",
  },
);
const emit = defineEmits<{ done: [] }>();

/* Une jauge de jeu se lit en blocs, pas en continu. */
const SEGMENTS = 20;

const doneCount = ref(0);
const pct = ref(0);
const leaving = ref(false);

const filled = computed(() => Math.round((pct.value / 100) * SEGMENTS));
const pctLabel = computed(() => String(Math.round(pct.value)).padStart(3, "0"));

const timers: number[] = [];
let progressIv: number | undefined;

function finish() {
  leaving.value = true;
  timers.push(window.setTimeout(() => emit("done"), 300));
}

onMounted(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce) {
    doneCount.value = props.steps.length;
    pct.value = 100;
    timers.push(window.setTimeout(finish, 220));
    return;
  }

  const step = 170;
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

  timers.push(window.setTimeout(finish, total));
});

onBeforeUnmount(() => {
  window.clearInterval(progressIv);
  timers.forEach((t) => window.clearTimeout(t));
});
</script>

<template>
  <div :class="['boot', { 'is-leaving': leaving }]">
    <div class="boot-inner">
      <p class="boot-title">{{ eyebrow }}</p>

      <!-- Étapes : la ligne entière s'allume quand elle est validée. -->
      <ul class="boot-steps">
        <li
          v-for="(s, i) in steps"
          :key="s"
          class="boot-step"
          :class="{ 'is-done': i < doneCount }"
        >
          <span class="boot-step-name">{{ s }}</span>
          <span class="boot-step-dots" aria-hidden="true" />
          <span class="boot-step-state">{{ i < doneCount ? "OK" : "··" }}</span>
        </li>
      </ul>

      <div
        class="boot-bar"
        role="progressbar"
        aria-label="Chargement"
        :aria-valuenow="Math.round(pct)"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span
          v-for="n in SEGMENTS"
          :key="n"
          class="boot-seg"
          :class="{ 'is-on': n <= filled }"
        />
      </div>

      <p class="boot-pct">{{ pctLabel }}%</p>
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
/* Disparition en fondu : une translation crantée donnerait l'impression que
   l'écran saccade, un fondu reste net quelle que soit la durée. */
.boot.is-leaving {
  opacity: 0;
  transition: opacity 0.3s steps(4, end);
}

.boot-inner {
  width: min(88vw, 30rem);
  font-family: var(--font-silkscreen);
}

.boot-title {
  margin: 0 0 1.4rem;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.boot-steps {
  margin: 0 0 1.6rem;
  padding: 0;
  list-style: none;
}
.boot-step {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.28rem 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted-2);
  transition: color 0.1s steps(2, end);
}
.boot-step.is-done {
  color: var(--foreground);
}
/* Ligne de points qui relie l'intitulé à son état, comme un sommaire. */
.boot-step-dots {
  flex: 1;
  border-bottom: 2px dotted currentColor;
  opacity: 0.35;
  transform: translateY(-3px);
}
.boot-step-state {
  min-width: 2.2em;
  text-align: right;
}

.boot-bar {
  display: flex;
  gap: 3px;
  padding: 4px;
  border: 2px solid var(--border-strong);
}
.boot-seg {
  flex: 1 1 0;
  height: 16px;
  background: rgba(255, 255, 255, 0.07);
}
.boot-seg.is-on {
  background: var(--foreground);
}

.boot-pct {
  margin: 0.7rem 0 0;
  text-align: right;
  font-size: 12px;
  color: var(--foreground);
}

@media (prefers-reduced-motion: reduce) {
  .boot.is-leaving {
    transition-duration: 1ms;
  }
  .boot-step {
    transition: none;
  }
}
</style>
