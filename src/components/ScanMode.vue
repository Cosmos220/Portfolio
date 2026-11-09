<script setup lang="ts">
/* Scan : une onde part du pointeur et révèle, au passage, chaque élément
   avec lequel on peut interagir — liens, boutons — marqué d'un hexagone et
   d'une étiquette. C'est le « profiler » du jeu, appliqué à la page.

   Déclenché par la touche S, ou par n'importe quel composant via
   `window.dispatchEvent(new Event("sys:scan"))` (le bouton du pied de page
   s'en sert) : il n'y a ainsi qu'un seul endroit qui connaît la logique.

   Aussi utile qu'esthétique : il montre à un visiteur ce qui est cliquable.
   Et il reste fonctionnel en « mouvement réduit », où seule l'onde animée
   est retirée — les marqueurs apparaissent d'un coup, sans cascade. */
import { onBeforeUnmount, onMounted, ref } from "vue";

type Marker = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  delay: number;
};

const markers = ref<Marker[]>([]);
const ring = ref<{ x: number; y: number } | null>(null);
const active = ref(false);

const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Dernière position connue du pointeur : l'onde part de là. Sans souris
   (clavier, tactile), elle part du centre de l'écran. */
let px = -1;
let py = -1;
let clear: number | undefined;
let seq = 0;

const SELECTOR = 'a[href], button:not([disabled]), [role="button"], summary';
const MAX_MARKERS = 40;
const SCAN_MS = 2800;
/* Vitesse de l'onde, en px/s : fixe la cascade des marqueurs. */
const WAVE_SPEED = 1500;

function labelOf(el: Element): string {
  const raw =
    el.getAttribute("data-target-label") ||
    el.getAttribute("aria-label") ||
    (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "NOEUD";
  return (raw.length > 22 ? raw.slice(0, 21) + "…" : raw).toUpperCase();
}

function scan() {
  window.clearTimeout(clear);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ox = px >= 0 ? px : vw / 2;
  const oy = py >= 0 ? py : vh / 2;

  const found: Marker[] = [];
  for (const el of document.querySelectorAll(SELECTOR)) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    // Entièrement hors écran : inutile de le marquer.
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    // Les calques décoratifs du site ne sont pas des cibles.
    if (el.closest("[aria-hidden='true'], .sys-scan, .mdl-backdrop")) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dist = Math.hypot(cx - ox, cy - oy);
    found.push({
      id: ++seq,
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
      label: labelOf(el),
      delay: reduce ? 0 : Math.round((dist / WAVE_SPEED) * 1000),
    });
  }

  /* Les plus proches de l'origine d'abord : si on plafonne, on garde ce qui
     est autour du pointeur. */
  found.sort((a, b) => a.delay - b.delay);
  markers.value = found.slice(0, MAX_MARKERS);
  ring.value = reduce ? null : { x: ox, y: oy };
  active.value = true;
  clear = window.setTimeout(stop, SCAN_MS);
}

function stop() {
  active.value = false;
  markers.value = [];
  ring.value = null;
}

function onKey(e: KeyboardEvent) {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key !== "s" && e.key !== "S") return;
  // Pas de raccourci pendant la saisie de texte.
  const t = e.target as HTMLElement | null;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  scan();
}
function onMove(e: PointerEvent) {
  px = e.clientX;
  py = e.clientY;
}

onMounted(() => {
  window.addEventListener("keydown", onKey);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("sys:scan", scan);
  // Un défilement décale les cibles : les marqueurs seraient faux.
  window.addEventListener("scroll", stop, { passive: true });
});
onBeforeUnmount(() => {
  window.clearTimeout(clear);
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("sys:scan", scan);
  window.removeEventListener("scroll", stop);
});
</script>

<template>
  <div v-if="active" class="scan" aria-hidden="true">
    <span
      v-if="ring"
      class="scan-ring"
      :style="{ left: `${ring.x}px`, top: `${ring.y}px` }"
    />

    <span
      v-for="m in markers"
      :key="m.id"
      class="scan-mk"
      :style="{
        left: `${m.x}px`,
        top: `${m.y}px`,
        width: `${m.w}px`,
        height: `${m.h}px`,
        animationDelay: `${m.delay}ms`,
      }"
    >
      <svg class="scan-hex" viewBox="0 0 12 12" width="12" height="12">
        <path d="M6 .8 10.5 3.4v5.2L6 11.2 1.5 8.6V3.4Z" fill="none" stroke="currentColor" stroke-width="1.3" />
        <rect x="5" y="5" width="2" height="2" fill="currentColor" />
      </svg>
      <span class="scan-tag">{{ m.label }}</span>
    </span>
  </div>
</template>

<style scoped>
.scan {
  position: fixed;
  inset: 0;
  z-index: 110;
  pointer-events: none;
}

/* Onde : un anneau dont le diamètre croît par crans, assez grand pour
   balayer l'écran entier depuis n'importe quel coin. */
.scan-ring {
  position: absolute;
  width: 200vmax;
  height: 200vmax;
  margin: -100vmax 0 0 -100vmax;
  border: 2px solid rgba(255, 255, 255, 0.55);
  border-radius: 50%;
  transform: scale(0);
  opacity: 0;
  animation: scanRing 1.7s steps(18, end) forwards;
}
@keyframes scanRing {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  85% {
    opacity: 0.6;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* Marqueur : contour pointillé autour de la cible, hexagone au coin.
   Invisible jusqu'à ce que l'onde arrive (`animation-delay`), puis il reste
   jusqu'à la fin du scan. */
.scan-mk {
  position: absolute;
  box-sizing: border-box;
  border: 1px dashed rgba(255, 255, 255, 0.85);
  outline: 1px solid rgba(0, 0, 0, 0.6);
  color: #fff;
  opacity: 0;
  animation: scanIn 0.18s steps(3, end) forwards;
}
@keyframes scanIn {
  from {
    opacity: 0;
    transform: scale(1.06);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.scan-hex {
  position: absolute;
  left: -7px;
  top: -7px;
  background: #000;
}
.scan-tag {
  position: absolute;
  left: 8px;
  top: -9px;
  background: #fff;
  color: #000;
  padding: 0 5px;
  font-family: var(--font-silkscreen);
  font-size: 9px;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* En mouvement réduit, pas d'onde ni de cascade : les marqueurs sont déjà
   posés d'un coup par la logique, il reste juste à ne pas les animer. */
@media (prefers-reduced-motion: reduce) {
  .scan-mk {
    animation: none;
    opacity: 1;
  }
}
</style>
