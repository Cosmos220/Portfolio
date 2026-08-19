<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const props = withDefaults(
  defineProps<{ delay?: number; as?: string }>(),
  { delay: 0, as: "div" },
);

const el = ref<HTMLElement | null>(null);
let obs: IntersectionObserver | null = null;

onMounted(() => {
  if (!el.value) return;
  obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          obs?.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
  );
  obs.observe(el.value);
});

onBeforeUnmount(() => obs?.disconnect());
</script>

<template>
  <component
    :is="as"
    ref="el"
    class="reveal"
    :style="{ '--reveal-delay': `${delay}ms` }"
  >
    <slot />
  </component>
</template>
