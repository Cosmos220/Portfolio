<script setup lang="ts">
/* Cadre « flux de caméra » : habille une capture comme une image de
   vidéosurveillance — voyant REC qui clignote, horodatage réel qui défile,
   identifiant de caméra, crochets de cadrage et trame de balayage.

   L'horodatage est l'heure réelle du visiteur, pas un faux chiffre figé :
   c'est ce qui donne au cadre l'air d'un flux vivant. Le minuteur est coupé
   tant que le cadre est hors écran — inutile de réveiller le navigateur
   chaque seconde pour un élément qu'on ne voit pas. */
import { onBeforeUnmount, onMounted, ref } from "vue";

defineProps<{
  /* Ex. « CAM_01 ». */
  cam: string;
  /* Légende en bas à gauche, ex. le nom du projet. */
  caption?: string;
}>();

const root = ref<HTMLElement | null>(null);
const stamp = ref("");
let iv: number | undefined;
let obs: IntersectionObserver | null = null;

const pad = (n: number) => String(n).padStart(2, "0");
function tick() {
  const d = new Date();
  stamp.value = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

onMounted(() => {
  tick();
  if (!root.value) return;
  obs = new IntersectionObserver(([e]) => {
    window.clearInterval(iv);
    if (e?.isIntersecting) {
      tick();
      iv = window.setInterval(tick, 1000);
    }
  });
  obs.observe(root.value);
});
onBeforeUnmount(() => {
  obs?.disconnect();
  window.clearInterval(iv);
});
</script>

<template>
  <div ref="root" class="cam">
    <slot />

    <!-- Calques décoratifs, tous au-dessus de l'image et sans interaction. -->
    <span aria-hidden="true" class="cam-grid" />
    <span aria-hidden="true" class="cam-bk sys-brackets" />

    <p aria-hidden="true" class="cam-top">
      <span class="cam-rec"><i class="cam-dot" />REC</span>
      <span class="cam-time">{{ stamp }}</span>
    </p>
    <p aria-hidden="true" class="cam-bottom">
      <span class="cam-id">{{ cam }}</span>
      <span v-if="caption" class="cam-cap">{{ caption }}</span>
    </p>
  </div>
</template>

<style scoped>
.cam {
  position: relative;
  overflow: hidden;
}
.cam > :deep(img) {
  display: block;
}

/* Trame de balayage propre au cadre, plus marquée que celle de la page. */
.cam-grid {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.16) 0 1px,
    transparent 1px 3px
  );
}
.cam-bk {
  --bk: 18px;
  position: absolute;
  inset: 12px;
  z-index: 2;
  pointer-events: none;
  color: rgba(255, 255, 255, 0.85);
}

.cam-top,
.cam-bottom {
  position: absolute;
  left: 22px;
  right: 22px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0;
  pointer-events: none;
  font-family: var(--font-silkscreen);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: #fff;
  /* Lisible sur n'importe quelle capture, claire ou sombre. */
  text-shadow: 0 0 3px #000, 1px 1px 0 #000;
}
.cam-top {
  top: 20px;
}
.cam-bottom {
  bottom: 20px;
}
.cam-rec {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.cam-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  background: #fff;
  animation: camBlink 1.2s steps(1, end) infinite;
}
@keyframes camBlink {
  0%,
  55% {
    opacity: 1;
  }
  56%,
  100% {
    opacity: 0;
  }
}
.cam-cap {
  text-transform: uppercase;
  opacity: 0.85;
}

@media (prefers-reduced-motion: reduce) {
  .cam-dot {
    animation: none;
  }
}
@media (max-width: 480px) {
  /* Sur petit écran l'horodatage complet mange toute la largeur. */
  .cam-time {
    display: none;
  }
}
</style>
