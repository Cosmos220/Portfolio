<script setup lang="ts">
/* Fenêtre modale, au vocabulaire du thème : angles vifs, ombre pleine.

   Elle est téléportée dans <body> : rendue sur place, elle serait rognée par
   le `overflow: hidden` des sections et par les `transform` des parallaxes,
   qui créent un nouveau contexte de positionnement. */
import { ref, watch, onBeforeUnmount, nextTick } from "vue";

const props = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();

const closeBtn = ref<HTMLButtonElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}

/* Le défilement de la page est bloqué pendant l'ouverture. On réutilise la
   classe de Lenis, déjà définie en CSS (`overflow: hidden`), ce qui marche
   aussi quand le défilement fluide est désactivé. */
function lockScroll(lock: boolean) {
  document.documentElement.classList.toggle("lenis-stopped", lock);
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      lockScroll(true);
      document.addEventListener("keydown", onKeydown);
      await nextTick();
      closeBtn.value?.focus();
    } else {
      lockScroll(false);
      document.removeEventListener("keydown", onKeydown);
      /* On rend le focus au déclencheur : sans ça, il repart en haut de page
         et la navigation au clavier redémarre de zéro. */
      previouslyFocused?.focus?.();
    }
  },
);

onBeforeUnmount(() => {
  lockScroll(false);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="mdl-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click.self="emit('close')"
    >
      <div class="mdl-panel">
        <header class="mdl-head">
          <h2 class="mdl-title">{{ title }}</h2>
          <button
            ref="closeBtn"
            type="button"
            class="mdl-close"
            aria-label="Fermer"
            @click="emit('close')"
          >
            ✕
          </button>
        </header>

        <div class="mdl-body" data-lenis-prevent>
          <slot />
        </div>

        <footer v-if="$slots.footer" class="mdl-foot">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mdl-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 1rem;
  /* Voile opaque plutôt qu'un flou : le flou appartient au registre écarté. */
  background: rgba(0, 0, 0, 0.88);
}
.mdl-panel {
  display: flex;
  flex-direction: column;
  width: min(96vw, 60rem);
  /* La modale ne doit jamais dépasser l'écran : c'est son corps qui défile. */
  max-height: min(92vh, 60rem);
  background: var(--card);
  border: 2px solid var(--border-strong);
  box-shadow: 10px 10px 0 0 rgba(255, 255, 255, 0.1);
}
.mdl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 2px solid var(--border);
  padding: 0.9rem 1rem;
}
.mdl-title {
  margin: 0;
  font-family: var(--font-silkscreen);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--foreground);
}
.mdl-close {
  border: 2px solid var(--border);
  background: transparent;
  color: var(--muted);
  padding: 0.2rem 0.55rem;
  font-size: 13px;
  line-height: 1.2;
  cursor: pointer;
  transition:
    border-color 0.1s steps(2, end),
    color 0.1s steps(2, end);
}
.mdl-close:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.mdl-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.mdl-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 2px solid var(--border);
  padding: 0.8rem 1rem;
}
</style>
