<script setup lang="ts">
/* Logo d'une technologie, rendu en `currentColor` : les couleurs de marque
   seraient les seules du site. Le viewBox 24x24 est celui de simple-icons. */
import { computed } from "vue";
import { TECH_ICONS } from "../../data/techIcons";

const props = withDefaults(defineProps<{ name: string; size?: number }>(), {
  size: 16,
});

const path = computed(() => TECH_ICONS[props.name]);
</script>

<template>
  <svg
    v-if="path"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
  >
    <path :d="path" />
  </svg>
  <!-- Techno sans logo connu : carré plein, pour garder l'alignement. -->
  <span
    v-else
    aria-hidden="true"
    class="inline-block shrink-0 bg-current"
    :style="{ width: `${size * 0.6}px`, height: `${size * 0.6}px` }"
  />
</template>
