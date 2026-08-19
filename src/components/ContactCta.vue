<script setup lang="ts">
import { computed } from "vue";
import { profile, socials } from "../data/content";
import Reveal from "./Reveal.vue";
import TypeLine from "./ui/TypeLine.vue";

/* Bloc d'appel au contact, réutilisé sur l'accueil et la page Contact. */
const mailto = computed(
  () =>
    `mailto:${profile.email}?subject=${encodeURIComponent(
      "Un projet à discuter",
    )}&body=${encodeURIComponent(`Bonjour ${profile.firstName},\n\nJe vous contacte au sujet de…`)}`,
);
</script>

<template>
  <section
    id="contact"
    class="relative overflow-hidden border-t border-border py-24 sm:py-32"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute bottom-0 left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 translate-y-1/3 dither-field opacity-[0.07]"
    />

    <div class="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
      <Reveal>
        <p class="font-pixel text-xs uppercase tracking-[0.08em] text-accent">
          <TypeLine :text="'Contact'" />
        </p>
        <h2
          class="mt-5 max-w-3xl text-balance text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl"
        >
          On construit quelque chose ensemble ?
        </h2>
        <p class="mt-6 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
          {{ profile.availabilityLong }}
        </p>

        <div class="mt-10 flex flex-wrap items-center gap-3">
          <a
            :href="mailto"
            class="btn-primary"
          >
            Envoyer un e-mail
            <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
          <a
            v-for="s in socials"
            :key="s.label"
            :href="s.href"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-ghost"
          >
            {{ s.label }}
          </a>
        </div>
      </Reveal>
    </div>
  </section>
</template>
