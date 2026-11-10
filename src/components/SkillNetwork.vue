<script setup lang="ts">
/* Réseau de compétences : chaque technologie est un nœud, rattaché au pôle de
   sa catégorie, et relié aux technos qu'elle croise dans un même projet.

   Tout vient des données : `stack` (catégories), `skillDescriptions`, et
   `projects` pour les liaisons. Deux technos sont reliées parce qu'un projet
   RÉEL les utilise ensemble (Vue.js et API REST dans Polaris), pas pour
   remplir le dessin.

   Structure : un SVG ne porte que les LIGNES ; les nœuds sont de vrais
   <button> HTML posés dessus. Ça donne gratuitement le focus clavier, les
   lecteurs d'écran et le style, que des éléments SVG n'offrent pas sans
   travail. Sous 760 px de large le dessin n'a plus la place de respirer : on
   passe à une liste groupée, avec le même panneau de détail. */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { projects, skillDescriptions, skillNetworkCategories as stack } from "../data/content";
import TechIcon from "./ui/TechIcon.vue";
import { TECH_ICONS } from "../data/techIcons";

const W = 1000;
const H = 560;
const CX = W / 2;
const CY = H / 2;

type Node = {
  id: string;
  cat: number;
  x: number;
  y: number;
  hub?: boolean;
};

/* ---- Géométrie --------------------------------------------------
   Les pôles de catégorie sont répartis sur une ellipse ; les technos
   s'éventaillent autour de leur pôle, vers l'extérieur. */
const N = stack.length;
const hubs = stack.map((c, i) => {
  const a = (-90 + (360 / N) * i) * (Math.PI / 180);
  return { cat: i, title: c.title, a, x: CX + Math.cos(a) * 300, y: CY + Math.sin(a) * 172 };
});

const nodes = computed<Node[]>(() => {
  const out: Node[] = [];
  stack.forEach((c, i) => {
    const hub = hubs[i]!;
    out.push({ id: `hub:${c.title}`, cat: i, x: hub.x, y: hub.y, hub: true });
    const n = c.items.length;
    const spread = n > 1 ? Math.min(150, 32 * (n - 1)) : 0;
    c.items.forEach((item, k) => {
      const off = n > 1 ? (k / (n - 1) - 0.5) * spread : 0;
      const a = hub.a + (off * Math.PI) / 180;
      const r = n === 1 ? 96 : 104;
      out.push({ id: item, cat: i, x: hub.x + Math.cos(a) * r, y: hub.y + Math.sin(a) * r });
    });
  });
  return out;
});

const byId = computed(() => new Map(nodes.value.map((n) => [n.id, n])));

/* ---- Liaisons ---------------------------------------------------- */
type Edge = { a: string; b: string; kind: "spoke" | "hub" | "project" };

const edges = computed<Edge[]>(() => {
  const out: Edge[] = [];
  stack.forEach((c) => {
    out.push({ a: "core", b: `hub:${c.title}`, kind: "hub" });
    c.items.forEach((it) => out.push({ a: `hub:${c.title}`, b: it, kind: "spoke" }));
  });
  /* Technos croisées dans un même projet. Dédoublonné : deux projets qui
     partagent la même paire ne dessinent qu'un trait. */
  const seen = new Set<string>();
  for (const p of projects) {
    const ids = p.tags.filter((t) => byId.value.has(t));
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const k = [ids[i], ids[j]].sort().join("|");
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ a: ids[i]!, b: ids[j]!, kind: "project" });
      }
    }
  }
  return out;
});

function pos(id: string): { x: number; y: number } {
  if (id === "core") return { x: CX, y: CY };
  return byId.value.get(id) ?? { x: CX, y: CY };
}

/* ---- Sélection ---------------------------------------------------- */
const active = ref<string | null>(null);

const linked = computed(() => {
  const set = new Set<string>();
  if (!active.value) return set;
  for (const e of edges.value) {
    if (e.a === active.value) set.add(e.b);
    if (e.b === active.value) set.add(e.a);
  }
  return set;
});

function isHot(e: Edge) {
  return !!active.value && (e.a === active.value || e.b === active.value);
}

const detail = computed(() => {
  const id = active.value;
  if (!id || id.startsWith("hub:")) return null;
  const cat = stack.find((c) => c.items.includes(id));
  const used = projects.filter((p) => p.tags.includes(id));
  const related = [...linked.value].filter((x) => !x.startsWith("hub:") && x !== "core");
  return {
    name: id,
    cat: cat?.title ?? "",
    text: skillDescriptions[id] ?? "",
    used,
    related,
  };
});

const hubDetail = computed(() => {
  const id = active.value;
  if (!id?.startsWith("hub:")) return null;
  const c = stack.find((s) => `hub:${s.title}` === id);
  return c ? { title: c.title, items: c.items } : null;
});

/* ---- Apparition : les liaisons se tracent quand le bloc est vu ---- */
const root = ref<HTMLElement | null>(null);
const drawn = ref(false);
let obs: IntersectionObserver | null = null;
const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

onMounted(() => {
  if (reduce || !root.value) {
    drawn.value = true;
    return;
  }
  obs = new IntersectionObserver(
    ([e]) => {
      if (!e?.isIntersecting) return;
      drawn.value = true;
      obs?.disconnect();
    },
    { threshold: 0.2 },
  );
  obs.observe(root.value);
});
onBeforeUnmount(() => obs?.disconnect());

const hasIcon = (id: string) => id in TECH_ICONS;
/* Délai d'apparition d'une liaison, croissant avec la distance au centre :
   le réseau se déploie depuis le cœur. */
const delay = (e: Edge) => {
  const p = pos(e.b);
  return Math.round(Math.hypot(p.x - CX, p.y - CY) * 2.2) + (e.kind === "project" ? 500 : 0);
};
</script>

<template>
  <div ref="root" class="sn" :class="{ 'is-drawn': drawn }">
    <!-- ===== Carte (écrans larges) ===== -->
    <div class="sn-map" :style="{ aspectRatio: `${W} / ${H}` }">
      <svg
        class="sn-lines"
        :viewBox="`0 0 ${W} ${H}`"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <line
          v-for="(e, i) in edges"
          :key="i"
          :x1="pos(e.a).x"
          :y1="pos(e.a).y"
          :x2="pos(e.b).x"
          :y2="pos(e.b).y"
          pathLength="1"
          class="sn-edge"
          :class="[`is-${e.kind}`, { 'is-hot': isHot(e), 'is-dim': active && !isHot(e) }]"
          :style="{ animationDelay: `${delay(e)}ms` }"
        />
      </svg>

      <!-- Cœur du réseau -->
      <div
        class="sn-core"
        :style="{ left: `${(CX / W) * 100}%`, top: `${(CY / H) * 100}%` }"
        aria-hidden="true"
      >
        <span>LD</span>
      </div>

      <!-- Pôles de catégorie -->
      <button
        v-for="h in hubs"
        :key="h.title"
        type="button"
        class="sn-hub"
        :class="{ 'is-active': active === `hub:${h.title}`, 'is-dim': active && active !== `hub:${h.title}` && !linked.has(`hub:${h.title}`) }"
        :style="{ left: `${(h.x / W) * 100}%`, top: `${(h.y / H) * 100}%` }"
        @pointerenter="active = `hub:${h.title}`"
        @pointerleave="active = null"
        @focus="active = `hub:${h.title}`"
        @blur="active = null"
      >
        {{ h.title }}
      </button>

      <!-- Technologies -->
      <template v-for="n in nodes" :key="n.id">
        <button
          v-if="!n.hub"
          type="button"
          class="sn-node"
          :class="{
            'is-active': active === n.id,
            'is-linked': linked.has(n.id),
            'is-dim': active && active !== n.id && !linked.has(n.id),
          }"
          :style="{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%` }"
          :aria-label="n.id"
          @pointerenter="active = n.id"
          @pointerleave="active = null"
          @focus="active = n.id"
          @blur="active = null"
        >
          <TechIcon v-if="hasIcon(n.id)" :name="n.id" :size="20" />
          <span v-else class="sn-glyph">{{ n.id.slice(0, 2) }}</span>
          <span class="sn-label">{{ n.id }}</span>
        </button>
      </template>
    </div>

    <!-- ===== Liste (petits écrans) ===== -->
    <div class="sn-list">
      <section v-for="c in stack" :key="c.title" class="sn-group">
        <h3 class="sn-group-title">{{ c.title }}</h3>
        <ul>
          <li v-for="it in c.items" :key="it">
            <button
              type="button"
              class="sn-chip"
              :class="{ 'is-active': active === it }"
              @click="active = active === it ? null : it"
            >
              <TechIcon v-if="hasIcon(it)" :name="it" :size="14" />
              {{ it }}
            </button>
          </li>
        </ul>
      </section>
    </div>

    <!-- ===== Panneau de détail ===== -->
    <div class="sn-detail" role="status" aria-live="polite">
      <template v-if="detail">
        <p class="sn-detail-cat">{{ detail.cat }}</p>
        <h3 class="sn-detail-name">{{ detail.name }}</h3>
        <p class="sn-detail-text">{{ detail.text }}</p>
        <p v-if="detail.used.length" class="sn-detail-row">
          <span>Utilisé dans</span>
          <RouterLink
            v-for="p in detail.used"
            :key="p.slug"
            :to="`/projets/${p.slug}`"
            class="sn-pill"
            >{{ p.title }}</RouterLink
          >
        </p>
        <p v-if="detail.related.length" class="sn-detail-row">
          <span>Croisé avec</span>
          <span v-for="r in detail.related" :key="r" class="sn-pill is-plain">{{ r }}</span>
        </p>
      </template>
      <template v-else-if="hubDetail">
        <p class="sn-detail-cat">Catégorie</p>
        <h3 class="sn-detail-name">{{ hubDetail.title }}</h3>
        <p class="sn-detail-row">
          <span v-for="r in hubDetail.items" :key="r" class="sn-pill is-plain">{{ r }}</span>
        </p>
      </template>
      <template v-else>
        <p class="sn-detail-cat">Réseau de compétences</p>
        <p class="sn-detail-text">
          Survolez un nœud pour voir ce qu'il fait, dans quels projets il
          intervient et avec quoi il est relié.
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.sn {
  position: relative;
}

/* ---- Carte ---------------------------------------------------- */
.sn-map {
  position: relative;
  width: 100%;
  border: 1px solid var(--border);
  background:
    linear-gradient(rgba(62, 231, 255, 0.045) 1px, transparent 1px) 0 0 / 40px 40px,
    linear-gradient(90deg, rgba(62, 231, 255, 0.045) 1px, transparent 1px) 0 0 / 40px 40px,
    rgba(3, 8, 17, 0.55);
}
.sn-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.sn-edge {
  stroke: rgba(62, 231, 255, 0.28);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  /* Tracé de la liaison : elle part du cœur et se déploie. */
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
.sn-edge.is-hub {
  stroke: rgba(62, 231, 255, 0.4);
  stroke-width: 1.4;
}
.sn-edge.is-project {
  stroke: rgba(77, 130, 255, 0.4);
  stroke-dasharray: 0.02 0.02;
  stroke-dashoffset: 0;
  opacity: 0;
}
.is-drawn .sn-edge {
  animation: snDraw 0.7s steps(12, end) forwards;
}
.is-drawn .sn-edge.is-project {
  animation: snFade 0.5s steps(6, end) forwards;
}
@keyframes snDraw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes snFade {
  to {
    opacity: 1;
  }
}

/* Liaison de la sélection : trait plein, plus vif, qui défile. */
.sn-edge.is-hot {
  stroke: #3ee7ff;
  stroke-width: 2;
  stroke-dasharray: 0.04 0.03;
  stroke-dashoffset: 0;
  opacity: 1;
  animation: snFlow 0.8s linear infinite !important;
}
@keyframes snFlow {
  to {
    stroke-dashoffset: -0.07;
  }
}
/* Le reste s'efface, sans disparaître : on garde le contexte. */
.sn-edge.is-dim {
  opacity: 0.12 !important;
}

/* ---- Éléments posés sur la carte ------------------------------- */
.sn-core,
.sn-hub,
.sn-node {
  position: absolute;
  transform: translate(-50%, -50%);
}

.sn-core {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border: 2px solid var(--cyan);
  background: #02080f;
  color: var(--cyan);
  font-family: var(--font-silkscreen);
  font-size: 13px;
  /* Hexagone : le motif de l'interface du jeu. */
  clip-path: polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%);
  box-shadow: 0 0 0 0 transparent;
}

.sn-hub {
  border: 1px solid var(--border-strong);
  background: rgba(2, 8, 15, 0.9);
  color: var(--foreground);
  padding: 5px 10px;
  font-family: var(--font-silkscreen);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color 0.1s steps(2, end),
    color 0.1s steps(2, end),
    opacity 0.15s steps(3, end);
}
.sn-hub:hover,
.sn-hub:focus-visible,
.sn-hub.is-active {
  border-color: var(--cyan);
  color: var(--cyan);
}

.sn-node {
  display: grid;
  justify-items: center;
  gap: 3px;
  width: 52px;
  padding: 6px 0 4px;
  border: 1px solid var(--border-strong);
  background: rgba(2, 8, 15, 0.92);
  color: var(--muted);
  cursor: pointer;
  transition:
    border-color 0.1s steps(2, end),
    color 0.1s steps(2, end),
    opacity 0.15s steps(3, end);
}
.sn-node:hover,
.sn-node:focus-visible,
.sn-node.is-active {
  border-color: var(--cyan);
  color: var(--cyan);
  z-index: 3;
}
.sn-node.is-linked {
  border-color: rgba(62, 231, 255, 0.55);
  color: var(--foreground);
}
.sn-hub.is-dim,
.sn-node.is-dim {
  opacity: 0.3;
}
.sn-glyph {
  font-family: var(--font-silkscreen);
  font-size: 11px;
  line-height: 20px;
}
.sn-label {
  max-width: 100%;
  overflow: hidden;
  text-overflow: clip;
  white-space: nowrap;
  font-family: var(--font-silkscreen);
  font-size: 8px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

/* ---- Liste (petits écrans) -------------------------------------- */
.sn-list {
  display: none;
}
.sn-group {
  margin-bottom: 1.1rem;
}
.sn-group-title {
  margin: 0 0 0.5rem;
  font-family: var(--font-silkscreen);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cyan);
}
.sn-group ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sn-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--foreground);
  padding: 0.3rem 0.65rem;
  font-size: 13px;
  cursor: pointer;
}
.sn-chip.is-active {
  border-color: var(--cyan);
  color: var(--cyan);
}

@media (max-width: 759px) {
  .sn-map {
    display: none;
  }
  .sn-list {
    display: block;
  }
}

/* ---- Détail ------------------------------------------------------- */
.sn-detail {
  margin-top: 1rem;
  min-height: 7.5rem;
  border: 1px solid var(--border);
  border-left: 3px solid var(--cyan);
  background: rgba(2, 8, 15, 0.7);
  padding: 1rem 1.2rem;
}
.sn-detail-cat {
  margin: 0;
  font-family: var(--font-silkscreen);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-2);
}
.sn-detail-name {
  margin: 0.3rem 0 0;
  font-family: var(--font-silkscreen);
  font-size: 18px;
  letter-spacing: 0.04em;
  color: var(--foreground);
}
.sn-detail-text {
  margin: 0.5rem 0 0;
  max-width: 46rem;
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
}
.sn-detail-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin: 0.7rem 0 0;
  font-family: var(--font-silkscreen);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted-2);
}
.sn-detail-row > span:first-child {
  margin-right: 0.3rem;
}
.sn-pill {
  border: 1px solid var(--border-strong);
  padding: 2px 8px;
  color: var(--foreground);
  transition:
    border-color 0.1s steps(2, end),
    color 0.1s steps(2, end);
}
a.sn-pill:hover {
  border-color: var(--cyan);
  color: var(--cyan);
}
.sn-pill.is-plain {
  color: var(--muted);
}

@media (prefers-reduced-motion: reduce) {
  .sn-edge,
  .sn-edge.is-project {
    animation: none !important;
    stroke-dashoffset: 0;
    opacity: 1;
  }
  .sn-edge.is-hot {
    animation: none !important;
  }
}
</style>
