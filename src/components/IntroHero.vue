<script setup lang="ts">
import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from "vue";
import type { Ref } from "vue";
import { profile } from "../data/content";
import EtheralShadow from "./ui/EtheralShadow.vue";
import PixelSprite from "./ui/PixelSprite.vue";

/* Entrée du hero : on révèle prénom + portrait une fois le voile d'intro
   (loader accueil ou fondu noir) terminé, pour une apparition cohérente
   avec les autres pages (pas un « pop » instantané). */
const introActive = inject<Ref<boolean>>("introActive", ref(false));
const revealed = ref(false);

/* Écran d'accueil plein écran : fond brume animé.
   Nom géant aligné à GAUCHE + petit portrait à DROITE,
   avec parallax fluide au défilement. */
const sectionRef = ref<HTMLElement | null>(null);
const progress = ref(0);
const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let raf = 0;
function update() {
  const el = sectionRef.value;
  if (!el) return;
  const h = el.offsetHeight || window.innerHeight;
  progress.value = Math.min(1, Math.max(0, window.scrollY / h));
}
function onScroll() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    update();
    raf = 0;
  });
}
onMounted(() => {
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", update);

  // Révèle le hero quand le voile d'intro se termine (ou tout de suite s'il
  // n'y en a pas / mouvement réduit).
  if (reduce || !introActive.value) {
    requestAnimationFrame(() => (revealed.value = true));
  } else {
    const stop = watch(introActive, (active) => {
      if (!active) {
        revealed.value = true;
        stop();
      }
    });
  }
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", update);
});

const nameStyle = computed(() =>
  reduce ? {} : { transform: `translateY(${progress.value * -120}px)` },
);
const fadeStyle = computed(() =>
  reduce ? {} : { opacity: String(Math.max(0, 1 - progress.value / 0.85)) },
);
</script>

<template>
  <section
    ref="sectionRef"
    id="top"
    class="relative h-svh min-h-[640px] w-full overflow-hidden"
  >
    <!-- fond animé -->
    <div class="absolute inset-0">
      <EtheralShadow
        color="rgba(235, 236, 244, 1)"
        :animation="{ scale: 100, speed: 78 }"
        :noise="{ opacity: 0.45, scale: 1.3 }"
        :pixel-size="6"
        :pixel-levels="5"
        sizing="fill"
      />
    </div>
    <!-- léger voile pour la lisibilité -->
    <div class="pointer-events-none absolute inset-0 bg-background/35" />

    <!-- contenu -->
    <div
      class="relative z-10 mx-auto flex h-full max-w-6xl items-center px-5 sm:px-8"
      :style="fadeStyle"
    >
      <div
        class="w-full"
      >
        <!-- GAUCHE : prénom + nom géants, alignés à gauche -->
        <div class="min-w-0" :style="nameStyle">
          <div class="hero-rise" :class="{ 'is-in': revealed }">
          <p
            class="mb-5 flex items-center gap-2.5 font-pixel text-[11px] uppercase tracking-[0.06em] text-muted"
          >
            <span
              aria-hidden="true"
              class="relative inline-flex h-1.5 w-1.5"
            >
              <span
                class="absolute inline-flex h-full w-full animate-ping bg-accent opacity-75"
              />
              <span
                class="relative inline-flex h-1.5 w-1.5 bg-accent"
              />
            </span>
            {{ profile.availabilityStatus }}
          </p>

          <!-- Silkscreen n'a que les graisses 400 et 700 : `font-extrabold`
               forcerait un faux-gras synthétique qui baverait sur les pixels.
               L'interlignage et l'interlettrage serrés d'origine (0.84 /
               -0.03em) feraient aussi se chevaucher les lettres, d'où des
               valeurs plus aérées. La police étant ~1.6x plus large que
               Hanken, la taille est réduite pour conserver la même masse.
               Graisse normale (400), comme le logo du header : en 700, les
               traits épaissis de Silkscreen changent assez la silhouette
               des lettres pour lire comme une police différente. -->
          <h1
            class="select-none text-left font-pixel font-normal leading-[1.05] tracking-[0.02em] text-foreground"
          >
            <span class="block text-[clamp(2.25rem,8vw,6.5rem)]">
              {{ profile.firstName }}
            </span>
            <span
              class="block text-[clamp(2.25rem,8vw,6.5rem)] text-muted"
            >
              {{ profile.lastName
              }}<span aria-hidden="true" class="hero-caret">_</span>
            </span>
          </h1>

          <p class="mt-7 max-w-sm text-[15px] leading-relaxed text-foreground/90">
            {{ profile.role }}
            <span class="text-muted">·</span>
            <a
              v-if="profile.companyUrl"
              :href="profile.companyUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-accent"
              >{{ profile.company }}</a
            >
            <span v-else>{{ profile.company }}</span>
          </p>
          </div>
        </div>

      </div>
    </div>

    <!-- indicateur de défilement -->
    <div
      aria-hidden="true"
      class="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-foreground/80"
    >
      <PixelSprite name="arrow-down" :size="14" class="scroll-hint" />
    </div>
  </section>
</template>

<style scoped>
/* Curseur d'arcade : clignotement franc (`steps`), pas un fondu — c'est ce
   qui donne la sensation d'un écran de jeu plutôt qu'une animation web. */
.hero-caret {
  color: var(--accent);
  animation: caretBlink 1.06s steps(1, end) infinite;
}
@keyframes caretBlink {
  0%,
  50% {
    opacity: 1;
  }
  50.01%,
  100% {
    opacity: 0;
  }
}

.scroll-hint {
  animation: scrollHop 1.4s steps(3, end) infinite;
}
@keyframes scrollHop {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(5px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-caret,
  .scroll-hint {
    animation: none;
  }
}

</style>
