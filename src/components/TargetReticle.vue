<script setup lang="ts">
/* Mire de ciblage : suit le pointeur, et quand il passe sur un élément
   cliquable, ses quatre crochets s'écartent pour venir épouser la cible,
   avec une étiquette — le geste du profiler, quand la mire se verrouille sur
   un passant.

   Elle REMPLACE le curseur du système : le carré est le seul pointeur
   visible, le point central marque la position exacte du clic.

   Le curseur natif n'est masqué que lorsque la mire est réellement active
   (classe `has-reticle` posée sur <html>). Sur écran tactile (pas de survol,
   la mire serait figée dans un coin) et en mode « mouvement réduit » (où une
   cible qui glisse est justement ce qu'on cherche à éviter), la mire est
   coupée ET le curseur natif reste : sinon ces visiteurs n'auraient plus
   aucun pointeur.

   La boucle d'animation ne tourne QUE pendant qu'un déplacement est en cours
   (elle s'arrête quand la mire a rejoint sa cible) : un rAF permanent
   consommerait du CPU sur une page immobile. */
import { onBeforeUnmount, onMounted, ref } from "vue";

const root = ref<HTMLElement | null>(null);
const label = ref("");
const locked = ref(false);
const pressed = ref(false);
const shown = ref(false);

/* Positions courante (c) et cible (t), lissées par interpolation. */
const c = { x: -100, y: -100, w: 28, h: 28 };
const t = { x: -100, y: -100, w: 28, h: 28 };
let raf = 0;
let enabled = false;

const TARGETS = 'a[href], button:not([disabled]), [role="button"], summary';

function labelFor(el: Element): string {
  const custom = el.getAttribute("data-target-label");
  if (custom) return custom;
  if (el.tagName === "A") {
    const a = el as HTMLAnchorElement;
    return a.target === "_blank" ? "Ouvrir" : "Accéder";
  }
  return "Activer";
}

function frame() {
  raf = 0;
  const k = 0.3;
  c.x += (t.x - c.x) * k;
  c.y += (t.y - c.y) * k;
  c.w += (t.w - c.w) * k;
  c.h += (t.h - c.h) * k;

  const el = root.value;
  if (el) {
    el.style.transform = `translate(${c.x}px, ${c.y}px)`;
    el.style.width = `${c.w}px`;
    el.style.height = `${c.h}px`;
  }

  const settled =
    Math.abs(t.x - c.x) < 0.4 &&
    Math.abs(t.y - c.y) < 0.4 &&
    Math.abs(t.w - c.w) < 0.4 &&
    Math.abs(t.h - c.h) < 0.4;
  if (!settled) raf = requestAnimationFrame(frame);
}
function kick() {
  if (!raf) raf = requestAnimationFrame(frame);
}

function onMove(e: PointerEvent) {
  if (e.pointerType === "touch") return;
  /* Sur une <iframe> (aperçu du CV), le pointeur appartient au document
     intégré : plus aucun évènement ne nous parviendrait, la mire resterait
     figée au bord. On la masque, et l'iframe affiche son propre curseur. */
  if ((e.target as Element | null)?.tagName === "IFRAME") {
    shown.value = false;
    return;
  }
  shown.value = true;

  const hit = (e.target as Element | null)?.closest?.(TARGETS) ?? null;
  if (hit && hit.getAttribute("aria-disabled") !== "true") {
    const r = hit.getBoundingClientRect();
    /* Léger débord : les crochets encadrent la cible au lieu de la mordre. */
    const pad = 6;
    t.x = r.left - pad;
    t.y = r.top - pad;
    t.w = r.width + pad * 2;
    t.h = r.height + pad * 2;
    label.value = labelFor(hit);
    locked.value = true;
  } else {
    t.w = 28;
    t.h = 28;
    t.x = e.clientX - t.w / 2;
    t.y = e.clientY - t.h / 2;
    locked.value = false;
  }
  kick();
}

const onLeave = () => (shown.value = false);
const onDown = () => (pressed.value = true);
const onUp = () => (pressed.value = false);

onMounted(() => {
  enabled =
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!enabled) return;
  document.documentElement.classList.add("has-reticle");
  /* Écoute en capture pour voir l'élément visé même quand un composant
     arrête la propagation. */
  window.addEventListener("pointermove", onMove, { passive: true, capture: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove("has-reticle");
  cancelAnimationFrame(raf);
  window.removeEventListener("pointermove", onMove, { capture: true });
  window.removeEventListener("pointerdown", onDown);
  window.removeEventListener("pointerup", onUp);
  document.documentElement.removeEventListener("pointerleave", onLeave);
});
</script>

<template>
  <div
    ref="root"
    class="ret sys-brackets"
    :class="{ 'is-on': shown, 'is-locked': locked, 'is-press': pressed }"
    aria-hidden="true"
  >
    <span class="ret-dot" />
    <span v-if="locked" class="ret-tag">{{ label }}</span>
  </div>
</template>

<style scoped>
.ret {
  --bk: 8px;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 120;
  width: 28px;
  height: 28px;
  pointer-events: none;
  color: #fff;
  /* La mire doit rester lisible sur fond noir comme sur une capture claire. */
  mix-blend-mode: difference;
  opacity: 0;
  transition: opacity 0.12s steps(2, end);
  will-change: transform, width, height;
}
.ret.is-on {
  opacity: 1;
}
.ret.is-locked {
  --bk: 12px;
}
/* Clic : les crochets se resserrent un instant, comme un verrouillage. */
.ret.is-press {
  --bk: 5px;
}

/* Point central : marque la position exacte du pointeur quand la mire est
   libre, et disparaît une fois verrouillée (la cible prend le relais). */
.ret-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4px;
  height: 4px;
  margin: -2px 0 0 -2px;
  background: currentColor;
}
.ret.is-locked .ret-dot {
  opacity: 0;
}

.ret-tag {
  position: absolute;
  left: 0;
  bottom: calc(100% + 4px);
  background: #fff;
  color: #000;
  padding: 1px 6px;
  font-family: var(--font-silkscreen);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
</style>
