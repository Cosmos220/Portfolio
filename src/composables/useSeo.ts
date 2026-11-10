/* Balises <head> mises à jour à chaque navigation.

   Le serveur (GitHub Pages) renvoie, pour chaque route, une page générée au
   build avec les bonnes balises (voir scripts/seo.mjs) : c'est ce que lisent
   les robots qui n'exécutent pas de JavaScript et les aperçus de liens. Ce
   composable garde ensuite le <head> cohérent quand on navigue dans
   l'application sans recharger la page. */
import type { Router } from "vue-router";
import seo from "../data/seo.json";
import { getProject } from "../data/content";

function setMeta(selector: string, attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = url;
}

export function initSeo(router: Router) {
  router.afterEach((to) => {
    const name = String(to.name ?? "");
    let title: string = seo.pages.home.title;
    let description: string = seo.pages.home.description;
    let path: string = seo.pages.home.path;

    if (name === "projects") ({ title, description, path } = seo.pages.projects);
    else if (name === "contact") ({ title, description, path } = seo.pages.contact);
    else if (name === "project") {
      const p = getProject(String(to.params.slug ?? ""));
      if (p) {
        title = `${p.title} — Projet de Loïck Davi`;
        description = p.description;
        path = `/projets/${p.slug}`;
      }
    }

    const url = seo.siteUrl + path;
    document.title = title;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:url"]', "property", "og:url", url);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setCanonical(url);
  });
}
