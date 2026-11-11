<script setup lang="ts">
import { computed, provide, ref, watch } from "vue";
import { useRoute } from "vue-router";
import SiteHeader from "./components/SiteHeader.vue";
import SiteFooter from "./components/SiteFooter.vue";
import IntroLoader from "./components/IntroLoader.vue";
import ScrollProgress from "./components/ScrollProgress.vue";
import StatusHud from "./components/StatusHud.vue";
import ObjectiveToast from "./components/ObjectiveToast.vue";
import TargetReticle from "./components/TargetReticle.vue";
import { useCityCamera } from "./composables/useCityCamera";
import { useSmoothScroll } from "./composables/useSmoothScroll";

const route = useRoute();

// État initial lu sur l'URL réelle (le routeur n'est pas encore résolu au setup,
// donc route.path vaut « / » trop tôt — window.location est fiable).
const initialPath = window.location.pathname;

// Rideau noir d'intro sur l'accueil (1er chargement).
const loading = ref(initialPath === "/");

// Fondu noir à CHAQUE changement de page (uniforme partout, pour ne pas avoir
// de transition brutale). L'accueil au 1er chargement garde son rideau à mots ;
// les autres arrivées directes démarrent par le fondu.
const fade = ref(initialPath !== "/");
watch(
  () => route.path,
  () => {
    fade.value = true;
  },
);

// Signal « un voile d'intro est en cours » (loader accueil OU fondu noir).
// Les pages s'en servent pour révéler leur contenu APRÈS le voile.
const introActive = computed(() => loading.value || fade.value);
provide("introActive", introActive);
/* Seule l'introduction, sans le fondu entre pages : les notifications doivent
   pouvoir signaler un changement de page PENDANT ce fondu. */
provide("loading", loading);

useSmoothScroll();

/* La caméra suit la navigation. Seule l'introduction la suspend : le fondu
   entre pages ne doit PAS la retenir, le vol démarre pendant qu'il s'estompe. */
useCityCamera(loading);
</script>

<template>
  <!-- Rideau d'intro avec mots — accueil, 1er chargement -->
  <IntroLoader v-if="loading" @done="loading = false" />

  <!-- Fondu noir uniforme à chaque changement de page -->
  <div
    v-if="fade"
    class="black-fade"
    aria-hidden="true"
    @animationend="fade = false"
  />


  <ScrollProgress />
  <SiteHeader />
  <main class="flex-1">
    <!-- Pas de <Transition> ici : avec les vues lazy, ça pouvait laisser la page
         entrante bloquée à opacity:0. Le fondu noir gère déjà la transition. -->
    <RouterView />
  </main>
  <SiteFooter />

  <!-- Trame de balayage, sur toutes les pages -->
  <div class="sys-scan" aria-hidden="true" />
  <!-- Ligne d'état en bas à gauche -->
  <StatusHud />
  <!-- Consigne de la page, affichée à l'arrivée -->
  <ObjectiveToast />
  <!-- Mire de ciblage qui se verrouille sur les éléments cliquables -->
  <TargetReticle />
</template>
