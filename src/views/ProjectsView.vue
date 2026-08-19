<script setup lang="ts">
import { projects } from "../data/content";
import Reveal from "../components/Reveal.vue";
import ProjectCard from "../components/ProjectCard.vue";
import ContactCta from "../components/ContactCta.vue";
import TypeLine from "../components/ui/TypeLine.vue";
</script>

<template>
  <section
    class="relative overflow-hidden border-b border-border pt-28 pb-20 sm:pt-32 sm:pb-28"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute left-1/2 top-40 h-[40rem] w-[68rem] -translate-x-1/2 dither-field opacity-[0.07]"
    />
    <div class="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
      <Reveal>
        <p class="font-pixel text-xs uppercase tracking-[0.08em] text-accent">
          <TypeLine :text="`Projets · ${projects.length}`" />
        </p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Tous mes projets.
        </h1>
        <p class="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Une sélection de mes travaux académiques et personnels — du jeu vidéo
          à l'application web.
        </p>
      </Reveal>

      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Reveal
          v-for="(p, i) in projects"
          :key="p.slug"
          :delay="(i % 3) * 35"
        >
          <ProjectCard :project="p" />
        </Reveal>
      </div>
    </div>
  </section>

  <ContactCta />
</template>
