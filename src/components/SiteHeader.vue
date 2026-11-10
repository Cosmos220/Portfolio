<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { profile } from "../data/content";
import { useRubrics, type Rubric } from "../composables/useRubrics";
import PhoneNav from "./PhoneNav.vue";

const router = useRouter();
const { rubrics, activeId, go } = useRubrics();

/* Vrai lien (`href`) pour les rubriques : clic droit, ouverture dans un
   nouvel onglet et lecteurs d'écran fonctionnent. Le clic simple est pris en
   charge par `go`, qui ajoute le défilement jusqu'à la section. */
function hrefOf(r: Rubric) {
  return router.resolve({
    path: r.path,
    hash: r.section && r.section !== "top" ? `#${r.section}` : "",
  }).href;
}
function onLink(e: MouseEvent, r: Rubric) {
  // Clic modifié (nouvel onglet…) : on laisse faire le navigateur.
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  void go(r);
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

      <div class="flex items-center gap-4 sm:gap-6">
        <!-- Rubriques : visibles en permanence sur grand écran. Le menu
             « smartphone » les reprend et les complète. -->
        <nav
          class="hidden items-center gap-6 text-sm font-medium lg:flex xl:gap-8"
          aria-label="Navigation principale"
        >
          <a
            v-for="r in rubrics"
            :key="r.id"
            :href="hrefOf(r)"
            v-scramble
            class="nav-link transition-colors"
            :class="activeId === r.id
              ? 'is-active text-foreground'
              : 'text-foreground/70 hover:text-foreground'"
            :aria-current="activeId === r.id ? 'page' : undefined"
            @click="onLink($event, r)"
          >
            {{ r.label }}
          </a>
        </nav>

        <div class="lg:hidden"><PhoneNav /></div>
      </div>
    </div>
  </header>
</template>
