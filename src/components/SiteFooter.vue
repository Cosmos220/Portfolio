<script setup lang="ts">
import { profile, socials } from "../data/content";
import LedMask from "./ui/LedMask.vue";
import EasterEggCreeper from "./EasterEggCreeper.vue";

const year = new Date().getFullYear();

/* Le scan vit dans ScanMode (une seule logique) : on lui envoie juste le
   signal. Utile sans clavier — sur mobile, la touche S n'existe pas. */
const scan = () => window.dispatchEvent(new Event("sys:scan"));
const nav = [
  { label: "Accueil", to: "/" },
  { label: "Projets", to: "/projets" },
  { label: "Contact", to: "/contact" },
];
</script>

<template>
  <footer class="border-t border-border">
    <div
      class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between"
    >
      <div>
        <RouterLink
          to="/"
          class="inline-flex items-center gap-2.5 font-pixel text-sm uppercase tracking-[0.06em] text-foreground transition-colors hover:text-accent"
        >
          <LedMask :size="22" class="text-accent" />
          {{ profile.firstName }}_{{ profile.lastName }}
        </RouterLink>
        <p class="mt-2 max-w-xs text-sm text-muted-2">
          Étudiant en informatique · {{ profile.location }}
        </p>
      </div>

      <nav class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" aria-label="Pied de page">
        <RouterLink
          v-for="l in nav"
          :key="l.to"
          :to="l.to"
          v-scramble
          class="text-muted transition-colors hover:text-foreground"
        >
          {{ l.label }}
        </RouterLink>
        <a
          v-for="s in socials"
          :key="s.label"
          :href="s.href"
          target="_blank"
          rel="noopener noreferrer"
          class="text-muted transition-colors hover:text-accent"
        >
          {{ s.label }}
        </a>
      </nav>
    </div>

    <div class="border-t border-border">
      <div
        class="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-6 text-sm text-muted-2 sm:px-8"
      >
        © {{ year }} {{ profile.name }}. Tous droits réservés.
        <span class="hidden font-mono text-xs text-muted-2 sm:inline">
          // connexion sécurisée
        </span>
        <EasterEggCreeper />
        <button
          type="button"
          class="scan-btn ml-auto"
          data-target-label="Scanner"
          @click="scan"
        >
          <span class="scan-btn-key">S</span>
          Scanner
        </button>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.scan-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  padding: 0.25rem 0.6rem;
  font-family: var(--font-silkscreen);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    border-color 0.1s steps(2, end),
    color 0.1s steps(2, end);
}
.scan-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
/* Touche de clavier, comme dans l'aide d'un jeu. */
.scan-btn-key {
  display: inline-grid;
  place-items: center;
  min-width: 14px;
  height: 14px;
  border: 1px solid currentColor;
  font-size: 9px;
}
</style>
