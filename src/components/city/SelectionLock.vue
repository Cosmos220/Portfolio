<script setup lang="ts">
/* Sélection des bâtiments du réseau de surveillance (ctOS).

   Trois rôles :
   · REPÉRAGE — survoler un des cinq bâtiments « CAM-00n » les identifie
     (cadre filaire + faisceau côté 3D, fiche BUILDING IDENTIFIED côté HTML) ;
     cliquer verrouille la cible et lance la prise de contrôle de sa caméra ;
   · RUBRIQUE COURANTE — en vue aérienne, le bâtiment de la rubrique visible
     reste encadré, pour qu'on sente qu'un lieu est sélectionné ;
   · CAMÉRA ACTIVE — en mode caméra, le bâtiment surveillé reste verrouillé.

   La ville est un canvas DERRIÈRE le contenu : elle ne reçoit aucun évènement.
   On écoute donc le pointeur sur la fenêtre, et on n'interroge la ville que si
   le pointeur est sur du « fond » (aucun lien, bouton, carte, texte, image,
   panneau…). Le tir de rayon (`pick`) ignore en plus tout bâtiment masqué par
   un autre. Résultat : pas de faux positif, et rien d'inutilisable. */
import { computed, inject, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Ref } from "vue";
import {
  camById, camForRubric, cityState, connectCamera, getCityRenderer,
} from "../../city/state";
import type { Building, CamRubric, CityCam } from "../../city/generate";

const loading = inject<Ref<boolean>>("loading", ref(false));
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Tout ce qui est du contenu ou de l'interface : jamais une cible 3D. */
const CONTENT =
  "a,button,input,textarea,select,label,summary,iframe,dialog,[role=dialog],[role=button]," +
  "[data-no-city],.panel,article,header,footer,nav,aside,p,h1,h2,h3,h4,h5,h6,li,img,svg," +
  "video,figure,form,table,pre,code,blockquote,.chip";

const DISTRICT: Record<string, string> = {
  centre: "CENTRAL", nord: "NORTH", docks: "DOCKS", industrie: "INDUSTRIAL", peripherie: "OUTSKIRTS",
};

const shown = shallowRef<CityCam | null>(null); // bâtiment encadré
const pos = ref({ x: 0, y: 0, on: false });
const card = ref({ x: 0, y: 0 });
const lockKey = ref(0);
let timer = 0;
let raf = 0;
let last: PointerEvent | null = null;

const hover = computed(() => (cityState.surv.hover ? camById(cityState.surv.hover) ?? null : null));
const busy = computed(() => cityState.surv.phase === "accessing" || cityState.surv.phase === "switching");
const rubricLabel = computed(() => shown.value?.label ?? "");

/* Que faut-il encadrer ? Priorité : caméra active, puis survol, puis rubrique. */
function wanted(): CityCam | null {
  if (loading.value || !cityState.ready) return null;
  const s = cityState.surv;
  if (s.id && (s.mode === "camera" || busy.value)) return camById(s.id) ?? null;
  if (hover.value) return hover.value;
  const rubric = cityState.station as CamRubric;
  return camForRubric(rubric) ?? null;
}

function update() {
  const r = getCityRenderer();
  const t = shown.value;
  if (!r || !t) return;
  const b: Building = t.building;
  const p = r.project(b.x, b.h * 0.55, b.z);
  const m = 60;
  const inside = p.x > m && p.x < window.innerWidth - m && p.y > 90 && p.y < window.innerHeight - m;
  pos.value = { x: p.x, y: p.y, on: p.on && inside };
}

function apply() {
  const r = getCityRenderer();
  if (!r) return;
  const next = wanted();
  if (next?.id !== shown.value?.id) lockKey.value++;
  shown.value = next;
  r.select(next ? next.building : null);
  window.clearInterval(timer);
  if (next && !reduce) timer = window.setInterval(update, 66);
  if (next) update();
}

watch(
  () => [
    cityState.station, cityState.ready, loading.value, cityState.quality,
    cityState.surv.mode, cityState.surv.id, cityState.surv.hover, cityState.surv.phase,
  ] as const,
  apply,
  { immediate: true },
);

/* ---- Pointeur ------------------------------------------------------ */
function eligible(e: PointerEvent | MouseEvent): boolean {
  if (loading.value || !cityState.ready) return false;
  if (cityState.surv.mode !== "aerial" || busy.value) return false;
  const t = e.target as Element | null;
  if (!t || t.closest?.(CONTENT)) return false;
  return true;
}

function probe() {
  raf = 0;
  const e = last;
  const r = getCityRenderer();
  if (!e || !r) return;
  if (!eligible(e) || e.buttons) {
    if (cityState.surv.hover) cityState.surv.hover = null;
    return;
  }
  const id = r.pick(e.clientX, e.clientY);
  if (id !== cityState.surv.hover) cityState.surv.hover = id;
  card.value = { x: e.clientX, y: e.clientY };
}

function onMove(e: PointerEvent) {
  if (e.pointerType === "touch") return;
  last = e;
  if (!raf) raf = requestAnimationFrame(probe);
}

function onClick(e: MouseEvent) {
  if (!eligible(e)) return;
  /* Une sélection de texte en cours n'est pas un clic sur la ville. */
  if (!window.getSelection()?.isCollapsed) return;
  const r = getCityRenderer();
  const id = r?.pick(e.clientX, e.clientY);
  if (id) connectCamera(id);
}

function onLeave() {
  if (cityState.surv.hover) cityState.surv.hover = null;
}

onMounted(() => {
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("click", onClick);
  document.documentElement.addEventListener("pointerleave", onLeave);
});
onBeforeUnmount(() => {
  window.clearInterval(timer);
  cancelAnimationFrame(raf);
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("click", onClick);
  document.documentElement.removeEventListener("pointerleave", onLeave);
  cityState.surv.hover = null;
  getCityRenderer()?.select(null);
});

const visible = computed(() => !!shown.value && pos.value.on);
const linkText = computed(() => {
  const s = cityState.surv;
  if (s.mode === "camera") return "FLUX ACTIF";
  if (busy.value) return "CONNEXION…";
  return "LIAISON ÉTABLIE";
});
const cardStyle = computed(() => ({
  transform: `translate(${Math.min(card.value.x + 22, window.innerWidth - 230)}px, ${Math.min(card.value.y + 18, window.innerHeight - 140)}px)`,
}));
</script>

<template>
  <!-- Cadre posé sur le bâtiment encadré -->
  <div
    v-if="visible && shown"
    :key="lockKey"
    class="sl"
    aria-hidden="true"
    :style="{ transform: `translate(${pos.x}px, ${pos.y}px)` }"
  >
    <span class="sl-frame sys-brackets" />
    <p class="sl-tag">
      <span class="sl-id">{{ shown.id }}</span>
      <span class="sl-name">{{ rubricLabel }}</span>
      <span class="sl-link"><i /> {{ linkText }}</span>
    </p>
  </div>

  <!-- Fiche de profilage, au survol d'un bâtiment du réseau -->
  <div v-if="hover && !busy" class="sl-card" aria-hidden="true" :style="cardStyle">
    <p class="sl-card-h">BUILDING IDENTIFIED</p>
    <p><span>ID</span>{{ hover.id }}</p>
    <p><span>TARGET</span>{{ hover.label }}</p>
    <p><span>DISTRICT</span>{{ DISTRICT[hover.district] }}</p>
    <p><span>CAMERA</span><b>AVAILABLE</b></p>
    <p><span>SIGNAL</span>{{ cityState.surv.signal }}%</p>
    <p class="sl-card-f">Cliquer pour accéder à la caméra</p>
  </div>
</template>

<style scoped>
.sl {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 30;
  pointer-events: none;
  transition: transform 0.07s linear;
}
.sl-frame {
  --bk: 12px;
  position: absolute;
  left: -34px;
  top: -34px;
  width: 68px;
  height: 68px;
  color: var(--cyan);
  animation: sl-lock 0.5s steps(6, end) 1;
}
@keyframes sl-lock {
  0% { transform: scale(2.6); opacity: 0; }
  60% { opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.sl-tag {
  position: absolute;
  left: 44px;
  top: -30px;
  margin: 0;
  display: grid;
  gap: 2px;
  min-width: 9.5rem;
  padding: 6px 8px;
  font-family: var(--font-silkscreen);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: rgba(6, 6, 6, 0.82);
  border: 1px solid var(--border-strong);
  border-left: 2px solid var(--cyan);
  animation: sl-tag 0.6s steps(6, end) 1;
}
@keyframes sl-tag {
  0%, 40% { opacity: 0; }
  100% { opacity: 1; }
}
.sl-id { color: var(--cyan); }
.sl-name { color: var(--foreground); font-size: 11px; }
.sl-link { color: var(--muted-2); display: flex; align-items: center; gap: 5px; }
.sl-link i {
  width: 5px;
  height: 5px;
  background: var(--cyan);
}

.sl-card {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 31;
  width: 13.5rem;
  margin: 0;
  padding: 8px 10px;
  pointer-events: none;
  font-family: var(--font-silkscreen);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--foreground);
  background: rgba(6, 6, 6, 0.88);
  border: 1px solid var(--border-strong);
  border-left: 2px solid var(--cyan);
  animation: sl-tag 0.4s steps(5, end) 1;
}
.sl-card p {
  margin: 2px 0;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.sl-card span { color: var(--muted-2); }
.sl-card b { color: var(--cyan); font-weight: normal; }
.sl-card .sl-card-h { color: var(--cyan); margin-bottom: 5px; }
.sl-card .sl-card-f { display: block; margin-top: 6px; color: var(--muted); }

@media (prefers-reduced-motion: reduce) {
  .sl, .sl-frame, .sl-tag, .sl-card { animation: none; transition: none; }
}
@media (max-width: 767px) {
  .sl-tag { display: none; }
}
</style>
