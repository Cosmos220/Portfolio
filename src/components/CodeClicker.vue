<script setup lang="ts">
/* Clicker : on écrit des lignes de code à la main, puis on recrute des
   technologies qui en produisent toutes seules.

   Les améliorations ne sont pas inventées : elles sont dérivées de `stack`,
   la vraie liste de technologies du portfolio. Ajouter une techno à ses
   compétences l'ajoute donc au jeu, sans toucher à ce fichier. */
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { stack } from "../data/content";
import TechIcon from "./ui/TechIcon.vue";
import { sfxClick, sfxBuy, sfxUnlock } from "../composables/useChiptune";

const SAVE_KEY = "portfolio.clicker.v1";
/* Palier de coût classique : chaque exemplaire acheté renchérit le suivant,
   ce qui borne la progression sans jamais la bloquer. */
const COST_GROWTH = 1.15;

type Tech = {
  name: string;
  baseCost: number;
  rate: number; // lignes par seconde et par exemplaire
};

/* Coût et rendement croissent géométriquement le long de la liste : les
   premières technos sont accessibles tout de suite, les dernières demandent
   d'avoir construit une production. */
const techs: Tech[] = stack
  .flatMap((col) => col.items)
  .map((name, i) => ({
    name,
    baseCost: Math.round(15 * Math.pow(3.9, i)),
    rate: +(0.1 * Math.pow(3.1, i)).toFixed(3),
  }));

const lines = ref(0);
const owned = ref<number[]>(techs.map(() => 0));
const totalClicks = ref(0);
const soundOn = ref(true);

/* Les animations décoratives sont coupées si l'utilisateur a demandé moins
   de mouvement ; le jeu reste entièrement jouable. */
const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Nombres flottants « +N » émis à chaque clic. Ils se suppriment eux-mêmes :
   sans plafond ni nettoyage, un clic frénétique en accumulerait des milliers. */
type Float = { id: number; text: string; x: number; y: number };
const floats = ref<Float[]>([]);
let floatId = 0;

const pop = ref(false);
let popTimer: number | undefined;

/* Chaque techno distincte possédée rend le clic plus efficace : sans ça, le
   clic manuel devient inutile au bout de deux minutes. */
const perClick = computed(
  () => 1 + owned.value.filter((n) => n > 0).length,
);
const perSecond = computed(() =>
  techs.reduce((sum, t, i) => sum + t.rate * owned.value[i]!, 0),
);

function costOf(i: number): number {
  return Math.ceil(techs[i]!.baseCost * Math.pow(COST_GROWTH, owned.value[i]!));
}
function canAfford(i: number): boolean {
  return lines.value >= costOf(i);
}
function buy(i: number) {
  const c = costOf(i);
  if (lines.value < c) return;
  const premier = owned.value[i] === 0;
  lines.value -= c;
  owned.value[i]!++;
  if (soundOn.value) (premier ? sfxUnlock : sfxBuy)();
  save();
}
function click(e: MouseEvent) {
  lines.value += perClick.value;
  totalClicks.value++;
  if (soundOn.value) sfxClick();
  if (reduce) return;

  /* Pulsation du compteur, réarmée à chaque clic. Le retour à zéro passe par
     un minuteur et non par `requestAnimationFrame` : celui-ci est suspendu
     quand l'onglet n'est pas composité, ce qui figerait la classe. */
  pop.value = false;
  window.clearTimeout(popTimer);
  window.setTimeout(() => (pop.value = true), 0);
  popTimer = window.setTimeout(() => (pop.value = false), 160);

  /* Position relative au bouton, avec une dispersion horizontale pour que
     deux clics rapprochés ne se superposent pas exactement. */
  const btn = e.currentTarget as HTMLElement;
  const r = btn.getBoundingClientRect();
  const id = ++floatId;
  floats.value.push({
    id,
    text: `+${fmt(perClick.value)}`,
    x: e.clientX - r.left + (Math.random() * 28 - 14),
    y: e.clientY - r.top,
  });
  if (floats.value.length > 14) floats.value.shift();
  window.setTimeout(() => {
    floats.value = floats.value.filter((f) => f.id !== id);
  }, 700);
}

/* Une techno reste masquée tant qu'on n'a pas approché son prix : dévoiler
   les 13 lignes d'emblée noierait le joueur et écraserait la progression. */
const visibleCount = computed(() => {
  let n = 1;
  for (let i = 0; i < techs.length; i++) {
    if (owned.value[i]! > 0 || lines.value >= techs[i]!.baseCost * 0.55) {
      n = Math.min(techs.length, i + 2);
    }
  }
  return n;
});

// ─── Format des nombres ──────────────────────────────────────────────────
const UNITS = ["", "k", "M", "Md", "B"];

/* Compteurs et coûts : entiers. Un compteur qui affiche des décimales
   défilerait de façon illisible pendant la production passive. */
function fmt(n: number): string {
  if (n < 1000) return String(Math.floor(n));
  let u = 0;
  let v = n;
  while (v >= 1000 && u < UNITS.length - 1) {
    v /= 1000;
    u++;
  }
  return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0).replace(".", ",")} ${UNITS[u]}`;
}

/* Taux : les premières technos produisent moins d'une ligne par seconde
   (0,1/s). Les arrondir à l'entier afficherait « +0/s » et laisserait croire
   que l'achat ne sert à rien. */
function fmtRate(n: number): string {
  if (n === 0) return "0";
  if (n < 10) return n.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
  return fmt(n);
}

// ─── Boucle & sauvegarde ─────────────────────────────────────────────────
let tickIv: number | undefined;
let saveIv: number | undefined;
let last = 0;

function save() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        lines: lines.value,
        owned: owned.value,
        totalClicks: totalClicks.value,
        soundOn: soundOn.value,
      }),
    );
  } catch {
    /* Mode privé ou quota plein : le jeu reste jouable, sans sauvegarde. */
  }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.lines === "number" && Number.isFinite(s.lines)) {
      lines.value = Math.max(0, s.lines);
    }
    if (Array.isArray(s.owned)) {
      /* La sauvegarde peut être plus courte ou plus longue que la liste
         actuelle si la stack a changé depuis : on recale par index. */
      owned.value = techs.map((_, i) =>
        Number.isFinite(s.owned[i]) ? Math.max(0, Math.floor(s.owned[i])) : 0,
      );
    }
    if (typeof s.totalClicks === "number") {
      totalClicks.value = Math.max(0, s.totalClicks);
    }
    if (typeof s.soundOn === "boolean") soundOn.value = s.soundOn;
  } catch {
    /* Sauvegarde corrompue : on repart de zéro plutôt que de planter. */
  }
}

const confirmReset = ref(false);
function reset() {
  lines.value = 0;
  owned.value = techs.map(() => 0);
  totalClicks.value = 0;
  confirmReset.value = false;
  save();
}

onMounted(() => {
  load();
  last = performance.now();
  /* Le revenu passif se calcule sur le temps RÉELLEMENT écoulé, pas sur un
     nombre de ticks : si l'onglet passe en arrière-plan, le navigateur
     espace les minuteurs et un simple `+= rate/10` sous-compterait. */
  tickIv = window.setInterval(() => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    if (perSecond.value > 0) lines.value += perSecond.value * dt;
  }, 100);
  saveIv = window.setInterval(save, 5000);
});

/* Le réglage du son doit survivre au rechargement sans attendre la
   sauvegarde périodique : on l'écrit dès qu'il change. */
watch(soundOn, save);

onBeforeUnmount(() => {
  window.clearInterval(tickIv);
  window.clearInterval(saveIv);
  window.clearTimeout(popTimer);
  save();
});
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-8">
    <!-- Compteur + bouton -->
    <div class="panel relative flex flex-col items-center justify-center p-8 text-center">
      <button
        type="button"
        class="clk-sound"
        :aria-pressed="soundOn"
        :title="soundOn ? 'Couper le son' : 'Activer le son'"
        @click="soundOn = !soundOn"
      >
        {{ soundOn ? "SON ON" : "SON OFF" }}
      </button>

      <p class="clk-label">Lignes de code</p>
      <p class="clk-count" :class="{ 'is-pop': pop }">{{ fmt(lines) }}</p>
      <p class="clk-rate">
        {{ fmtRate(perSecond) }} / s · {{ fmt(perClick) }} par clic
      </p>

      <button type="button" class="clk-btn" @click="click">
        Écrire du code
        <span
          v-for="f in floats"
          :key="f.id"
          class="clk-float"
          :style="{ left: `${f.x}px`, top: `${f.y}px` }"
          >{{ f.text }}</span
        >
      </button>

      <p class="clk-meta">{{ fmt(totalClicks) }} clics au total</p>
    </div>

    <!-- Technologies -->
    <div class="panel p-6 sm:p-7">
      <p class="clk-label mb-4">Recruter une techno</p>

      <ul class="flex flex-col gap-2">
        <li v-for="(t, i) in techs.slice(0, visibleCount)" :key="t.name">
          <button
            type="button"
            class="clk-tech"
            :disabled="!canAfford(i)"
            @click="buy(i)"
          >
            <span class="clk-tech-label">
              <TechIcon :name="t.name" :size="15" />
              <span class="clk-tech-name">{{ t.name }}</span>
            </span>
            <span v-if="owned[i]" class="clk-tech-owned">×{{ owned[i] }}</span>
            <span class="clk-tech-rate">+{{ fmtRate(t.rate) }}/s</span>
            <span class="clk-tech-cost">{{ fmt(costOf(i)) }}</span>
          </button>
        </li>
      </ul>

      <p v-if="visibleCount < techs.length" class="clk-hint">
        Continuez : {{ techs.length - visibleCount }} techno{{
          techs.length - visibleCount > 1 ? "s" : ""
        }}
        encore à débloquer.
      </p>

      <div class="clk-reset">
        <button
          v-if="!confirmReset"
          type="button"
          class="clk-reset-btn"
          @click="confirmReset = true"
        >
          Recommencer
        </button>
        <template v-else>
          <span class="clk-reset-ask">Tout effacer ?</span>
          <button type="button" class="clk-reset-btn" @click="reset">Oui</button>
          <button
            type="button"
            class="clk-reset-btn"
            @click="confirmReset = false"
          >
            Non
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clk-label {
  font-family: var(--font-silkscreen);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted-2);
}
.clk-count {
  margin-top: 0.6rem;
  transition: transform 0.08s steps(2, end);
  font-family: var(--font-silkscreen);
  font-size: clamp(2rem, 6vw, 3.25rem);
  line-height: 1.1;
  color: var(--foreground);
  /* Chiffres à chasse fixe : sans ça le compteur tremble à chaque incrément. */
  font-variant-numeric: tabular-nums;
}
/* Sursaut bref à chaque clic : le compteur doit réagir, sinon cliquer paraît
   sans effet une fois que la production passive fait défiler les chiffres. */
.clk-count.is-pop {
  transform: scale(1.06);
}
.clk-rate {
  margin-top: 0.5rem;
  font-family: var(--font-geist-mono);
  font-size: 12px;
  color: var(--muted);
}

.clk-btn {
  position: relative;
  overflow: visible;
  margin-top: 1.8rem;
  border: 2px solid var(--border-strong);
  background: var(--foreground);
  color: var(--accent-foreground);
  padding: 0.9rem 2rem;
  font-family: var(--font-silkscreen);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  box-shadow: 5px 5px 0 0 var(--border-strong);
  transition:
    transform 0.08s steps(2, end),
    box-shadow 0.08s steps(2, end);
}
.clk-btn:active {
  transform: translate(5px, 5px);
  box-shadow: 0 0 0 0 var(--border-strong);
}
.clk-meta {
  margin-top: 1.2rem;
  font-family: var(--font-geist-mono);
  font-size: 11px;
  color: var(--muted-2);
}

.clk-tech {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 0.55rem 0.75rem;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.1s steps(2, end),
    color 0.1s steps(2, end);
}
.clk-tech:hover:not(:disabled) {
  border-color: var(--accent);
}
.clk-tech:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.clk-tech-name {
  font-family: var(--font-silkscreen);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--foreground);
}
.clk-tech-owned,
.clk-tech-rate,
.clk-tech-cost {
  font-family: var(--font-geist-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.clk-tech-owned {
  color: var(--foreground);
}
.clk-tech-rate {
  color: var(--muted-2);
}
.clk-tech-cost {
  min-width: 5.5em;
  text-align: right;
  color: var(--muted);
}

.clk-hint {
  margin-top: 0.9rem;
  font-family: var(--font-geist-mono);
  font-size: 11px;
  color: var(--muted-2);
}

.clk-reset {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1.4rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}
.clk-reset-ask,
.clk-reset-btn {
  font-family: var(--font-silkscreen);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.clk-reset-ask {
  color: var(--muted-2);
}
.clk-reset-btn {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  transition: border-color 0.1s steps(2, end), color 0.1s steps(2, end);
}
.clk-reset-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Nombres flottants émis au point du clic. `pointer-events: none` est
   indispensable : ils naissent au-dessus du bouton et intercepteraient
   les clics suivants. */
.clk-float {
  position: absolute;
  pointer-events: none;
  font-family: var(--font-silkscreen);
  font-size: 13px;
  color: var(--foreground);
  text-shadow: 0 0 3px #000;
  animation: clkFloat 0.7s steps(7, end) forwards;
}
@keyframes clkFloat {
  from {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -280%);
  }
}

/* Interrupteur de son, discret dans un coin du panneau. */
.clk-sound {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted-2);
  padding: 0.25rem 0.5rem;
  font-family: var(--font-silkscreen);
  font-size: 9px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    border-color 0.1s steps(2, end),
    color 0.1s steps(2, end);
}
.clk-sound:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.clk-sound[aria-pressed="true"] {
  color: var(--foreground);
  border-color: var(--border-strong);
}

/* Logo + nom alignés dans la première colonne de la grille. */
.clk-tech-label {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  color: var(--muted);
}
.clk-tech:hover:not(:disabled) .clk-tech-label {
  color: var(--foreground);
}

@media (prefers-reduced-motion: reduce) {
  .clk-count,
  .clk-count.is-pop {
    transform: none;
    transition: none;
  }
  .clk-float {
    display: none;
  }
}
</style>
