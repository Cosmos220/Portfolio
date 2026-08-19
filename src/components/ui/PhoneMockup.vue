<script setup lang="ts">
/* Cadre de téléphone pour présenter une capture d'interface mobile.

   Angles vifs et bordure pleine, comme les panneaux du site : un châssis aux
   coins arrondis, avec reflets et ombre diffuse, appartiendrait au registre
   « premium » écarté partout ailleurs.

   Le rapport d'écran est fixé à 9/19.5 (celui des téléphones actuels) : sans
   lui, une capture plus courte que prévu déformerait le châssis. */
defineProps<{
  /* URL DÉJÀ résolue. La résolution reste à l'appelant : la page détail
     l'effectue déjà pour suivre les images en échec, et la refaire ici
     échouerait sur une URL de build. */
  src?: string;
  alt: string;
  /* Légende sous le téléphone, pour situer l'écran montré. */
  caption?: string;
}>();
</script>

<template>
  <figure class="pm">
    <div class="pm-frame">
      <!-- Encoche : un simple rectangle, cohérent avec la grille du thème. -->
      <span aria-hidden="true" class="pm-notch" />

      <div class="pm-screen">
        <img v-if="src" :src="src" :alt="alt" loading="lazy" />
        <!-- Capture manquante : on garde le châssis pour ne pas casser la
             mise en page, avec un repère lisible plutôt qu'un vide. -->
        <span v-else class="pm-empty">[ {{ alt.toUpperCase() }} ]</span>
      </div>
    </div>

    <figcaption v-if="caption" class="pm-caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.pm {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.pm-frame {
  position: relative;
  width: 100%;
  max-width: 260px;
  padding: 10px;
  background: var(--card);
  border: 2px solid var(--border-strong);
  box-shadow: 6px 6px 0 0 rgba(255, 255, 255, 0.06);
}
.pm-notch {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  width: 62px;
  height: 8px;
  background: var(--border-strong);
}
.pm-screen {
  position: relative;
  aspect-ratio: 9 / 19.5;
  overflow: hidden;
  background: var(--background);
  display: grid;
  place-items: center;
}
.pm-screen img {
  width: 100%;
  height: 100%;
  /* `cover` : une capture au rapport légèrement différent remplit l'écran
     au lieu de laisser des bandes noires sur les côtés. */
  object-fit: cover;
  object-position: top center;
  display: block;
}
.pm-empty {
  font-family: var(--font-silkscreen);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--muted-2);
  text-align: center;
  padding: 0 0.5rem;
}
.pm-caption {
  font-family: var(--font-silkscreen);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-2);
  text-align: center;
}
</style>
