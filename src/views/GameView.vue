<script setup lang="ts">
import Reveal from "../components/Reveal.vue";
import TypeLine from "../components/ui/TypeLine.vue";
import CodeClicker from "../components/CodeClicker.vue";
</script>

<template>
  <section class="pt-28 pb-20 sm:pt-32 sm:pb-28">
    <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <Reveal>
        <p class="font-pixel text-xs uppercase tracking-[0.08em] text-accent">
          <TypeLine :text="'// Pause'" />
        </p>
        <h1 class="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Un petit jeu.
        </h1>
        <p class="mt-6 max-w-xl text-base leading-relaxed text-muted">
          Cliquez pour écrire des lignes de code, puis recrutez les technologies
          que j'utilise pour qu'elles travaillent à votre place. La partie est
          sauvegardée dans votre navigateur.
        </p>
      </Reveal>

      <Reveal :delay="40">
        <div class="mt-12">
          <CodeClicker />
        </div>
      </Reveal>
    </div>
  </section>
</template>
