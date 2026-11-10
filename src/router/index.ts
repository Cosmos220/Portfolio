import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/HomeView.vue"),
  },
  {
    path: "/projets",
    name: "projects",
    component: () => import("../views/ProjectsView.vue"),
  },
  {
    path: "/projets/:slug",
    name: "project",
    component: () => import("../views/ProjectDetailView.vue"),
    props: true,
  },
  {
    path: "/contact",
    name: "contact",
    component: () => import("../views/ContactView.vue"),
  },
  // Tout chemin inconnu retombe sur l'accueil.
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

export const router = createRouter({
  /* Le routeur doit connaître le même préfixe que Vite : déployé sous
     /<dépôt>/, un historique basé sur « / » ferait pointer chaque lien
     vers la racine du domaine. `BASE_URL` est injecté par Vite au build. */
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, top: 0 };
    return { top: 0 };
  },
});
