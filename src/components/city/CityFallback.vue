<script setup lang="ts">
/* Repli quand la 3D n'est pas disponible : une silhouette de la même ville,
   dessinée en SVG, sur un quadrillage de plan.

   Elle est construite à partir des MÊMES données que la scène 3D
   (`getCity`) : le visiteur sans WebGL voit donc la même ville, pas un
   décor générique. Aucune dépendance à Three.js : ce composant ne le charge
   jamais. */
import { computed } from "vue";
import { getCity } from "../../city/generate";

const W = 1600;
const H = 600;

const towers = computed(() => {
  const city = getCity("lite");
  /* Projection à plat : on étale les immeubles le long de l'axe x, les plus
     lointains (z négatif) plus petits et plus pâles, pour une impression de
     profondeur sans moteur 3D. */
  return city.buildings
    .filter((b) => b.h > 14)
    .map((b) => {
      const depth = (b.z + city.half) / (city.half * 2); // 0 loin … 1 près
      const scale = 0.55 + depth * 0.45;
      return {
        x: ((b.x + city.half) / (city.half * 2)) * W,
        w: Math.max(5, b.w * 2.2 * scale),
        h: Math.min(H * 0.8, b.h * 2.6 * scale),
        o: 0.16 + depth * 0.5,
      };
    })
    .sort((a, b) => a.o - b.o);
});
</script>

<template>
  <div class="fb">
    <svg
      class="fb-svg"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="xMidYMax slice"
      focusable="false"
    >
      <defs>
        <pattern id="fb-grid" width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M64 0H0V64" fill="none" stroke="#3ee7ff" stroke-opacity="0.07" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#fb-grid)" />
      <g>
        <rect
          v-for="(t, i) in towers"
          :key="i"
          :x="t.x"
          :y="H - t.h"
          :width="t.w"
          :height="t.h"
          :fill-opacity="t.o"
          fill="#2a3340"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.fb {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 100%, #0a1422 0%, #030811 70%);
}
.fb-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
