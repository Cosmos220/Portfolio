import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router'

/* Au rechargement, le navigateur replace la page là où on l'avait quittée :
   on arrivait au milieu de l'accueil (sur les compétences, par exemple),
   sous le rideau d'intro. On reprend la main : chaque chargement démarre en
   haut, sauf si l'URL vise une ancre (#contact…). Le retour arrière entre
   pages reste géré par le `scrollBehavior` du routeur. */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
if (!location.hash) window.scrollTo(0, 0)

createApp(App).use(router).mount('#app')
