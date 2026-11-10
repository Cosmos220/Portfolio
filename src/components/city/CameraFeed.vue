<script setup lang="ts">
/* Interface du réseau de surveillance.

   · Réseau (liste des 5 caméras) : toujours disponible, au clavier comme à la
     souris — c'est aussi la voie d'accès sur mobile, où il n'y a pas de survol.
   · Phases de la prise de contrôle : « CAMERA ACCESSING », interférence brève
     pendant le changement de point de vue, « CAMERA CONNECTED ».
   · Mode caméra : cadre vidéo (CamFrame), fiche d'état et retour à la vue
     aérienne (bouton ou Échap).

   Le contenu de la rubrique, lui, reste la page habituelle : la caméra ne fait
   que changer le point de vue et ouvrir la bonne rubrique. */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import CamFrame from "../ui/CamFrame.vue";
import {
  cityState, connectCamera, exitCamera, getCams, setCamNavigator,
} from "../../city/state";
import { RUBRICS, useRubrics } from "../../composables/useRubrics";

const { go } = useRubrics();
const open = ref(false);

const DISTRICT: Record<string, string> = {
  centre: "CENTRAL", nord: "NORTH", docks: "DOCKS", industrie: "INDUSTRIAL", peripherie: "OUTSKIRTS",
};

const surv = cityState.surv;
const cams = computed(() => getCams());
const current = computed(() => cams.value.find((c) => c.id === surv.id) ?? null);
const live = computed(() => surv.mode === "camera");
const coords = computed(() => {
  const c = current.value;
  return c ? `X ${Math.round(c.pos[0])}  Z ${Math.round(c.pos[2])}  ALT ${Math.round(c.pos[1])}` : "";
});
const message = computed(() => {
  if (surv.phase === "accessing") return "CAMERA ACCESSING";
  if (surv.phase === "connected") return "CAMERA CONNECTED";
  return "";
});

function pick(id: string) {
  connectCamera(id);
  if (window.innerWidth < 1024) open.value = false;
}

function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape" || surv.mode !== "camera") return;
  /* Les fenêtres (terminal, menu) gèrent leur propre Échap en premier. */
  if (document.querySelector("[role=dialog]")) return;
  e.preventDefault();
  exitCamera();
}

/* Rubrique révélée par à-coups à l'arrivée sur la caméra. */
let revealTimer = 0;
watch(
  () => surv.phase,
  (p) => {
    if (p !== "connected") return;
    const root = document.documentElement;
    root.classList.add("cam-reveal");
    window.clearTimeout(revealTimer);
    revealTimer = window.setTimeout(() => root.classList.remove("cam-reveal"), 700);
    if (window.innerWidth >= 1024) open.value = true;
  },
);

onMounted(() => {
  window.addEventListener("keydown", onKey);
  setCamNavigator((rubric) => {
    const r = RUBRICS.find((x) => x.id === rubric);
    if (r) void go(r, true);
  });
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  window.clearTimeout(revealTimer);
  setCamNavigator(null);
  document.documentElement.classList.remove("cam-reveal");
});
</script>

<template>
  <!-- Cadre vidéo, sous l'en-tête : le contenu reste lisible -->
  <div v-if="live && current" class="cf-frame" aria-hidden="true">
    <CamFrame class="cf-cam" :cam="current.id" :caption="current.label" />
  </div>

  <!-- Interférence pendant le changement de point de vue -->
  <div v-if="surv.phase === 'switching'" class="cf-glitch" aria-hidden="true" />

  <!-- Phases de connexion -->
  <p v-if="message" :key="message" class="cf-msg" role="status">
    <i class="cf-msg-dot" />{{ message }}<span class="cf-dots" aria-hidden="true" />
  </p>

  <!-- Réseau de surveillance -->
  <aside class="cf-net" aria-label="Réseau de surveillance">
    <button
      type="button"
      class="cf-toggle"
      :aria-expanded="open"
      aria-controls="cf-list"
      @click="open = !open"
    >
      <span class="cf-live" :class="{ 'is-on': live }"><i />{{ live ? "LIVE" : "NET" }}</span>
      SURVEILLANCE · {{ cams.length }} CAM
      <span aria-hidden="true">{{ open ? "−" : "+" }}</span>
    </button>

    <div v-if="open" id="cf-list" class="cf-body">
      <p class="cf-title">SURVEILLANCE NETWORK</p>
      <ul>
        <li v-for="(c, i) in cams" :key="c.id">
          <button
            type="button"
            class="cf-item"
            :class="{ 'is-current': surv.id === c.id && live }"
            :aria-current="surv.id === c.id && live ? 'true' : undefined"
            @click="pick(c.id)"
          >
            <span class="cf-n">{{ c.id }}</span>
            <span>/ {{ c.label }}</span>
            <span class="cf-sel" aria-hidden="true">{{ surv.id === c.id && live ? "●" : i + 1 }}</span>
          </button>
        </li>
      </ul>

      <dl v-if="live && current" class="cf-info">
        <div><dt>CAMERA ID</dt><dd>{{ current.id }}</dd></div>
        <div><dt>LOCATION</dt><dd>DISTRICT / {{ DISTRICT[current.district] }}</dd></div>
        <div><dt>STATUS</dt><dd class="is-cyan">LIVE</dd></div>
        <div><dt>SIGNAL</dt><dd>{{ surv.signal }}%</dd></div>
        <div><dt>ACCESS</dt><dd class="is-cyan">GRANTED</dd></div>
        <div><dt>COORD</dt><dd>{{ coords }}</dd></div>
      </dl>

      <button v-if="live" type="button" class="cf-exit" @click="exitCamera">
        Vue aérienne <kbd>Échap</kbd>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* ---- Cadre vidéo ------------------------------------------------ */
.cf-frame {
  position: fixed;
  inset: 4.2rem 0.75rem 0.75rem;
  z-index: 20;
  pointer-events: none;
  opacity: 0.75;
}
.cf-frame .cf-cam {
  position: absolute;
  inset: 0;
}

/* ---- Interférence : bandes et clignotements par crans ------------- */
.cf-glitch {
  position: fixed;
  inset: 0;
  z-index: 90;
  pointer-events: none;
  background:
    repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 0 2px, transparent 2px 5px),
    rgba(0, 0, 0, 0.55);
  animation: cf-glitch 0.38s steps(1, end) 1;
}
@keyframes cf-glitch {
  0% { opacity: 1; clip-path: inset(0 0 60% 0); }
  20% { opacity: 0.85; clip-path: inset(30% 0 20% 0); transform: translateX(6px); }
  40% { opacity: 1; clip-path: inset(0); transform: translateX(-5px); }
  60% { opacity: 0.7; clip-path: inset(55% 0 0 0); transform: none; }
  80% { opacity: 1; clip-path: inset(0); }
  100% { opacity: 0; }
}

/* ---- Messages d'état -------------------------------------------- */
.cf-msg {
  position: fixed;
  left: 50%;
  bottom: 3.2rem;
  z-index: 60;
  margin: 0;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 7px 14px;
  font-family: var(--font-silkscreen);
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--cyan);
  background: rgba(6, 6, 6, 0.88);
  border: 1px solid var(--border-strong);
  border-left: 2px solid var(--cyan);
  pointer-events: none;
  animation: cf-pop 0.3s steps(4, end) 1;
}
@keyframes cf-pop {
  from { opacity: 0; }
  to { opacity: 1; }
}
.cf-msg-dot {
  width: 6px;
  height: 6px;
  background: var(--cyan);
  animation: cf-blink 0.8s steps(1, end) infinite;
}
@keyframes cf-blink { 50% { opacity: 0; } }
.cf-dots::after {
  content: "";
  animation: cf-dots 1s steps(1, end) infinite;
}
@keyframes cf-dots {
  0% { content: ""; }
  25% { content: "."; }
  50% { content: ".."; }
  75% { content: "..."; }
}

/* ---- Réseau ------------------------------------------------------ */
.cf-net {
  position: fixed;
  right: 1rem;
  top: 5rem;
  z-index: 45;
  width: 15rem;
  font-family: var(--font-silkscreen);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
@media (max-width: 767px) {
  .cf-net { top: auto; bottom: 4.2rem; right: 0.75rem; width: 14rem; }
}
.cf-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 6px 9px;
  color: var(--foreground);
  background: rgba(6, 6, 6, 0.86);
  border: 1px solid var(--border-strong);
  cursor: pointer;
}
.cf-toggle:hover,
.cf-toggle:focus-visible { border-color: var(--cyan); }
.cf-live { display: inline-flex; align-items: center; gap: 5px; color: var(--muted-2); }
.cf-live i { width: 6px; height: 6px; background: var(--muted-2); }
.cf-live.is-on { color: var(--cyan); }
.cf-live.is-on i { background: var(--cyan); animation: cf-blink 1.2s steps(1, end) infinite; }
.cf-body {
  padding: 8px;
  background: rgba(6, 6, 6, 0.9);
  border: 1px solid var(--border);
  border-top: 0;
  animation: cf-pop 0.25s steps(4, end) 1;
}
.cf-title { margin: 0 0 6px; color: var(--muted-2); }
.cf-body ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; }
.cf-item {
  display: flex;
  width: 100%;
  gap: 0.5rem;
  align-items: center;
  padding: 5px 6px;
  color: var(--muted);
  text-align: left;
  border: 1px solid transparent;
  cursor: pointer;
}
.cf-item:hover,
.cf-item:focus-visible { color: var(--foreground); border-color: var(--border-strong); }
.cf-item.is-current { color: var(--foreground); border-color: var(--cyan); }
.cf-n { color: var(--cyan); }
.cf-sel { margin-left: auto; color: var(--muted-2); }
.cf-item.is-current .cf-sel { color: var(--cyan); }
.cf-info { margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--border); display: grid; gap: 2px; }
.cf-info div { display: flex; justify-content: space-between; gap: 0.6rem; }
.cf-info dt { color: var(--muted-2); }
.cf-info dd { margin: 0; color: var(--foreground); text-align: right; }
.cf-info dd.is-cyan { color: var(--cyan); }
.cf-exit {
  margin-top: 8px;
  width: 100%;
  padding: 6px;
  color: var(--cyan);
  border: 1px solid var(--cyan);
  cursor: pointer;
}
.cf-exit:hover,
.cf-exit:focus-visible { background: var(--cyan); color: #021018; }
.cf-exit kbd { margin-left: 6px; opacity: 0.7; font: inherit; }

@media (prefers-reduced-motion: reduce) {
  .cf-glitch { animation: none; opacity: 0.4; }
  .cf-msg, .cf-body, .cf-msg-dot, .cf-live.is-on i, .cf-dots::after { animation: none; }
}
</style>
