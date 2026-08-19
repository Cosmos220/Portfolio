<script setup lang="ts">
import { stack } from "../data/content";
import Reveal from "./Reveal.vue";
import TypeLine from "./ui/TypeLine.vue";
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

      <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Reveal v-for="(col, i) in stack" :key="col.title" :delay="i * 40">
          <div class="panel h-full p-6">
            <div class="flex items-baseline justify-between">
              <h3 class="text-lg font-medium">{{ col.title }}</h3>
              <span class="font-pixel text-xs text-muted-2">
                {{ String(i + 1).padStart(2, "0") }}
              </span>
            </div>
            <!-- Apparition en cascade, façon menu de jeu qui se charge ligne
                 par ligne. Le délai cumule celui de la colonne pour que la
                 vague traverse la grille de gauche à droite. -->
            <ul class="mt-5 flex flex-wrap gap-2">
              <li
                v-for="(item, j) in col.items"
                :key="item"
                class="stack-item border-2 border-border bg-surface px-3 py-1.5 text-sm text-foreground/90 transition-colors hover:border-accent hover:text-accent"
                :style="{ '--item-delay': `${i * 45 + j * 20}ms` }"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
</template>
