<script setup lang="ts">
/* Hôte de la ville 3D : un canvas plein écran fixé derrière tout le site.

   Responsabilités :
   · décider SI et COMMENT afficher la 3D (WebGL absent, économie de données,
     petit écran, mouvement réduit) ;
   · charger Three.js en différé, sans retarder l'affichage du texte ;
   · piloter la boucle de rendu et les entrées (souris) ;
   · basculer sur une silhouette statique si le contexte graphique est perdu.

   La ville n'est JAMAIS nécessaire pour utiliser le site : tout ce qu'elle
   affiche est décoratif (`aria-hidden`), et le contenu reste lisible sans. */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { attachCity, cityState } from "../../city/state";
import type { CityRenderer } from "../../city/createScene";
import CityFallback from "./CityFallback.vue";

const canvas = ref<HTMLCanvasElement | null>(null);

let renderer: CityRenderer | null = null;
let raf = 0;
let last = 0;
let t0 = 0;
let ro: ResizeObserver | null = null;
let camTimer = 0;
let fpsFrames = 0;
let fpsT = 0;

const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/* « Lite » : petit écran, tactile, ou machine modeste. Même ville, moins de
   blocs, sans fenêtres ni poussière, résolution 1:1. */
function pickQuality(): "full" | "lite" {
  const small = window.innerWidth < 820;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 2;
  return small || coarse || weak ? "lite" : "full";
}

/* Cadence adaptative : 60 i/s quand quelque chose bouge (vol de caméra,
   parallaxe de la souris), 30 i/s au repos — la dérive lente ne se voit pas
   à 60, et c'est la moitié du travail GPU/CPU le plus souvent. */
let lastRender = 0;
let lastInput = 0;
const IDLE_MS = 33;
const ACTIVE_HOLD_MS = 1600;

function onPointer(e: PointerEvent) {
  lastInput = performance.now();
  if (!renderer) return;
  renderer.director.setPointer(
    (e.clientX / window.innerWidth) * 2 - 1,
    (e.clientY / window.innerHeight) * 2 - 1,
  );
}

function loop(now: number) {
  raf = requestAnimationFrame(loop);
  if (!renderer) return;
  const active = renderer.speed > 0.01 || now - lastInput < ACTIVE_HOLD_MS;
  if (!active && now - lastRender < IDLE_MS - 2) return;
  lastRender = now;
  const t = (now - t0) / 1000;
  /* dt plafonné : après une pause (onglet masqué) la caméra ne « saute » pas. */
  const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
  last = now;
  renderer.frame(dt, t);

  /* Indicateurs : publiés à fréquence réduite, pas à chaque image — mettre à
     jour l'état réactif 60 fois par seconde ferait retravailler Vue. */
  fpsFrames++;
  if (now - fpsT > 500) {
    cityState.fps = Math.round((fpsFrames * 1000) / (now - fpsT));
    fpsFrames = 0;
    fpsT = now;
  }
  if (now - camTimer > 100) {
    camTimer = now;
    const c = renderer.camera;
    cityState.cam.x = c.x;
    cityState.cam.y = c.y;
    cityState.cam.z = c.z;
    cityState.cam.yaw = c.yaw;
    cityState.veil = renderer.veil;
  }
}

function onResize() {
  const el = canvas.value;
  if (!el || !renderer) return;
  renderer.resize(el.clientWidth, el.clientHeight);
  if (reduce) renderer.frame(0, 0);
}

function onContextLost(e: Event) {
  e.preventDefault();
  cityState.supported = false;
  cityState.ready = false;
}

async function start() {
  const el = canvas.value;
  if (!el) return;

  const saveData =
    (navigator as unknown as { connection?: { saveData?: boolean } }).connection
      ?.saveData === true;
  if (saveData || !webglAvailable()) {
    cityState.supported = false;
    return;
  }

  cityState.quality = pickQuality();
  try {
    const mod = await import("../../city/createScene");
    renderer = mod.createCityRenderer(el, {
      quality: cityState.quality,
      pixelRatio: cityState.quality === "lite" ? 1 : Math.min(window.devicePixelRatio, 1.25),
      reduced: reduce,
    });
  } catch (err) {
    // Chargement du chunk ou création du contexte en échec : repli statique.
    console.warn("[ville] rendu 3D indisponible :", err);
    cityState.supported = false;
    return;
  }

  cityState.nodes = renderer.stats.buildings;
  el.addEventListener("webglcontextlost", onContextLost);
  renderer.resize(el.clientWidth, el.clientHeight);

  /* Les ordres reçus avant que la scène existe sont appliqués ici ; le tout
     premier point de vue est rejoint sans voyage. */
  attachCity(renderer, reduce);
  renderer.director.snap();

  ro = new ResizeObserver(onResize);
  ro.observe(el);

  if (reduce) {
    /* Pas de boucle : une image suffit, redessinée seulement quand le point
       de vue ou la taille changent. */
    renderer.frame(0, 0);
  } else {
    window.addEventListener("pointermove", onPointer, { passive: true });
    t0 = performance.now();
    raf = requestAnimationFrame(loop);
  }
  cityState.ready = true;

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__city = { renderer, cityState };
  }
}

/* Onglet masqué : on arrête complètement la boucle (zéro travail), et on la
   relance à la reprise. */
function onVisibility() {
  if (reduce || !renderer) return;
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
  } else if (!raf) {
    last = 0;
    raf = requestAnimationFrame(loop);
  }
}

onMounted(() => {
  void start();
  document.addEventListener("visibilitychange", onVisibility);
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibility);
  cancelAnimationFrame(raf);
  window.removeEventListener("pointermove", onPointer);
  canvas.value?.removeEventListener("webglcontextlost", onContextLost);
  ro?.disconnect();
  attachCity(null);
  renderer?.dispose();
  renderer = null;
});

/* Quand la scène est perdue ou refusée, le voile n'a plus de ville à
   assombrir : on garde une valeur fixe plutôt que celle du dernier vol. */
watch(
  () => cityState.supported,
  (ok) => {
    if (!ok) cityState.veil = 0.5;
  },
);
</script>

<template>
  <div
    class="city"
    :class="{ 'is-visible': cityState.visible, 'is-ready': cityState.ready }"
    aria-hidden="true"
  >
    <canvas v-show="cityState.supported" ref="canvas" class="city-canvas" />
    <CityFallback v-if="!cityState.supported" />
    <!-- Voile : garde le texte lisible, plus dense sur les pages de lecture. -->
    <div class="city-veil" :style="{ opacity: cityState.veil }" />
    <div class="city-vignette" />
  </div>
</template>

<style scoped>
.city {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: #050505;
  opacity: 0;
  /* Fondu d'entrée lent : la ville émerge de l'obscurité, elle n'apparaît
     pas d'un coup. */
  transition: opacity 1.6s ease;
}
.city.is-visible {
  opacity: 1;
}
.city-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.city-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(3, 3, 3, 0.92) 0%,
    rgba(3, 3, 3, 0.55) 45%,
    rgba(3, 3, 3, 0.35) 100%
  );
  transition: opacity 0.4s linear;
}
/* Vignettage : assombrit les bords, concentre le regard au centre. */
.city-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 55% 45%,
    transparent 40%,
    rgba(2, 2, 2, 0.78) 100%
  );
}
</style>
