<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { profile, profileCard, socials } from "../data/content";

/* Fiche « profiler » rattachée au compte GitHub : photo encadrée, nom et
   lien en étiquettes blanches, données en bandeaux noirs de longueurs
   inégales — la mise en page des fiches de surveillance des jeux de hacker,
   version noire. Les étiquettes se posent l'une après l'autre à
   l'apparition.

   Comme dans le jeu, la fiche ne colle pas à l'écran : elle flotte dans
   l'espace, pivotée sur le côté, et ses couches (photo, étiquettes) sont
   décalées en profondeur. Un léger balancement la garde vivante ; au
   survol, elle se redresse et suit la souris.

   Le mouvement est piloté en JS, image par image, avec un amortissement :
   la fiche glisse toujours vers sa position cible au lieu d'y sauter. Avec
   une animation CSS, passer du balancement au survol faisait un à-coup,
   car on ne peut pas enchaîner proprement une animation et une transition.

   Apparition : comme quand on cible un passant dans le jeu, toutes les
   lignes s'écrivent en même temps, de gauche à droite, et chacune traîne au
   bout quelques caractères parasites (* $ x % / _) qui changent sans cesse,
   comme une donnée encore en cours de déchiffrement. Les étiquettes
   s'élargissent au rythme du texte. Elle démarre quand `active` passe à
   vrai (fin du voile d'intro).

   Uniquement des informations réelles : pas d'âge ni de revenu inventés. */
const props = defineProps<{ active?: boolean }>();
const github = socials.find((s) => s.label === "GitHub")?.href ?? "";
const handle = github.replace(/^https?:\/\/(www\.)?github\.com\//, "");
const avatar = handle ? `https://github.com/${handle}.png?size=200` : "";

/* Les lignes affichées sont celles de `profileCard` (une seule source,
   dans content.ts). « Nom » n'y figure pas : il a sa propre étiquette en tête
   de fiche. */
const rows = profileCard.filter((r) => r.label !== "Nom" && r.value);

/* ---- déchiffrement des lignes ------------------------------- */
const lines = [
  `${profile.lastName}, ${profile.firstName}`,
  `github.com/${handle}`,
  ...rows.map((r) => `${r.label} : ${r.value}`),
];
const shown = ref<string[]>(lines.map(() => ""));
const decoding = ref(false);
const GLYPHS = "*$x%/_X";
const MS_PER_CHAR = 22;
let decodeRaf = 0;

const garbage = (n: number) =>
  Array.from({ length: n }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("");

function decode() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    shown.value = [...lines];
    return;
  }
  decoding.value = true;
  const start = performance.now();
  let lastNoise = 0;
  const step = (now: number) => {
    // Les parasites changent toutes les ~45 ms : à chaque image, ils
    // grouilleraient au point de devenir illisibles.
    const refresh = now - lastNoise > 45;
    if (refresh) lastNoise = now;
    let done = true;
    shown.value = lines.map((text, i) => {
      // Départs légèrement décalés : le nom d'abord, puis les lignes suivantes.
      const t = now - start - i * 40;
      if (t <= 0) {
        done = false;
        return "";
      }
      const n = Math.min(text.length, Math.floor(t / MS_PER_CHAR));
      if (n >= text.length) return text;
      done = false;
      const tail = Math.min(3, text.length - n);
      const prev = shown.value[i] ?? "";
      return text.slice(0, n) + (refresh ? garbage(tail) : prev.slice(n, n + tail).padEnd(tail, "*"));
    });
    if (done) {
      decoding.value = false;
      return;
    }
    decodeRaf = requestAnimationFrame(step);
  };
  decodeRaf = requestAnimationFrame(step);
}

watch(
  () => props.active,
  (v) => {
    if (v && !shown.value[0]) decode();
  },
  { immediate: true },
);

/* ---- mouvement ---------------------------------------------- */
const scene = ref<HTMLElement | null>(null);
const card = ref<HTMLElement | null>(null);

const REST = { y: -24, x: 6 }; // pose au repos (degrés)
const cur = { y: REST.y, x: REST.x, lift: 0 };
let hovering = false;
let pointer = { x: 0, y: 0 }; // position de la souris sur la fiche, de -1 à 1
let raf = 0;
let t0 = 0;

function onMove(e: PointerEvent) {
  const r = scene.value!.getBoundingClientRect();
  pointer = {
    x: ((e.clientX - r.left) / r.width) * 2 - 1,
    y: ((e.clientY - r.top) / r.height) * 2 - 1,
  };
}
function onEnter() {
  hovering = true;
}
function onLeave() {
  hovering = false;
  pointer = { x: 0, y: 0 };
}

function frame(now: number) {
  const t = (now - t0) / 1000;
  // Cible : au repos, un balancement lent ; au survol, presque de face,
  // légèrement penchée vers la souris.
  const target = hovering
    ? { y: -6 + pointer.x * 8, x: 2 - pointer.y * 6, lift: -4 }
    : {
        y: REST.y + Math.sin(t * 0.9) * 3,
        x: REST.x + Math.sin(t * 0.7 + 1) * 1.5,
        lift: Math.sin(t * 0.9) * 3,
      };
  // Amortissement : on parcourt une fraction de l'écart à chaque image.
  const k = hovering ? 0.12 : 0.06;
  cur.y += (target.y - cur.y) * k;
  cur.x += (target.x - cur.x) * k;
  cur.lift += (target.lift - cur.lift) * k;
  if (card.value) {
    card.value.style.transform = `translateY(${cur.lift.toFixed(2)}px) rotateY(${cur.y.toFixed(2)}deg) rotateX(${cur.x.toFixed(2)}deg)`;
  }
  raf = requestAnimationFrame(frame);
}

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  t0 = performance.now();
  raf = requestAnimationFrame(frame);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  cancelAnimationFrame(decodeRaf);
});
</script>

<template>
  <div
    ref="scene"
    class="gp-scene"
    @pointerenter="onEnter"
    @pointerleave="onLeave"
    @pointermove="onMove"
  >
  <div ref="card" class="gp">
    <!-- En-tête de l'application -->
    <div class="gp-app" aria-hidden="true">
      <span class="gp-bar gp-bar--a">LD-OS_Profiler</span>
      <span class="gp-bar gp-bar--b">v2.6xx</span>
    </div>

    <div class="gp-body">
      <!-- Colonne photo -->
      <div class="gp-left">
        <a :href="github" target="_blank" rel="noopener noreferrer" class="gp-picture" :aria-label="`Profil GitHub de ${profile.firstName} ${profile.lastName}`">
          <img v-if="avatar" :src="avatar" alt="" width="96" height="96" loading="lazy" />
        </a>
        <div class="gp-tick gp-tick--long" aria-hidden="true">••*•</div>
        <div class="gp-tick gp-tick--short" aria-hidden="true" />
      </div>

      <!-- Colonne données -->
      <!-- Le texte complet reste lisible par les lecteurs d'écran ; la
           version animée leur est masquée. -->
      <div class="gp-right">
        <span class="sr-only">{{ lines.join(". ") }}</span>
        <span v-if="shown[0]" class="gp-tag gp-name" aria-hidden="true">{{ shown[0] }}</span>
        <a
          v-if="shown[1]"
          :href="github"
          target="_blank"
          rel="noopener noreferrer"
          class="gp-tag gp-link"
          :aria-label="lines[1]"
        ><span aria-hidden="true">{{ shown[1] }}</span></a>
        <template v-for="(_, i) in rows" :key="i">
          <span v-if="shown[i + 2]" class="gp-row" aria-hidden="true">{{ shown[i + 2] }}</span>
        </template>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
/* ---- mise en espace ----------------------------------------
   Perspective sur le parent, rotation sur la fiche, et chaque couche
   avancée sur l'axe Z : en pivotant, elles glissent l'une sur l'autre. */
.gp-scene {
  perspective: 1100px;
  perspective-origin: 0% 50%;
}
.gp {
  width: max-content;
  max-width: 32rem;
  font-family: var(--font-hanken);
  transform-style: preserve-3d;
  /* Pose initiale (et définitive en mouvement réduit) ; ensuite pilotée en JS. */
  transform: rotateY(-24deg) rotateX(6deg);
  will-change: transform;
}
.gp-app {
  transform: translateZ(10px);
}
.gp-body {
  transform-style: preserve-3d;
}
.gp-left {
  transform: translateZ(25px);
}
.gp-right {
  transform: translateZ(55px);
}

/* ---- en-tête ------------------------------------------------ */
.gp-app {
  display: flex;
  flex-direction: column;
  width: 11rem;
  margin-bottom: 5px;
}
.gp-bar {
  display: flex;
  align-items: center;
  height: 26px;
  padding-left: 7px;
  background: #000;
  color: var(--foreground);
  font-family: var(--font-geist-mono);
  font-size: 13px;
  line-height: 1;
}
.gp-bar--b {
  width: 70%;
}

.gp-body {
  display: flex;
}

/* ---- photo -------------------------------------------------- */
.gp-left {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.gp-picture {
  display: block;
  padding: 5px;
  background: #000;
}
.gp-picture img {
  display: block;
  width: 150px;
  height: 150px;
  object-fit: cover;
  filter: grayscale(1) contrast(1.1);
  transition: filter 0.3s steps(8, end);
}
.gp-picture:hover img {
  filter: grayscale(0);
}
.gp-tick {
  height: 16px;
  background: #000;
}
.gp-tick--long {
  width: 80%;
  margin-top: 5px;
  padding-left: 5px;
  color: var(--foreground);
  font-size: 12px;
  line-height: 16px;
}
.gp-tick--short {
  width: 40%;
}

/* ---- données ------------------------------------------------ */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.gp-right {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}
/* Étiquettes blanches : nom, puis lien. */
.gp-tag {
  background: var(--foreground);
  color: #000;
  font-weight: 500;
  white-space: nowrap;
}
.gp-name {
  margin: 0 0 5px 6px;
  padding: 2px 20px 2px 7px;
  font-size: 19px;
}
.gp-link {
  padding: 2px 16px 2px 10px;
  font-size: 20px;
  transition: background 0.12s steps(2, end);
}
.gp-link:hover {
  background: var(--accent);
}
/* Bandeaux noirs, texte blanc, longueurs inégales. */
.gp-row {
  margin-left: 6px;
  padding: 2px 14px 2px 7px;
  background: #000;
  color: var(--foreground);
  font-size: 14px;
  line-height: 1.55;
}

/* ---- apparition en cascade ---------------------------------- */
.gp-app,
.gp-left {
  animation: gpIn 0.2s steps(3, end) both;
}
.gp-left {
  animation-delay: 0.08s;
}
@keyframes gpIn {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gp-app,
  .gp-left {
    animation: none;
  }
  .gp-picture img {
    transition: none;
  }
}
</style>
