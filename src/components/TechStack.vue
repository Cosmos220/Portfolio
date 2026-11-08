<script setup lang="ts">
import Reveal from "./Reveal.vue";
import TypeLine from "./ui/TypeLine.vue";
import SkillTree from "./SkillTree.vue";
</script>

<template>
  <section id="stack" class="border-t border-border py-20 sm:py-28">
    <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <Reveal>
        <p class="font-pixel text-xs uppercase tracking-[0.08em] text-accent">
          <TypeLine :text="'Stack technique'" />
        </p>
        <h2
          class="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Les outils avec lesquels je construis.
        </h2>
      </Reveal>

      <!-- Arbre de compétences, à la manière d'un menu de jeu -->
      <Reveal :delay="40">
        <div class="mt-12">
          <SkillTree />
        </div>
      </Reveal>
    </div>
  </section>
</template>
