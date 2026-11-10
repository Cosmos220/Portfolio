<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { projects, skillDescriptions, stack } from "../data/content";
import { TECH_ICONS } from "../data/techIcons";
import { asset } from "../data/assets";
import TechIcon from "./ui/TechIcon.vue";

/* Arbre de compétences, sur le modèle des menus de compétences des jeux
   d'action : une roue complète découpée en catégories, dont seule la moitié
   haute est visible. Chaque catégorie occupe un secteur et porte ses
   branches (pivots reliés à l'anneau, puis feuilles). Changer de catégorie
   fait TOURNER la roue : l'arbre courant part vers la gauche, le suivant
   arrive par la droite, encore éteint, puis ses nœuds s'allument un à un.
   Le panneau du dessous détaille le nœud survolé.

   Tout le contenu vient de `stack`, `skillDescriptions` et `projects`.
   La géométrie est calculée dans le repère du SVG (1000 × 540), roue
   centrée sur le bord bas. */

const N = stack.length;
const SECTOR = 360 / N;
const CX = 500;
const CY = 540;
const RING_R = 140;
const NODE_R = 28;

/* ---- rotation ------------------------------------------------
   `turn` compte les crans sans jamais revenir à zéro : passer de la
   dernière catégorie à la première continue de tourner dans le même sens
   au lieu de faire un tour complet à l'envers. */
const turn = ref(0);
const cat = computed(() => ((turn.value % N) + N) % N);
const settled = ref(true);
const selected = ref(0);
let settleTimer: number | undefined;

function go(delta: number) {
  turn.value += delta;
  selected.value = 0;
  settled.value = false;
  window.clearTimeout(settleTimer);
  // Les nœuds ne s'allument qu'une fois la roue arrêtée.
  settleTimer = window.setTimeout(() => (settled.value = true), 650);
}
onBeforeUnmount(() => window.clearTimeout(settleTimer));

const category = computed(() => stack[cat.value]!);
const prevCat = computed(() => stack[(cat.value - 1 + N) % N]!);
const nextCat = computed(() => stack[(cat.value + 1) % N]!);
const total = stack.reduce((n, col) => n + col.items.length, 0);

/* Rotation CSS : négative = sens inverse des aiguilles d'une montre, donc
   le secteur de droite monte vers le haut. */
const wheelStyle = computed(() => ({ transform: `rotate(${-turn.value * SECTOR}deg)` }));
const uprightStyle = computed(() => `rotate(${turn.value * SECTOR}deg)`);

/* ---- géométrie (repère de la roue, avant rotation) ----------- */
const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
};
/* Angle du centre du secteur k : 0 en haut, puis dans le sens horaire. */
const baseAngle = (k: number) => 90 - k * SECTOR;

function arc(r: number, from: number, to: number) {
  const a = polar(r, from);
  const b = polar(r, to);
  const large = Math.abs(from - to) > 180 ? 1 : 0;
  return `M${a.x} ${a.y} A${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

const segments = stack.map((_, k) => {
  const mid = baseAngle(k);
  return { k, d: arc(RING_R, mid + SECTOR / 2 - 1.5, mid - SECTOR / 2 + 1.5) };
});

type Node = {
  name: string;
  k: number; // catégorie
  i: number; // rang dans la catégorie
  x: number;
  y: number;
  hub: boolean;
};
type Link = { k: number; d: string };

/* Chaque catégorie se déploie en 1 à 3 pivots posés près de l'anneau ;
   les compétences restantes deviennent leurs feuilles, plus loin, et une
   troisième feuille se chaîne derrière la première, comme les branches
   qui s'allongent dans le jeu. */
const layout = (() => {
  const nodes: Node[] = [];
  const links: Link[] = [];
  stack.forEach((col, k) => {
    const items = col.items;
    const n = items.length;
    const hubs = n <= 2 ? n : n <= 4 ? 2 : 3;
    const mid = baseAngle(k);
    const spread = Math.min(SECTOR * 0.62, 56);
    const hubAngles = Array.from({ length: hubs }, (_, h) =>
      hubs === 1 ? mid : mid + spread / 2 - (h * spread) / (hubs - 1),
    );
    const placed: { x: number; y: number }[] = [];

    items.forEach((name, i) => {
      if (i < hubs) {
        const deg = hubAngles[i]!;
        const p = polar(220, deg);
        const from = polar(RING_R + 12, deg);
        const to = polar(220 - NODE_R - 2, deg);
        links.push({ k, d: `M${from.x} ${from.y} L${to.x} ${to.y}` });
        nodes.push({ name, k, i, x: p.x, y: p.y, hub: true });
        placed.push(p);
        return;
      }
      const j = i - hubs; // rang parmi les feuilles
      const h = j % hubs; // pivot de rattachement
      const tier = Math.floor(j / hubs); // 0 = première feuille, 1 = chaînée
      const side = h === 0 && hubs > 1 ? 1 : h === hubs - 1 && hubs > 1 ? -1 : 1;
      const deg = hubAngles[h]! + side * (tier === 0 ? 9 : 4);
      const p = polar(tier === 0 ? 312 : 400, deg);
      const parent = tier === 0 ? placed[h]! : placed[hubs + h]!;
      links.push({ k, d: `M${parent.x} ${parent.y} L${p.x} ${p.y}` });
      nodes.push({ name, k, i, x: p.x, y: p.y, hub: false });
      placed.push(p);
    });
  });
  return { nodes, links };
})();

/* Le trait d'un lien démarre et finit au bord des pastilles : on le dessine
   sous les nœuds, qui recouvrent ses extrémités. */

const isLit = (k: number) => k === cat.value && settled.value;

/* ---- détail ------------------------------------------------- */
const skill = computed(() => category.value.items[selected.value] ?? "");
const usedIn = computed(() => projects.filter((p) => p.tags.includes(skill.value)));
const thumb = computed(() => asset(usedIn.value.find((p) => asset(p.image))?.image));

function pick(n: Node) {
  if (n.k === cat.value) selected.value = n.i;
}
</script>

<template>
  <div class="tree" @keydown.left.prevent="go(-1)" @keydown.right.prevent="go(1)">
    <!-- Onglets : catégorie précédente / courante / suivante -->
    <div class="tree-tabs">
      <button type="button" class="tree-tab" :aria-label="`Catégorie précédente : ${prevCat.title}`" @click="go(-1)">
        <span class="tree-key" aria-hidden="true">←</span>
        <span class="hidden sm:inline">{{ prevCat.title }}</span>
      </button>
      <div class="text-center">
        <div class="tree-dots" aria-hidden="true">
          <span v-for="(c, i) in stack" :key="c.title" :class="{ 'is-on': i === cat }" />
        </div>
        <h3 class="tree-title" aria-live="polite">{{ category.title }}</h3>
      </div>
      <button type="button" class="tree-tab justify-end" :aria-label="`Catégorie suivante : ${nextCat.title}`" @click="go(1)">
        <span class="hidden sm:inline">{{ nextCat.title }}</span>
        <span class="tree-key" aria-hidden="true">→</span>
      </button>
    </div>

    <!-- Scène : la roue (écrans moyens et plus) -->
    <div class="tree-stage">
      <div class="tree-map" aria-hidden="true" />
      <svg class="tree-svg" viewBox="0 0 1000 540" role="group" :aria-label="`Compétences : ${category.title}`">
        <defs>
          <radialGradient id="tree-glow" :cx="CX" :cy="CY" r="470" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fff" stop-opacity="0.16" />
            <stop offset="1" stop-color="#fff" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Faisceau fixe vers le haut : il éclaire le secteur actif -->
        <path
          class="tree-beam"
          :d="`M${CX} ${CY} L${polar(500, 90 + SECTOR / 2).x} ${polar(500, 90 + SECTOR / 2).y} A500 500 0 0 1 ${polar(500, 90 - SECTOR / 2).x} ${polar(500, 90 - SECTOR / 2).y} Z`"
          fill="url(#tree-glow)"
        />

        <!-- Roue : anneau, branches et nœuds tournent ensemble -->
        <g class="tree-wheel" :style="wheelStyle">
          <path
            v-for="s in segments"
            :key="s.k"
            :d="s.d"
            class="tree-ring"
            :class="{ 'is-on': s.k === cat }"
          />
          <path
            v-for="(l, li) in layout.links"
            :key="li"
            :d="l.d"
            class="tree-link"
            :class="{ 'is-on': isLit(l.k) }"
          />
          <g
            v-for="n in layout.nodes"
            :key="n.name"
            class="tree-node"
            :class="{
              'is-lit': isLit(n.k),
              'is-hub': n.hub,
              'is-sel': n.k === cat && n.i === selected,
              'is-current': n.k === cat,
            }"
            :style="{ transitionDelay: isLit(n.k) ? `${n.i * 55}ms` : '0ms' }"
            :role="n.k === cat ? 'button' : undefined"
            :tabindex="n.k === cat ? 0 : -1"
            :aria-label="n.k === cat ? n.name : undefined"
            :aria-hidden="n.k === cat ? undefined : 'true'"
            @click="pick(n)"
            @mouseenter="pick(n)"
            @focus="pick(n)"
            @keydown.enter.prevent="pick(n)"
          >
            <!-- Contre-rotation : l'icône reste droite pendant que la roue tourne -->
            <g class="tree-upright" :style="{ transform: uprightStyle, transformOrigin: `${n.x}px ${n.y}px` }">
              <circle class="tree-halo" :cx="n.x" :cy="n.y" :r="NODE_R + 10" />
              <circle class="tree-dot" :cx="n.x" :cy="n.y" :r="n.hub ? NODE_R + 2 : NODE_R" />
              <g :transform="`translate(${n.x - 13} ${n.y - 13}) scale(${26 / 24})`">
                <path class="tree-icon" :d="TECH_ICONS[n.name] ?? ''" />
              </g>
            </g>
          </g>
        </g>

        <!-- Disque central, fixe, avec le nom de la catégorie -->
        <circle :cx="CX" :cy="CY" :r="RING_R - 12" class="tree-hub-disc" />
        <text :x="CX" :y="CY - 58" class="tree-hub-label">{{ category.title }}</text>
      </svg>
    </div>

    <!-- Liste compacte sur téléphone : la roue serait illisible -->
    <ul class="tree-list">
      <li v-for="(name, k) in category.items" :key="name">
        <button
          type="button"
          class="tree-chip"
          :class="{ 'is-on': k === selected }"
          :aria-pressed="k === selected"
          @click="selected = k"
        >
          <TechIcon :name="name" :size="14" />
          {{ name }}
        </button>
      </li>
    </ul>

    <!-- Détail de la compétence : vignette à gauche, texte à droite -->
    <div :key="skill" class="tree-detail">
      <div class="tree-thumb">
        <img v-if="thumb" :src="thumb" :alt="''" class="project-visual" />
        <TechIcon v-else :name="skill" :size="56" />
      </div>
      <div>
        <p class="tree-detail-name">{{ skill }}</p>
        <p class="tree-detail-row">
          <span>Projets</span>
          <span class="tree-detail-count">{{ usedIn.length }}</span>
        </p>
        <p class="tree-detail-desc">{{ skillDescriptions[skill] }}</p>
        <p v-if="usedIn.length" class="tree-detail-used">
          Utilisée dans :
          <template v-for="(p, i) in usedIn" :key="p.slug">
            <RouterLink :to="`/projets/${p.slug}`" class="tree-link-text">{{ p.title }}</RouterLink
            ><span v-if="i < usedIn.length - 1">, </span>
          </template>
        </p>
      </div>
    </div>

    <!-- Pied : aides de touches + compteur de compétences -->
    <div class="tree-foot">
      <p class="tree-hints" aria-hidden="true">
        <span><span class="tree-key tree-key--wide">Clic</span> Sélectionner</span>
        <span><span class="tree-key">←</span><span class="tree-key">→</span> Catégorie</span>
      </p>
      <p class="skill-count">
        Compétences débloquées
        <span class="skill-count-num">{{ total }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.tree {
  position: relative;
}

/* ---- onglets ------------------------------------------------ */
.tree-tabs {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 1rem;
}
.tree-tab {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 44px;
  background: none;
  border: 0;
  padding: 0;
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  transition: color 0.12s steps(2, end);
}
.tree-tab:hover {
  color: var(--foreground);
}
.tree-dots {
  display: flex;
  justify-content: center;
  gap: 7px;
  margin-bottom: 0.55rem;
}
.tree-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--muted-2);
}
.tree-dots span.is-on {
  background: var(--foreground);
}
.tree-title {
  margin: 0;
  font-size: clamp(1.25rem, 2.5vw, 1.7rem);
  font-weight: 600;
}

/* Touche de clavier encadrée, comme les aides de touches des jeux. */
.tree-key {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  border: 1px solid currentColor;
  font-family: var(--font-geist-mono);
  font-size: 11px;
}
.tree-key--wide {
  padding: 0 5px;
}

/* ---- scène -------------------------------------------------- */
.tree-stage {
  position: relative;
  display: none;
  margin: 0.5rem auto 0;
}
@media (min-width: 640px) {
  .tree-stage {
    display: block;
  }
}
/* Fond de « plan » quadrillé, très discret, qui s'estompe vers les bords. */
.tree-map {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: 26px 26px;
  -webkit-mask-image: radial-gradient(ellipse at 50% 100%, #000 15%, transparent 70%);
  mask-image: radial-gradient(ellipse at 50% 100%, #000 15%, transparent 70%);
}
.tree-svg {
  position: relative;
  display: block;
  width: 100%;
  height: auto;
}

/* La roue tourne en douceur (pas par crans) : c'est un mouvement
   mécanique continu dans le jeu. */
.tree-wheel,
.tree-upright {
  transform-box: view-box;
  transition: transform 0.65s cubic-bezier(0.65, 0, 0.25, 1);
}
.tree-wheel {
  transform-origin: 500px 540px;
}

.tree-ring {
  fill: none;
  stroke: #2e2e33;
  stroke-width: 24;
  transition: stroke 0.2s steps(3, end);
}
.tree-ring.is-on {
  stroke: var(--foreground);
}
.tree-link {
  fill: none;
  stroke: rgba(255, 255, 255, 0.14);
  stroke-width: 2;
  transition: stroke 0.2s steps(3, end);
}
.tree-link.is-on {
  stroke: rgba(255, 255, 255, 0.55);
}

/* Nœud éteint : pastille sombre, icône grise. Les nœuds des autres
   catégories restent dans cet état ; ceux de la catégorie active
   s'allument un par un quand la roue s'arrête. */
.tree-dot {
  fill: #1c1c20;
  stroke: #3a3a40;
  stroke-width: 2;
  transition:
    fill 0.18s steps(3, end),
    stroke 0.18s steps(3, end);
  transition-delay: inherit;
}
.tree-icon {
  fill: #5c5c64;
  transition: fill 0.18s steps(3, end);
  transition-delay: inherit;
}
.tree-halo {
  fill: rgba(255, 255, 255, 0.16);
  opacity: 0;
  transition: opacity 0.15s steps(2, end);
}
/* Allumé : pastille blanche, icône noire. */
.tree-node.is-lit .tree-dot {
  fill: var(--foreground);
  stroke: var(--foreground);
}
.tree-node.is-lit .tree-icon {
  fill: #000;
}
/* Pivot allumé : anneau blanc épais, intérieur sombre, icône blanche —
   il se distingue des feuilles comme les pivots colorés du jeu. */
.tree-node.is-lit.is-hub .tree-dot {
  fill: #0b0b0d;
  stroke-width: 4;
}
.tree-node.is-lit.is-hub .tree-icon {
  fill: var(--foreground);
}
/* Sélection : halo autour du nœud survolé. */
.tree-node.is-sel .tree-halo {
  opacity: 1;
}
.tree-node.is-current {
  cursor: pointer;
}
.tree-node:focus {
  outline: none;
}
.tree-node:focus-visible .tree-halo {
  opacity: 1;
  stroke: var(--foreground);
  stroke-width: 2;
}

.tree-hub-disc {
  fill: #000;
}
.tree-hub-label {
  fill: var(--foreground);
  font-family: var(--font-silkscreen);
  font-size: 22px;
  text-anchor: middle;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ---- liste mobile ------------------------------------------- */
.tree-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1.5rem 0 0;
  padding: 0;
  list-style: none;
}
@media (min-width: 640px) {
  .tree-list {
    display: none;
  }
}
.tree-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 40px;
  padding: 0 0.75rem;
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--foreground);
  font-size: 14px;
  cursor: pointer;
}
.tree-chip.is-on {
  background: var(--foreground);
  border-color: var(--foreground);
  color: #000;
}

/* ---- détail ------------------------------------------------- */
.tree-detail {
  display: grid;
  gap: 1.25rem;
  max-width: 46rem;
  margin: 1.25rem auto 0;
  animation: detailIn 0.2s steps(3, end);
}
@media (min-width: 640px) {
  .tree-detail {
    grid-template-columns: 15rem 1fr;
  }
}
@keyframes detailIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.tree-thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
}
.tree-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.tree-detail-name {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}
.tree-detail-row {
  display: flex;
  gap: 2.5rem;
  margin: 0.4rem 0 0;
  font-family: var(--font-geist-mono);
  font-size: 12px;
  text-transform: uppercase;
  color: var(--foreground);
}
.tree-detail-count {
  font-weight: 500;
}
.tree-detail-desc {
  margin: 0.55rem 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
}
.tree-detail-used {
  margin: 0.45rem 0 0;
  font-size: 14px;
  color: var(--muted);
}
.tree-link-text {
  color: var(--foreground);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.tree-link-text:hover {
  color: var(--accent-bright);
}

/* ---- pied --------------------------------------------------- */
.tree-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2rem;
  border-top: 1px solid var(--border);
  padding-top: 1.25rem;
}
.tree-hints {
  display: flex;
  gap: 1.25rem;
  margin: 0;
  font-family: var(--font-geist-mono);
  font-size: 11px;
  text-transform: uppercase;
  color: var(--muted);
}
.tree-hints > span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
/* Encadré blanc, chiffre en évidence : le compteur de points de
   compétence des menus de jeu. */
.skill-count {
  display: inline-flex;
  align-items: center;
  gap: 0.9rem;
  margin: 0;
  padding: 0.45rem 0.6rem 0.45rem 0.9rem;
  background: var(--foreground);
  color: #000;
  font-family: var(--font-silkscreen);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.skill-count-num {
  font-size: 18px;
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .tree-wheel,
  .tree-upright {
    transition: none;
  }
  .tree-detail {
    animation: none;
  }
}
</style>
