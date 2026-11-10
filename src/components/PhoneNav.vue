<script setup lang="ts">
/* Menu « smartphone » : les rubriques comme des applications.

   Inspiré du téléphone de Watch Dogs 2 — une barre d'état (réseau, heure),
   puis une grille de tuiles. Chaque tuile s'ouvre comme un module : la ville
   vole vers son quartier et la page suit.

   Accessibilité : c'est un vrai dialogue (focus à l'ouverture, Échap pour
   fermer, retour du focus sur le bouton). Les mêmes rubriques restent
   accessibles directement dans l'en-tête sur grand écran : ce menu s'ajoute à
   la navigation, il ne la remplace pas. */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { cityState } from "../city/state";
import { DISTRICTS } from "../city/generate";
import { useRubrics, type Rubric, type RubricId } from "../composables/useRubrics";

const { rubrics, activeId, go } = useRubrics();

const open = ref(false);
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);

/* Heure affichée dans la barre d'état : l'heure réelle du visiteur. */
const clock = ref("");
let clockIv: number | undefined;
function tick() {
  const d = new Date();
  clock.value = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const sector = computed(() => {
  const d = DISTRICTS.find((x) => x.id === cityState.district);
  return d ? `Secteur ${d.code} · ${d.name}` : "";
});

async function openMenu() {
  open.value = true;
  await nextTick();
  panel.value?.querySelector<HTMLElement>("button.pn-tile")?.focus();
}
function closeMenu(restoreFocus = true) {
  open.value = false;
  if (restoreFocus) trigger.value?.focus();
}
function toggle() {
  if (open.value) closeMenu();
  else void openMenu();
}

function pick(r: Rubric) {
  closeMenu(false);
  void go(r);
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && open.value) {
    e.preventDefault();
    closeMenu();
  }
  /* Piège à focus minimal : Tab ne sort pas du panneau tant qu'il est ouvert. */
  if (e.key === "Tab" && open.value && panel.value) {
    const f = [...panel.value.querySelectorAll<HTMLElement>("button")];
    if (!f.length) return;
    const first = f[0]!;
    const last = f[f.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

onMounted(() => {
  tick();
  clockIv = window.setInterval(tick, 20_000);
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  window.clearInterval(clockIv);
  window.removeEventListener("keydown", onKey);
});

/* Pictogrammes : traits simples sur une grille de 24, sans dépendance. */
const ICONS: Record<RubricId, string> = {
  profil: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c0-4 3.6-7 8-7s8 3 8 7",
  projets: "M3 6h7l2 2h9v11H3V6Z",
  competences: "M6 6a2 2 0 1 0 0 .01M18 6a2 2 0 1 0 0 .01M12 18a2 2 0 1 0 0 .01M7.6 7.4l3.4 8.6M16.4 7.4 13 16M8 6h8",
  parcours: "M5 19a2 2 0 1 0 0 .01M19 5a2 2 0 1 0 0 .01M7 19h6a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h6",
  contact: "M12 13v8M9 21h6M7.5 8.5a6 6 0 0 1 9 0M4.5 5.5a10 10 0 0 1 15 0M10 11.5a2.5 2.5 0 0 1 4 0",
};
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="pn-btn"
    :class="{ 'is-open': open }"
    aria-haspopup="dialog"
    :aria-expanded="open"
    aria-label="Ouvrir le menu ctOS"
    @click="toggle"
  >
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M12 2.5 20.5 7.5v9L12 21.5 3.5 16.5v-9Z" fill="none" stroke="currentColor" stroke-width="1.8" />
      <rect x="10" y="10" width="4" height="4" fill="currentColor" />
    </svg>
    <span>ctOS</span>
  </button>

  <Teleport to="body">
    <div v-if="open" class="pn-layer" @click.self="closeMenu()">
      <div
        ref="panel"
        class="pn"
        role="dialog"
        aria-modal="true"
        aria-label="Menu ctOS : rubriques du portfolio"
      >
        <!-- Barre d'état -->
        <div class="pn-status" aria-hidden="true">
          <span class="pn-net">
            <i /><i /><i /><i />
            <b>ctOS</b>
          </span>
          <span>{{ clock }}</span>
        </div>

        <p class="pn-title">Applications</p>

        <div class="pn-grid">
          <button
            v-for="(r, i) in rubrics"
            :key="r.id"
            type="button"
            class="pn-tile"
            :class="{ 'is-active': activeId === r.id }"
            :style="{ animationDelay: `${i * 55}ms` }"
            @click="pick(r)"
          >
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
              <path :d="ICONS[r.id]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="pn-label">{{ r.label }}</span>
          </button>

        </div>

        <p class="pn-foot" aria-hidden="true">
          <span class="pn-dot" />
          {{ sector }}
        </p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pn-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--foreground);
  padding: 0.35rem 0.7rem;
  font-family: var(--font-silkscreen);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.1s steps(2, end), color 0.1s steps(2, end);
}
.pn-btn:hover,
.pn-btn:focus-visible,
.pn-btn.is-open {
  border-color: var(--cyan);
  color: var(--cyan);
}

.pn-layer {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: rgba(0, 0, 0, 0.55);
}

.pn {
  position: absolute;
  top: 4.4rem;
  right: 1rem;
  width: min(20.5rem, calc(100vw - 2rem));
  border: 1px solid var(--border-strong);
  background: rgba(3, 9, 17, 0.96);
  padding: 0.9rem 1rem 1rem;
  box-shadow: 8px 8px 0 0 rgba(62, 231, 255, 0.1);
  /* Ouverture : l'écran se déroule du haut, par crans. */
  animation: pnOpen 0.42s steps(8, end) both;
}
@keyframes pnOpen {
  from {
    clip-path: inset(0 0 100% 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

.pn-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-geist-mono);
  font-size: 11px;
  color: var(--muted);
}
.pn-net {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
}
.pn-net i {
  display: block;
  width: 3px;
  background: var(--cyan);
}
.pn-net i:nth-child(1) { height: 4px; }
.pn-net i:nth-child(2) { height: 7px; }
.pn-net i:nth-child(3) { height: 10px; }
.pn-net i:nth-child(4) { height: 13px; }
.pn-net b {
  margin-left: 0.5rem;
  align-self: center;
  font-weight: 400;
  letter-spacing: 0.08em;
  color: var(--cyan);
}

.pn-title {
  margin: 0.8rem 0 0.6rem;
  font-family: var(--font-silkscreen);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.pn-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.55rem;
}

.pn-tile {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  padding: 0.9rem 0.2rem 0.7rem;
  border: 0;
  color: var(--foreground);
  background: rgba(62, 231, 255, 0.06);
  box-shadow: inset 0 0 0 1px var(--border-strong);
  /* Coins coupés en diagonale : la forme des icônes d'application du jeu. */
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  cursor: pointer;
  opacity: 0;
  animation: pnTile 0.25s steps(4, end) forwards;
  transition: background-color 0.1s steps(2, end), color 0.1s steps(2, end);
}
@keyframes pnTile {
  to {
    opacity: 1;
  }
}
.pn-tile:hover,
.pn-tile:focus-visible {
  background: rgba(62, 231, 255, 0.16);
  color: var(--cyan);
  outline: none;
}
.pn-tile:focus-visible {
  box-shadow: inset 0 0 0 2px var(--cyan);
}
.pn-tile.is-active {
  background: var(--cyan);
  color: #021018;
  box-shadow: none;
}
.pn-tile.is-tool {
  background: rgba(255, 255, 255, 0.04);
}
.pn-label {
  font-family: var(--font-silkscreen);
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pn-foot {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.9rem 0 0;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border);
  font-family: var(--font-geist-mono);
  font-size: 11px;
  color: var(--muted);
}
.pn-dot {
  width: 6px;
  height: 6px;
  background: var(--cyan);
}

/* Petit écran : le panneau devient un volet plein largeur sous l'en-tête. */
@media (max-width: 520px) {
  .pn {
    top: 4rem;
    left: 0.5rem;
    right: 0.5rem;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pn {
    animation: none;
  }
  .pn-tile {
    animation: none;
    opacity: 1;
  }
}
</style>
