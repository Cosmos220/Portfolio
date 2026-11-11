<script setup lang="ts">
/* Fine ligne de progression de lecture, collée en haut de l'écran.

   Elle ne fait que mettre à l'échelle une barre (transform : composé par le
   GPU) : aucune mise en page recalculée pendant le défilement. Décorative. */
import { onBeforeUnmount, onMounted, ref } from "vue";

const bar = ref<HTMLElement | null>(null);
let raf = 0;

function update() {
  raf = 0;
  const el = bar.value;
  if (!el) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  el.style.transform = `scaleX(${p})`;
}
const schedule = () => {
  if (!raf) raf = requestAnimationFrame(update);
};

onMounted(() => {
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  update();
});
onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
});
</script>

<template>
  <div class="sp" aria-hidden="true"><span ref="bar" class="sp-bar" /></div>
</template>

<style scoped>
.sp {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 70;
  height: 2px;
  pointer-events: none;
}
.sp-bar {
  display: block;
  height: 100%;
  background: var(--cyan);
  transform: scaleX(0);
  transform-origin: left;
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .sp { display: none; }
}
</style>
