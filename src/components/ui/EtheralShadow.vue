<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, useId } from "vue";

interface AnimationConfig {
  scale: number;
  speed: number;
}
interface NoiseConfig {
  opacity: number;
  scale: number;
}

const props = withDefaults(
  defineProps<{
    sizing?: "fill" | "stretch";
    color?: string;
    animation?: AnimationConfig;
    noise?: NoiseConfig;
    /* Taille d'un « pixel » (en px CSS). 0 = rendu lisse d'origine. */
    pixelSize?: number;
    /* Nombre de niveaux de gris en mode pixel (moins = plus « pixel art »). */
    pixelLevels?: number;
  }>(),
  {
    sizing: "fill",
    color: "rgba(128, 128, 128, 1)",
    pixelSize: 0,
    pixelLevels: 5,
  },
);

function mapRange(
  value: number,
  fromLow: number,
  fromHigh: number,
  toLow: number,
  toHigh: number,
): number {
  if (fromLow === fromHigh) return toLow;
  const pct = (value - fromLow) / (fromHigh - fromLow);
  return toLow + pct * (toHigh - toLow);
}

const rawId = useId();
const filterId = `shadowoverlay-${rawId.replace(/:/g, "")}`;

const animationEnabled = computed(
  () => !!props.animation && props.animation.scale > 0,
);
const displacementScale = computed(() =>
  props.animation ? mapRange(props.animation.scale, 1, 100, 20, 100) : 0,
);
const animationDuration = computed(() =>
  props.animation ? mapRange(props.animation.speed, 1, 100, 1000, 50) : 1,
);

const baseFreq = computed(() => {
  const s = props.animation?.scale ?? 0;
  return `${mapRange(s, 0, 100, 0.001, 0.0005)},${mapRange(s, 0, 100, 0.004, 0.002)}`;
});

/* ------------------------------------------------------------------
   Rendu « pixel art »
   On ne pixelise pas la sortie du filtre SVG (feMorphology/feTile donnent
   un résultat imprévisible selon le navigateur). On refait le même rendu
   sur un canvas basse résolution — 1 pixel canvas = 1 cellule, agrandi
   ensuite sans lissage (`image-rendering: pixelated`) :
     · la FORME vient du même masque que le rendu lisse (volutes en
       diagonale), ré-échantillonné à la résolution des cellules ;
     · elle est déformée par un bruit basse fréquence, ce que fait
       `feDisplacementMap` dans la version lisse ;
     · le tout est quantifié en quelques niveaux de gris avec tramage.
   ------------------------------------------------------------------ */
const pixelated = computed(() => props.pixelSize > 0);
const px = computed(() => Math.max(2, Math.round(props.pixelSize)));
const levels = computed(() => Math.max(2, Math.round(props.pixelLevels)));

const pixelCanvas = ref<HTMLCanvasElement | null>(null);
let pixelCtx: CanvasRenderingContext2D | null = null;
let pixelRaf = 0;
let pixelResizeObs: ResizeObserver | null = null;
let lastDraw = -1e9;

/* Lattice de bruit pré-calculée (puissance de 2 → indexation par masque
   binaire, donc bouclage gratuit). Bien plus rapide qu'un hash à base de
   sin() recalculé à chaque cellule, et sans les artefacts de moiré que
   produisent les produits de sinus. */
const LAT = 128;
let lattice: Float32Array | null = null;
function ensureLattice() {
  if (lattice) return;
  lattice = new Float32Array(LAT * LAT);
  for (let i = 0; i < lattice.length; i++) lattice[i] = Math.random();
}
function latAt(xi: number, yi: number): number {
  return lattice![((yi & (LAT - 1)) << 7) + (xi & (LAT - 1))];
}
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const sx = smoothstep(x - xi);
  const sy = smoothstep(y - yi);
  const a = latAt(xi, yi);
  const b = latAt(xi + 1, yi);
  const c = latAt(xi, yi + 1);
  const d = latAt(xi + 1, yi + 1);
  const top = a + (b - a) * sx;
  const bot = c + (d - c) * sx;
  return top + (bot - top) * sy;
}
/* 3 octaves : assez pour des volutes crédibles, le tramage fournit le
   détail fin (inutile de payer plus d'octaves). */
function fbm(x: number, y: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < 3; i++) {
    sum += amp * vnoise(x * freq, y * freq);
    norm += amp;
    freq *= 2;
    amp *= 0.5;
  }
  return sum / norm;
}

/* Le masque d'origine ré-échantillonné à la résolution des cellules.
   Le tampon est plus grand que la zone visible (marge `maskPad`) car la
   déformation va chercher des pixels au-delà des bords — exactement ce que
   fait l'`inset: -displacementScale` de la version lisse. */
let maskImg: HTMLImageElement | null = null;
let maskAlpha: Uint8ClampedArray | null = null;
let maskBufW = 0;
let maskBufH = 0;
let maskPad = 0;

function buildMaskBuffer(cols: number, rows: number, cell: number) {
  const img = maskImg;
  if (!img || !img.complete || !img.naturalWidth) return;
  const pad = Math.ceil(displacementScale.value / cell);
  const bw = cols + pad * 2;
  const bh = rows + pad * 2;
  if (maskAlpha && bw === maskBufW && bh === maskBufH) return;

  const oc = document.createElement("canvas");
  oc.width = bw;
  oc.height = bh;
  const octx = oc.getContext("2d");
  if (!octx) return;
  /* Équivalent de `mask-size: cover` / `mask-position: center`. */
  const s =
    props.sizing === "stretch"
      ? 0
      : Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
  try {
    if (s === 0) {
      octx.drawImage(img, 0, 0, bw, bh);
    } else {
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      octx.drawImage(img, (bw - dw) / 2, (bh - dh) / 2, dw, dh);
    }
    maskAlpha = octx.getImageData(0, 0, bw, bh).data;
    maskBufW = bw;
    maskBufH = bh;
    maskPad = pad;
  } catch {
    /* Canvas « teinté » (masque servi sans en-tête CORS) : on retombe sur
       le nuage procédural plutôt que d'afficher un fond noir. */
    maskAlpha = null;
  }
}

/* Matrice de Bayer 4x4 : tramage ordonné. C'est elle qui fait lire
   « pixel art » — les dégradés se cassent en motifs réguliers de points
   au lieu de bandes lisses, sans jamais créer de bruit aléatoire. */
const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

function drawPixelFrame(now: number) {
  const el = pixelCanvas.value;
  if (!el) return;
  ensureLattice();
  if (!pixelCtx) pixelCtx = el.getContext("2d", { alpha: false });
  const ctx = pixelCtx;
  if (!ctx) return;

  const parent = el.parentElement;
  const w = parent?.clientWidth || el.clientWidth || 1;
  const h = parent?.clientHeight || el.clientHeight || 1;
  const cell = px.value;
  const cols = Math.max(1, Math.ceil(w / cell));
  const rows = Math.max(1, Math.ceil(h / cell));

  if (el.width !== cols || el.height !== rows) {
    el.width = cols;
    el.height = rows;
  }
  /* Taille CSS = multiple exact de `cell` : garantit des pixels carrés et
     tous identiques (un simple 100% donnerait un facteur d'échelle
     fractionnaire, donc des colonnes plus larges que d'autres). */
  el.style.width = `${cols * cell}px`;
  el.style.height = `${rows * cell}px`;

  buildMaskBuffer(cols, rows, cell);
  const mask = maskAlpha;
  const mw = maskBufW;
  const mh = maskBufH;
  const pad = maskPad;

  const speed = props.animation
    ? mapRange(props.animation.speed, 1, 100, 0.006, 0.045)
    : 0.02;
  /* Échelle du bruit exprimée par cellule : indépendante de `pixelSize`,
     pour que changer la taille des pixels ne change pas la taille des volutes. */
  const scale = props.animation
    ? mapRange(props.animation.scale, 1, 100, 0.05, 0.016) * (cell / 6)
    : 0.02;
  const t = now * 0.001 * speed;
  const dx1 = t * 1.6;
  const dy1 = t * 0.7;
  const dx2 = -t * 0.9 + 37;
  const dy2 = t * 1.15 + 61;

  /* Amplitude de déformation, convertie en cellules. `feDisplacementMap`
     déplace de ±scale/2, d'où la division par 2. */
  const disp = displacementScale.value / cell / 2;
  /* Bruit de déformation très basse fréquence : de grandes ondulations
     douces plutôt qu'un tremblement local. */
  const dScale = scale * 0.55;

  const n = levels.value;
  const cx = cols / 2;
  const cy = rows / 2;
  const rx = cols * 0.8;
  const ry = rows * 0.88;

  const img = ctx.createImageData(cols, rows);
  const data = img.data;

  for (let y = 0; y < rows; y++) {
    const ny = y * scale;
    const dyN = (y - cy) / ry;
    const bayerRow = (y & 3) << 2;
    for (let x = 0; x < cols; x++) {
      const nx = x * scale;
      let v: number;

      if (mask) {
        /* Deux champs de bruit indépendants → un décalage en x, un en y,
           comme les deux canaux lus par `feDisplacementMap`. */
        const ox = (fbm(x * dScale + dx1, y * dScale + dy1) - 0.5) * disp;
        const oy =
          (fbm(x * dScale + dx2, y * dScale + dy2) - 0.5) * disp;

        let sx = (x + pad + ox) | 0;
        let sy = (y + pad + oy) | 0;
        if (sx < 0) sx = 0;
        else if (sx >= mw) sx = mw - 1;
        if (sy < 0) sy = 0;
        else if (sy >= mh) sy = mh - 1;

        /* Le masque porte la forme dans son canal alpha, qui ne monte qu'à
           ~0.87 : le gain ramène les zones les plus denses au blanc franc.
           Le gamma relève juste assez les tons moyens pour que le tramage
           ait de la matière, sans cramer le haut de l'image en aplats. */
        v = (mask[(sy * mw + sx) * 4 + 3] / 255) * 1.16;
        v = Math.pow(v > 1 ? 1 : v, 0.86);
      } else {
        /* Repli si le masque n'est pas lisible : nuage procédural. */
        v =
          0.62 * fbm(nx + dx1, ny + dy1) +
          0.38 * fbm(nx * 1.9 + dx2, ny * 1.9 + dy2);
        v = (v - 0.38) * 3 + 0.18;
        const dxN = (x - cx) / rx;
        const r = Math.sqrt(dxN * dxN + dyN * dyN);
        const rr = Math.min(1, Math.max(0, (r - 0.2) / 0.8));
        v *= 1 - smoothstep(rr);
      }

      if (v < 0) v = 0;
      else if (v > 1) v = 1;

      /* Quantification tramée : le tramage décide de l'arrondi vers le
         palier du dessus ou du dessous. */
      const scaled = v * (n - 1);
      const base = Math.floor(scaled);
      const frac = scaled - base;
      const threshold = (BAYER[bayerRow + (x & 3)] + 0.5) / 16;
      const idx = Math.min(n - 1, base + (frac > threshold ? 1 : 0));

      const g = Math.round((idx / (n - 1)) * 255);
      const o = (y * cols + x) * 4;
      data[o] = g;
      data[o + 1] = g;
      data[o + 2] = g;
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const feColorMatrixRef = ref<SVGFEColorMatrixElement | null>(null);
let raf = 0;
const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

onMounted(() => {
  if (pixelated.value) {
    /* `crossOrigin` est indispensable : sans lui le canvas devient « teinté »
       et `getImageData` lèverait, donc impossible de quantifier le masque. */
    maskImg = new Image();
    maskImg.crossOrigin = "anonymous";
    maskImg.onload = () => {
      maskAlpha = null; // force la reconstruction du tampon
      drawPixelFrame(performance.now());
    };
    maskImg.src = maskUrl;

    /* Premier cadre synchrone : évite un flash noir en attendant le rAF
       (qui est suspendu tant que l'onglet n'est pas composité). */
    drawPixelFrame(performance.now());
    const el = pixelCanvas.value;
    if (el?.parentElement) {
      pixelResizeObs = new ResizeObserver(() =>
        drawPixelFrame(performance.now()),
      );
      pixelResizeObs.observe(el.parentElement);
    }
    if (!reduce) {
      const loop = (now: number) => {
        if (now - lastDraw >= 1000 / 20) {
          lastDraw = now;
          drawPixelFrame(now);
        }
        pixelRaf = requestAnimationFrame(loop);
      };
      pixelRaf = requestAnimationFrame(loop);
    }
    return;
  }

  if (!animationEnabled.value || reduce) return;
  // boucle hueRotate 0->360 (réplique l'animation framer-motion d'origine)
  const periodMs = (animationDuration.value / 25) * 1000;
  const start = performance.now();
  const loop = (now: number) => {
    const t = ((now - start) % periodMs) / periodMs;
    feColorMatrixRef.value?.setAttribute("values", String(t * 360));
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  cancelAnimationFrame(pixelRaf);
  pixelResizeObs?.disconnect();
});

const maskUrl =
  "https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png";
const noiseUrl =
  "https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png";
</script>

<template>
  <div class="es-root">
    <!-- Mode pixel : le canvas porte tout le rendu. -->
    <canvas v-if="pixelated" ref="pixelCanvas" class="es-pixel-canvas" />

    <!-- Mode lisse d'origine : filtre SVG + masque + grain. -->
    <template v-else>
      <div
        class="es-displace"
        :style="{
          inset: `${-displacementScale}px`,
          filter: animationEnabled ? `url(#${filterId}) blur(4px)` : 'none',
        }"
      >
        <svg v-if="animationEnabled" class="es-svg">
          <defs>
            <filter :id="filterId">
              <feTurbulence
                result="undulation"
                numOctaves="2"
                :baseFrequency="baseFreq"
                seed="0"
                type="turbulence"
              />
              <feColorMatrix
                ref="feColorMatrixRef"
                in="undulation"
                type="hueRotate"
                values="180"
              />
              <feColorMatrix
                in="dist"
                result="circulation"
                type="matrix"
                values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="circulation"
                :scale="displacementScale"
                result="dist"
              />
              <feDisplacementMap
                in="dist"
                in2="undulation"
                :scale="displacementScale"
                result="output"
              />
            </filter>
          </defs>
        </svg>
        <div
          class="es-mask"
          :style="{
            backgroundColor: color,
            maskImage: `url('${maskUrl}')`,
            WebkitMaskImage: `url('${maskUrl}')`,
            maskSize: sizing === 'stretch' ? '100% 100%' : 'cover',
            WebkitMaskSize: sizing === 'stretch' ? '100% 100%' : 'cover',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          }"
        />
      </div>

      <div
        v-if="noise && noise.opacity > 0"
        class="es-noise"
        :style="{
          backgroundImage: `url('${noiseUrl}')`,
          backgroundSize: `${noise.scale * 200}px`,
          opacity: noise.opacity / 2,
        }"
      />
    </template>

    <div class="es-content"><slot /></div>
  </div>
</template>

<style scoped>
.es-root {
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
}
.es-displace {
  position: absolute;
}
.es-svg {
  position: absolute;
}
.es-mask {
  width: 100%;
  height: 100%;
}
.es-content {
  position: absolute;
  inset: 0;
  z-index: 10;
}
.es-noise {
  position: absolute;
  inset: 0;
  background-repeat: repeat;
}
.es-pixel-canvas {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  /* Agrandissement sans lissage : chaque pixel du canvas devient un carré net. */
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}
</style>
