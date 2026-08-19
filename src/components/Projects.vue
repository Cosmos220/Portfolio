<script setup lang="ts">
import { ref, computed } from "vue";
import { featuredProjects } from "../data/content";
import { asset } from "../data/assets";
import Reveal from "./Reveal.vue";
import ProjectCard from "./ProjectCard.vue";
import TypeLine from "./ui/TypeLine.vue";

// Premier projet mis en avant = « projet principal » (grande carte spotlight).
const spotlight = computed(() => featuredProjects[0]);
const rest = computed(() => featuredProjects.slice(1));

// Repli placeholder si l'image du spotlight manque (404).
const imgFailed = ref(false);
</script>

<template>
  <section
    id="projets"
    class="relative overflow-hidden border-t border-border py-20 sm:py-28"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute left-1/2 top-1/3 h-[36rem] w-[64rem] -translate-x-1/2 dither-field opacity-[0.07]"
    />
    <div class="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
      <Reveal>
        <div class="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p class="font-pixel text-xs uppercase tracking-[0.08em] text-accent">
              <TypeLine :text="'Projets sélectionnés'" />
            </p>
            <h2
              class="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Un aperçu de ce que je construis.
            </h2>
            <p class="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              Une sélection de projets récents — du concept à la mise en ligne.
            </p>
          </div>

          <RouterLink
            to="/projets"
            class="btn-ghost"
          >
            Tous les projets
            <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </RouterLink>
        </div>
      </Reveal>

      <!-- ===== Projet principal : image à gauche, détails à droite ===== -->
      <Reveal v-if="spotlight">
        <article
          class="panel mt-12 grid overflow-hidden lg:grid-cols-2"
        >
          <!-- image (gauche) -->
          <RouterLink
            :to="`/projets/${spotlight.slug}`"
            class="group relative block min-h-[260px] border-b border-border lg:border-b-0 lg:border-r"
          >
            <img
              v-if="asset(spotlight.image) && !imgFailed"
              :src="asset(spotlight.image)"
              :alt="spotlight.title"
              loading="lazy"
              @error="imgFailed = true"
              class="project-visual absolute inset-0 h-full w-full object-cover group-hover:scale-[1.03]"
            />
            <div
              v-else
              class="absolute inset-0 grid place-items-center"
              style="background: var(--surface)"
            >
              <span class="font-pixel text-xs tracking-[0.08em] text-muted-2">
                [ {{ spotlight.title.toUpperCase() }} ]
              </span>
            </div>
          </RouterLink>

          <!-- détails (droite) -->
          <div class="flex flex-col justify-center p-8 sm:p-10">
            <p
              class="flex items-center gap-2.5 font-pixel text-[11px] uppercase tracking-[0.06em] text-muted"
            >
              <span aria-hidden="true" class="h-1.5 w-1.5 bg-accent" />
              Projet principal
              <span v-if="spotlight.tags[0]" class="text-muted-2">·</span>
              <span v-if="spotlight.tags[0]" class="text-muted-2">{{ spotlight.tags[0] }}</span>
            </p>

            <h3
              class="mt-5 font-extrabold leading-[0.95] tracking-[-0.02em] text-[clamp(2.25rem,5vw,3.5rem)]"
            >
              <RouterLink
                :to="`/projets/${spotlight.slug}`"
                class="transition-colors hover:text-accent"
              >
                {{ spotlight.title }}
              </RouterLink>
            </h3>

            <p class="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
              {{ spotlight.description }}
            </p>

            <ul class="mt-6 flex flex-wrap gap-2">
              <li
                v-for="t in spotlight.tags"
                :key="t"
                class="chip"
              >
                {{ t }}
              </li>
            </ul>

            <RouterLink
              :to="`/projets/${spotlight.slug}`"
              class="btn-primary mt-8 w-fit"
            >
              Voir le projet
              <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </RouterLink>
          </div>
        </article>
      </Reveal>

      <!-- ===== Les autres : cartes classiques ===== -->
      <div v-if="rest.length" class="mt-5 grid gap-5 sm:grid-cols-2">
        <Reveal
          v-for="(p, i) in rest"
          :key="p.slug"
          :delay="(i % 2) * 40"
        >
          <ProjectCard :project="p" />
        </Reveal>
      </div>
    </div>
  </section>
</template>
