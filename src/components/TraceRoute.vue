<script setup lang="ts">
/* Établissement de la connexion, façon trace réseau : les lignes
   s'impriment l'une après l'autre quand le bloc entre à l'écran.

   Les chiffres ne sont pas décoratifs : la latence est MESURÉE (un vrai
   aller-retour vers ce site, depuis le navigateur du visiteur), et la ligne
   de chiffrement dit la vérité — « non chiffré » en développement local.
   Un faux « 12 ms » figé aurait l'air tout aussi bien, mais ce serait un
   mensonge sur un site qui parle de sécurité. */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { profile } from "../data/content";

const root = ref<HTMLElement | null>(null);
const shown = ref(0);
const latency = ref<string>("…");

const host = typeof location !== "undefined" ? location.hostname : "";
const secure = typeof location !== "undefined" && location.protocol === "https:";

const lines = computed(() => [
  { text: `> ping ${host}`, dim: false },
  { text: `  réponse en ${latency.value}`, dim: true },
  { text: `> chiffrement ${secure ? "TLS ........ OK" : "........ désactivé (local)"}`, dim: false },
  { text: `> destinataire : ${profile.firstName} ${profile.lastName}`, dim: false },
  { text: "CONNEXION ÉTABLIE", dim: false, final: true },
]);

const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const timers: number[] = [];
let obs: IntersectionObserver | null = null;

/* Mesure un aller-retour réel vers l'origine du site. `no-store` évite de
   mesurer le cache du navigateur, qui répondrait en 0 ms. */
async function measure() {
  try {
    const t0 = performance.now();
    const base = import.meta.env.BASE_URL;
    await fetch(`${base}favicon.svg?ping=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
    });
    latency.value = `${Math.max(1, Math.round(performance.now() - t0))} ms`;
  } catch {
    latency.value = "indisponible";
  }
}

function start() {
  void measure();
  if (reduce) {
    shown.value = lines.value.length;
    return;
  }
  lines.value.forEach((_, i) => {
    timers.push(window.setTimeout(() => (shown.value = i + 1), 220 + i * 340));
  });
}

onMounted(() => {
  if (!root.value) return;
  obs = new IntersectionObserver(
    ([e]) => {
      if (!e?.isIntersecting) return;
      obs?.disconnect();
      start();
    },
    { threshold: 0.4 },
  );
  obs.observe(root.value);
});
onBeforeUnmount(() => {
  obs?.disconnect();
  timers.forEach((t) => window.clearTimeout(t));
});
</script>

<template>
  <div ref="root" class="tr" role="status" aria-live="polite">
    <!-- Toutes les lignes restent dans le flux et sont seulement masquées
         (`visibility`) jusqu'à leur tour : le bloc garde sa hauteur finale
         dès le départ, au lieu de grandir ligne par ligne et de pousser le
         contenu en dessous à chaque impression. -->
    <p
      v-for="(l, i) in lines"
      :key="i"
      class="tr-line"
      :class="{
        'is-dim': l.dim,
        'is-final': l.final,
        'is-hidden': i >= shown,
      }"
    >
      {{ l.text }}<span v-if="l.final" class="tr-caret">_</span>
    </p>
  </div>
</template>

<style scoped>
.tr {
  position: relative;
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 0.9rem 1rem;
  font-family: var(--font-geist-mono);
  font-size: 12px;
  line-height: 1.7;
  color: var(--foreground);
}
.tr-line {
  margin: 0;
  white-space: pre-wrap;
}
.tr-line.is-dim {
  color: var(--muted);
}
.tr-line.is-final {
  margin-top: 0.4rem;
  font-family: var(--font-silkscreen);
  font-size: 11px;
  letter-spacing: 0.08em;
}
.tr-caret {
  animation: trBlink 1.06s steps(1, end) infinite;
}
@keyframes trBlink {
  0%,
  50% {
    opacity: 1;
  }
  50.01%,
  100% {
    opacity: 0;
  }
}

.tr-line.is-hidden {
  visibility: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .tr-caret {
    animation: none;
  }
}
</style>
