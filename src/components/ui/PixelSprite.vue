<script setup lang="ts">
/* Petits sprites 8-bit dessinés sur une grille, en SVG plutôt qu'en police
   d'icônes : chaque « pixel » est un carré aligné sur la grille, donc net à
   n'importe quelle taille, et la couleur suit celle du texte (currentColor).

   Chaque sprite est décrit par une grille de chaînes : « # » = pixel plein,
   tout le reste = vide. C'est bien plus lisible qu'une liste de coordonnées
   quand il faut retoucher un dessin. */
const props = withDefaults(
  defineProps<{
    name?: "invader" | "heart" | "arrow-down" | "star" | "coin" | "creeper";
    /* Taille du rendu, en px. */
    size?: number;
  }>(),
  { name: "invader", size: 16 },
);

const SPRITES: Record<string, string[]> = {
  invader: [
    "..#.....#..",
    "...#...#...",
    "..#######..",
    ".##.###.##.",
    "###########",
    "#.#######.#",
    "#.#.....#.#",
    "...##.##...",
  ],
  heart: [
    ".##.##.",
    "#######",
    "#######",
    ".#####.",
    "..###..",
    "...#...",
  ],
  "arrow-down": [
    "..###..",
    "..###..",
    "..###..",
    "#######",
    ".#####.",
    "..###..",
    "...#...",
  ],
  star: [
    "...#...",
    "...#...",
    "#######",
    ".#####.",
    "..###..",
    ".##.##.",
    "#.....#",
  ],
  coin: [
    "..###..",
    ".#####.",
    "##.#.##",
    "##.#.##",
    "##.#.##",
    ".#####.",
    "..###..",
  ],
  /* Visage de creeper, calqué sur la texture 8x8 d'origine : yeux carrés de
     2x2, bouche qui démarre étroite entre les yeux, s'élargit à 4, puis se
     referme sur deux crocs. Les lignes vides en haut et en bas font partie
     de la texture — les retirer déformerait les proportions du visage. */
  creeper: [
    "........",
    ".##..##.",
    ".##..##.",
    "...##...",
    "..####..",
    "..####..",
    "..#..#..",
    "........",
  ],
};

const grid = SPRITES[props.name] ?? SPRITES.invader;
const cols = Math.max(...grid.map((r) => r.length));
const rows = grid.length;

/* Un <rect> par pixel plein. Les sprites font au plus 11x8, donc une
   centaine de rects au pire — négligeable, et ça évite un <path> illisible. */
const cells: { x: number; y: number }[] = [];
grid.forEach((row, y) => {
  for (let x = 0; x < row.length; x++) {
    if (row[x] === "#") cells.push({ x, y });
  }
});
</script>

<template>
  <svg
    :width="size"
    :height="Math.round((size * rows) / cols)"
    :viewBox="`0 0 ${cols} ${rows}`"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    shape-rendering="crispEdges"
    class="inline-block align-middle"
  >
    <rect v-for="(c, i) in cells" :key="i" :x="c.x" :y="c.y" width="1" height="1" />
  </svg>
</template>
