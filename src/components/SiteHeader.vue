<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { profile, headerLinks } from "../data/content";

const route = useRoute();
function isActive(to: string) {
  return to === "/" ? route.path === "/" : route.path.startsWith(to);
}

const scrolled = ref(false);
function onScroll() {
  scrolled.value = window.scrollY > 8;
}
onMounted(() => {
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));

const brand = `${profile.firstName}_${profile.lastName}`;

const nav = [
  { label: "Accueil", to: "/" },
  { label: "Projets", to: "/projets" },
  { label: "Contact", to: "/contact" },
];
</script>

<template>
  <header
    :class="[
      'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
      scrolled
        ? 'border-b border-border bg-background/70'
        : 'border-b border-transparent',
    ]"
  >
    <div
      class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8"
    >
      <!-- Logo : prénom et nom soudés par un tiret bas, comme un identifiant. -->
      <RouterLink
        to="/"
        class="glitch font-pixel text-sm uppercase tracking-[0.06em] text-foreground transition-colors hover:text-accent"
        :data-text="brand"
      >
        {{ brand }}
      </RouterLink>

      <nav
        class="flex items-center gap-5 text-sm font-medium sm:gap-8"
        aria-label="Navigation principale"
      >
        <RouterLink
          v-for="l in nav"
          :key="l.to"
          :to="l.to"
          v-scramble
          class="nav-link transition-colors"
          :class="isActive(l.to)
              ? 'is-active text-foreground'
              : 'text-foreground/70 hover:text-foreground'
          "
        >
          {{ l.label }}
        </RouterLink>
        <a
          v-for="l in headerLinks"
          :key="l.label"
          :href="l.href"
          target="_blank"
          rel="noopener noreferrer"
          v-scramble
          class="nav-link hidden text-foreground/70 transition-colors hover:text-foreground sm:inline"
        >
          {{ l.label }}
        </a>
      </nav>
    </div>
  </header>
</template>
