<script setup lang="ts">
import { ref } from "vue";
import type { Project } from "../data/content";
import { asset } from "../data/assets";

/* Carte projet réutilisable — accueil (sélection) et page /projets (tous).
   La variante « solid » a été retirée : elle donnait deux apparences
   différentes au même composant selon la page. */
defineProps<{ project: Project; delay?: number }>();

// Si l'image manque (404), on retombe sur le placeholder au lieu d'une icône cassée.
const imgFailed = ref(false);
</script>

<template>
  <article class="panel is-interactive group flex h-full flex-col overflow-hidden">
    <RouterLink
      :to="`/projets/${project.slug}`"
      class="relative block aspect-[16/10] overflow-hidden border-b border-border bg-surface"
      :aria-label="`Voir le projet ${project.title}`"
    >
      <img
        v-if="asset(project.image) && !imgFailed"
        :src="asset(project.image)"
        :alt="project.title"
        loading="lazy"
        @error="imgFailed = true"
        class="project-visual absolute inset-0 h-full w-full object-cover group-hover:scale-[1.04]"
      />
      <div
        v-else
        class="absolute inset-0 grid place-items-center transition-transform duration-500 group-hover:scale-[1.04]"
        style="background: var(--surface)"
      >
        <span class="font-pixel text-xs tracking-[0.08em] text-muted-2">
          [ {{ project.title.toUpperCase() }} ]
        </span>
      </div>
      <!-- Mire qui se verrouille sur le visuel au survol -->
      <span aria-hidden="true" class="sys-brackets card-lock" />
      <span aria-hidden="true" class="card-tag">Accéder_</span>
    </RouterLink>

    <div class="flex flex-1 flex-col p-6">
      <div class="flex items-start justify-between gap-4">
        <h3 class="text-xl font-medium tracking-tight">
          <RouterLink
            :to="`/projets/${project.slug}`"
            class="transition-colors hover:text-accent"
          >
            {{ project.title }}
          </RouterLink>
        </h3>
        <a
          v-if="project.github"
          :href="project.github"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`${project.title} — code source`"
          class="grid h-9 w-9 shrink-0 place-items-center text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.36 1.12 2.94.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.34 9.34 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.79-4.58 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
          </svg>
        </a>
      </div>

      <p class="mt-3 text-[15px] leading-relaxed text-muted">
        {{ project.description }}
      </p>

      <ul class="mt-5 flex flex-wrap gap-2 pt-1">
        <li
          v-for="(t, ti) in project.tags"
          :key="ti"
          class="chip"
        >
          {{ t }}
        </li>
      </ul>

      <RouterLink
        :to="`/projets/${project.slug}`"
        class="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors group-hover:text-accent"
      >
        Voir le projet
        <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </RouterLink>
    </div>
  </article>
</template>
