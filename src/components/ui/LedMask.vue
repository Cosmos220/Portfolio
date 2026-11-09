<script setup lang="ts">
/* Écran à LED qui change d'expression : une matrice 8×8 dont les « diodes »
   s'allument pour dessiner un visage, qui bascule de temps en temps.

   Une image parasite s'intercale entre deux expressions — quelques diodes
   allumées au hasard pendant un instant, comme un affichage qui décroche —
   c'est elle qui rend le changement crédible plutôt qu'un simple fondu.

   Au survol, il prend l'expression de la surprise. En « mouvement réduit »
   il reste figé sur un sourire. */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

withDefaults(defineProps<{ size?: number }>(), { size: 24 });

const FACES: Record<string, string[]> = {
  smile: [
    "........",
    ".##..##.",
    ".##..##.",
    "........",
    "#......#",
    ".#....#.",
    "..####..",
    "........",
  ],
  wink: [
    "........",
    ".##.###.",
    ".##.....",
    "........",
    "#......#",
    ".#....#.",
    "..####..",
    "........",
  ],
  dead: [
    "........",
    "#.#..#.#",
    ".#....#.",
    "#.#..#.#",
    "........",
    ".######.",
    "........",
    "........",
  ],
  angry: [
    "........",
    "#......#",
    ".#....#.",
    "#......#",
    "........",
    ".######.",
    "........",
    "........",
  ],
  surprised: [
    "........",
    ".##..##.",
    ".##..##.",
    "........",
    "..####..",
    "..#..#..",
    "..####..",
    "........",
  ],
};
const ORDER = ["smile", "wink", "dead", "angry", "surprised"] as const;

const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const current = ref<string[]>(FACES.smile!);
let name = "smile";
let timer: number | undefined;
let glitchTimer: number | undefined;
let hovered = false;

/* Image parasite : environ un tiers des diodes allumées, au hasard. */
function noise(): string[] {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => (Math.random() < 0.34 ? "#" : ".")).join(""),
  );
}

function show(next: string) {
  name = next;
  /* Passage par l'image parasite : elle dure un instant, puis la vraie
     expression s'affiche. */
  current.value = noise();
  window.clearTimeout(glitchTimer);
  glitchTimer = window.setTimeout(() => {
    current.value = FACES[next]!;
  }, 110);
}

function schedule() {
  timer = window.setTimeout(
    () => {
      if (!hovered) {
        const choices = ORDER.filter((n) => n !== name && n !== "surprised");
        show(choices[Math.floor(Math.random() * choices.length)]!);
      }
      schedule();
    },
    2600 + Math.random() * 2600,
  );
}

function onEnter() {
  hovered = true;
  if (!reduce) show("surprised");
}
function onLeave() {
  hovered = false;
  if (!reduce) show("smile");
}

/* Cases à dessiner : toutes les diodes, allumées ou non. Les éteintes
   restent visibles à faible opacité, comme sur un vrai écran à LED. */
const cells = computed(() => {
  const out: { x: number; y: number; on: boolean }[] = [];
  current.value.forEach((row, y) => {
    for (let x = 0; x < 8; x++) out.push({ x, y, on: row[x] === "#" });
  });
  return out;
});

onMounted(() => {
  if (!reduce) schedule();
});
onBeforeUnmount(() => {
  window.clearTimeout(timer);
  window.clearTimeout(glitchTimer);
});
</script>

<template>
  <svg
    class="led"
    :width="size"
    :height="size"
    viewBox="0 0 8 8"
    aria-hidden="true"
    focusable="false"
    shape-rendering="crispEdges"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <rect
      v-for="c in cells"
      :key="`${c.x}-${c.y}`"
      :x="c.x + 0.1"
      :y="c.y + 0.1"
      width="0.8"
      height="0.8"
      fill="currentColor"
      :opacity="c.on ? 1 : 0.1"
    />
  </svg>
</template>

<style scoped>
.led {
  display: inline-block;
  flex-shrink: 0;
}
</style>
