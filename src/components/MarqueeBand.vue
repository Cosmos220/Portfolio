<script setup lang="ts">
import { marqueeItems } from "../data/content";
import PixelSprite from "./ui/PixelSprite.vue";
const loop = [...marqueeItems, ...marqueeItems];

/* On alterne les sprites séparateurs pour que la bande ne soit pas une
   répétition du même motif. */
const SEPARATORS = ["invader", "heart", "star", "coin"] as const;
</script>

<template>
  <section
    aria-label="Mots-clés"
    class="marquee-mask overflow-hidden border-y border-border py-6"
  >
    <div class="flex w-max animate-marquee items-center">
      <div v-for="(item, i) in loop" :key="i" class="flex items-center">
        <span
          class="px-8 text-2xl font-medium tracking-tight text-foreground/85 sm:text-3xl"
        >
          {{ item }}
        </span>
        <PixelSprite
          :name="SEPARATORS[i % SEPARATORS.length]"
          :size="18"
          class="text-accent"
        />
      </div>
    </div>
  </section>
</template>
