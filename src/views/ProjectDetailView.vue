<script setup lang="ts">
import { computed, reactive } from "vue";
import { useRouter } from "vue-router";
import { getProject, projects, projectStatus } from "../data/content";
import { asset } from "../data/assets";
import Reveal from "../components/Reveal.vue";
import PhoneMockup from "../components/ui/PhoneMockup.vue";
import CamFrame from "../components/ui/CamFrame.vue";

const props = defineProps<{ slug: string }>();
const router = useRouter();

const project = computed(() => getProject(props.slug));

// Images manquantes (404) retirées de la galerie ; placeholder si tout échoue.
const failed = reactive(new Set<string>());

// Slug inconnu → retour à la liste des projets.
if (!getProject(props.slug)) {
  router.replace("/projets");
}

// Galerie : images explicites, sinon l'image de couverture.
const gallery = computed(() => {
  const p = project.value;
  if (!p) return [];
  const imgs = p.images?.length ? p.images : p.image ? [p.image] : [];
  /* On résout ici plutôt que dans le template : la liste sert aussi au suivi
     des images en échec, qui doit porter sur l'URL réellement chargée. */
  return imgs
    .map((src) => asset(src))
    .filter((src): src is string => !!src && !failed.has(src));
});

/* Version « téléphone » : on garde les entrées dont la capture manque, pour
   que le châssis reste affiché. Filtrer comme la galerie classique ferait
   disparaître toute la section tant qu'aucune image n'est en place. */
const phoneShots = computed(() => {
  const p = project.value;
  if (!p) return [];
  const imgs = p.images?.length ? p.images : p.image ? [p.image] : [];
  return imgs.map((src) => asset(src));
});

// Projet suivant (navigation circulaire) pour garder l'exploration vivante.
const nextProject = computed(() => {
  const i = projects.findIndex((p) => p.slug === props.slug);
  if (i === -1) return null;
  return projects[(i + 1) % projects.length];
});
</script>

<template>
  <article v-if="project" class="pt-28 pb-8 sm:pt-32">
    <div class="mx-auto w-full max-w-4xl px-5 sm:px-8">
      <Reveal>
        <RouterLink
          to="/projets"
          class="inline-flex items-center gap-1.5 font-pixel text-xs uppercase tracking-[0.06em] text-muted transition-colors hover:text-accent"
        >
          <svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
            <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Tous les projets
        </RouterLink>

        <p class="mt-6 font-pixel text-xs uppercase tracking-[0.1em] text-accent">
          PRJ-{{ String(projects.findIndex((p) => p.slug === project!.slug) + 1).padStart(3, "0") }}
          <span class="text-muted-2">· {{ projectStatus(project) }}</span>
        </p>
        <h1 class="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          {{ project.title }}
        </h1>

        <ul class="mt-6 flex flex-wrap gap-2">
          <li
            v-for="(t, ti) in project.tags"
            :key="ti"
            class="chip"
          >
            {{ t }}
          </li>
        </ul>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          <a
            v-if="project.liveUrl"
            :href="project.liveUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-primary"
          >
            Voir en ligne
            <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" aria-hidden="true">
              <path d="M5 11L11 5M11 5H5M11 5V11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
          <a
            v-if="project.github"
            :href="project.github"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-ghost"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.36 1.12 2.94.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.34 9.34 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.79-4.58 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
            </svg>
            Voir le code
          </a>
        </div>
      </Reveal>
    </div>

    <!-- Galerie -->
    <div class="mx-auto mt-12 w-full max-w-5xl px-5 sm:px-8">
      <!-- Interfaces mobiles : chaque capture dans un châssis de téléphone.
           Une capture en portrait affichée pleine largeur serait démesurée
           et illisible. -->
      <Reveal v-if="project.mockup === 'phone' && phoneShots.length">
        <div class="flex flex-wrap items-start justify-center gap-8 sm:gap-10">
          <PhoneMockup
            v-for="(src, i) in phoneShots"
            :key="i"
            :src="src"
            :alt="`${project.title} — écran ${i + 1}`"
          />
        </div>
      </Reveal>

      <template v-else>
        <Reveal v-for="(src, i) in gallery" :key="i" :delay="i * 30" class="mb-5">
          <div class="panel overflow-hidden">
            <!-- Chaque capture est présentée comme un flux de caméra. -->
            <CamFrame :cam="`CAM_${String(i + 1).padStart(2, '0')}`" :caption="project.title">
              <img
                :src="src"
                :alt="`${project.title} — visuel ${i + 1}`"
                loading="lazy"
                @error="failed.add(src)"
                class="block h-auto w-full"
              />
            </CamFrame>
          </div>
        </Reveal>
      </template>
      <!-- En mode téléphone, les châssis servent déjà de repère : ce
           placeholder ferait doublon. -->
      <Reveal v-if="!gallery.length && project.mockup !== 'phone'">
        <div
          class="grid aspect-[16/9] place-items-center border border-border"
          style="background: var(--surface)"
        >
          <span class="font-pixel text-xs tracking-[0.08em] text-muted-2">
            [ {{ project.title.toUpperCase() }} ]
          </span>
        </div>
      </Reveal>
    </div>

    <!-- Description + fonctionnalités -->
    <div class="mx-auto mt-14 w-full max-w-4xl px-5 sm:px-8">
      <div class="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <Reveal v-if="project.longDescription">
          <h2 class="font-pixel text-xs uppercase tracking-[0.08em] text-accent">
            Description
          </h2>
          <p class="mt-5 text-base leading-relaxed text-foreground/90">
            {{ project.longDescription }}
          </p>
        </Reveal>

        <Reveal v-if="project.features?.length" :delay="40">
          <h2 class="font-pixel text-xs uppercase tracking-[0.08em] text-accent">
            Fonctionnalités
          </h2>
          <ul class="mt-5 space-y-3">
            <li
              v-for="(f, fi) in project.features"
              :key="fi"
              class="flex gap-3 text-[15px] leading-relaxed text-muted"
            >
              <span
                aria-hidden="true"
                class="mt-2 h-1.5 w-1.5 shrink-0 bg-accent"
              />
              {{ f }}
            </li>
          </ul>
        </Reveal>
      </div>
    </div>

    <!-- Projet suivant -->
    <div
      v-if="nextProject"
      class="mx-auto mt-20 w-full max-w-4xl border-t border-border px-5 pt-10 sm:px-8"
    >
      <RouterLink
        :to="`/projets/${nextProject.slug}`"
        class="group flex items-center justify-between gap-6"
      >
        <span>
          <span class="font-pixel text-xs uppercase tracking-[0.06em] text-muted">
            Projet suivant
          </span>
          <span
            class="mt-1 block text-2xl font-medium tracking-tight transition-colors group-hover:text-accent"
          >
            {{ nextProject.title }}
          </span>
        </span>
        <svg viewBox="0 0 16 16" fill="none" class="h-6 w-6 shrink-0 text-muted transition-colors group-hover:text-accent" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </RouterLink>
    </div>
  </article>
</template>
