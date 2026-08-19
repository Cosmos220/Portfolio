<script setup lang="ts">
/* Deux actions sur le CV : le consulter sans quitter la page, ou le
   télécharger. */
import { ref } from "vue";
import Modal from "./ui/Modal.vue";
import { cvUrl, cvFileName } from "../data/assets";

const open = ref(false);

/* iOS et la plupart des navigateurs mobiles refusent d'afficher un PDF dans
   une <iframe> : le cadre reste blanc, sans message. On y propose donc
   directement l'ouverture dans un onglet plutôt qu'un cadre vide. */
const isMobile =
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <button type="button" class="btn-ghost" @click="open = true">
      Voir mon CV
    </button>

    <a :href="cvUrl" :download="cvFileName" class="btn-ghost">
      Télécharger
      <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" aria-hidden="true">
        <path
          d="M8 3v7m0 0 3-3m-3 3L5 7M3 12h10"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </a>

    <Modal :open="open" title="CV — Loïck Davi" @close="open = false">
      <div v-if="isMobile" class="cv-fallback">
        <p>
          L'aperçu intégré n'est pas pris en charge sur mobile. Ouvrez le CV
          dans un nouvel onglet ou téléchargez-le.
        </p>
        <a :href="cvUrl" target="_blank" rel="noopener noreferrer" class="btn-ghost">
          Ouvrir le PDF
        </a>
      </div>
      <iframe
        v-else
        :src="cvUrl"
        class="cv-frame"
        title="CV de Loïck Davi"
      />

      <template #footer>
        <a
          :href="cvUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="cv-link"
        >
          Ouvrir dans un onglet
        </a>
        <a :href="cvUrl" :download="cvFileName" class="btn-ghost">Télécharger</a>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.cv-frame {
  display: block;
  width: 100%;
  /* Hauteur fixe : le corps de la modale gère déjà le débordement, et une
     <iframe> ne peut pas se dimensionner sur le contenu d'un PDF. */
  height: min(76vh, 48rem);
  border: 0;
  background: var(--surface);
}
.cv-fallback {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  font-size: 15px;
  line-height: 1.6;
  color: var(--muted);
}
.cv-link {
  font-family: var(--font-silkscreen);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  transition: color 0.1s steps(2, end);
}
.cv-link:hover {
  color: var(--accent);
}
</style>
