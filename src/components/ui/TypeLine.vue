<script setup lang="ts">
/* Texte qui « se déchiffre » quand il entre dans le viewport, avec un
   curseur d'arcade : devant les lettres déjà écrites, quelques symboles
   aléatoires défilent, comme un mot de passe cassé caractère par caractère
   dans un film de hacker. Même idiome d'observation que Reveal.vue (seuil et rootMargin
   identiques) pour que la frappe se déclenche en même temps que les autres
   apparitions de la section.

   Accessibilité : le texte complet est toujours présent dans le DOM pour les
   lecteurs d'écran ; c'est la copie animée qui est masquée (`aria-hidden`).
   Sans ça, un lecteur d'écran annoncerait le texte lettre par lettre au fil
   de l'animation. */
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

const props = withDefaults(
  defineProps<{
    text: string;
    /* Durée d'affichage d'un caractère, en ms. */
    speed?: number;
    /* Attente avant le début de la frappe, en ms. */
    delay?: number;
    /* Garde le curseur après la fin de la frappe. */
    keepCaret?: boolean;
  }>(),
  { speed: 16, delay: 0, keepCaret: true },
);

const el = ref<HTMLElement | null>(null);
const shown = ref(0);
const done = ref(false);

const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const visibleText = computed(() => props.text.slice(0, shown.value));

/* Symboles « en cours de déchiffrement ». Recalculés à chaque lettre
   écrite (le calcul dépend de `shown`), donc ils changent à chaque cran. */
const GLYPHS = "01#%&*+=<>/_?$";
const scramble = computed(() => {
  if (done.value) return "";
  const n = Math.min(3, props.text.length - shown.value);
  let out = "";
  for (let i = 0; i < n; i++) {
    out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }
  return out;
});
const caretVisible = computed(() => !done.value || props.keepCaret);

let obs: IntersectionObserver | null = null;
let timer: number | undefined;
let startTimer: number | undefined;

function finish() {
  shown.value = props.text.length;
  done.value = true;
}

function start() {
  if (reduce) {
    finish();
    return;
  }
  startTimer = window.setTimeout(() => {
    timer = window.setInterval(() => {
      if (shown.value >= props.text.length) {
        window.clearInterval(timer);
        timer = undefined;
        done.value = true;
        return;
      }
      shown.value++;
    }, Math.max(10, props.speed));
  }, props.delay);
}

onMounted(() => {
  if (!el.value) return;
  if (reduce) {
    finish();
    return;
  }
  obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          obs?.unobserve(e.target);
          start();
          return;
        }
        /* Élément déjà dépassé (saut direct en bas de page, arrivée sur une
           ancre…) : il n'entrera jamais en intersection, donc la frappe ne
           se déclencherait pas et le texte resterait vide pour toujours.
           On l'affiche complet, sans animation — elle serait invisible. */
        if (e.boundingClientRect.bottom < 0) {
          obs?.unobserve(e.target);
          finish();
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
  );
  obs.observe(el.value);
});

onBeforeUnmount(() => {
  obs?.disconnect();
  window.clearTimeout(startTimer);
  window.clearInterval(timer);
});
</script>

<template>
  <span ref="el" class="type-line">
    <!-- Version lue par les technologies d'assistance. -->
    <span class="sr-only">{{ text }}</span>

    <span aria-hidden="true">
      {{ visibleText
      }}<span v-if="scramble" class="type-scramble">{{ scramble }}</span
      ><span v-if="caretVisible" class="type-caret">_</span>
    </span>
  </span>
</template>

<style scoped>
.type-line {
  /* Réserve la hauteur de ligne pour éviter que le bloc ne « saute »
     quand le texte passe de vide à complet. */
  display: inline-block;
  min-height: 1em;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.type-scramble {
  opacity: 0.45;
}

/* Clignotement franc en `steps` : sensation d'écran de jeu, pas de fondu. */
.type-caret {
  animation: typeCaretBlink 1.06s steps(1, end) infinite;
}
@keyframes typeCaretBlink {
  0%,
  50% {
    opacity: 1;
  }
  50.01%,
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .type-caret {
    animation: none;
  }
}
</style>
