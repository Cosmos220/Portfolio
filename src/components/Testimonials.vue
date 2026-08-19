<script setup lang="ts">
import { testimonials } from "../data/content";
import Reveal from "./Reveal.vue";
import TypeLine from "./ui/TypeLine.vue";
</script>

<template>
  <section class="border-t border-border py-20 sm:py-28">
    <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <Reveal>
        <p class="font-pixel text-xs uppercase tracking-[0.08em] text-accent">
          <TypeLine :text="'Témoignages'" />
        </p>
        <h2
          class="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Ce qu’on dit de mon travail.
        </h2>
      </Reveal>

      <div class="mt-12 grid gap-5 md:grid-cols-3">
        <Reveal v-for="(t, i) in testimonials" :key="i" :delay="i * 40">
          <figure
            class="panel flex h-full flex-col p-6"
          >
            <span
              aria-hidden="true"
              class="text-5xl leading-none text-accent"
              style="font-family: Georgia, serif"
            >
              &ldquo;
            </span>
            <blockquote
              class="mt-2 flex-1 text-[15px] leading-relaxed text-foreground/90"
            >
              {{ t.quote }}
            </blockquote>
            <figcaption class="mt-6 border-t border-border pt-5">
              <div class="text-sm font-medium text-foreground">{{ t.name }}</div>
              <div class="mt-0.5 text-sm text-muted">
                {{ t.role }} · {{ t.company }}
              </div>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </div>
  </section>
</template>
