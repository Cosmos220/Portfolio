/* Post-build SEO : pages par route + sitemap.

   Le site est une application monopage : sans cette étape, toutes les URL
   renverraient la même coquille avec le titre et la description de l'accueil.
   On génère donc, pour chaque route connue, une copie de dist/index.html
   avec ses propres balises (titre, description, canonical, Open Graph), et
   un sitemap.xml. GitHub Pages sert dist/projets/index.html pour /projets/.

   Les projets sont lus dans src/data/content.ts : ajouter un projet suffit
   pour le référencer. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const seo = JSON.parse(readFileSync(join(root, "src/data/seo.json"), "utf8"));
const site = (process.env.SITE_URL || seo.siteUrl).replace(/\/$/, "");
const template = readFileSync(join(dist, "index.html"), "utf8");

/* Projets : slug, titre, description. */
const src = readFileSync(join(root, "src/data/content.ts"), "utf8");
const projects = [];
const re =
  /slug:\s*"([^"]+)"[\s\S]*?title:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?description:\s*"((?:[^"\\]|\\.)*)"/g;
for (const m of src.matchAll(re)) {
  projects.push({ slug: m[1].trim(), title: m[2], description: m[3].replace(/\\"/g, '"') });
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/* Remplace l'attribut content de la balise <meta> repérée par `attr`. */
function setMeta(html, attr, value) {
  const quoted = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(<meta\\s+${quoted}[^>]*?content=")[^"]*(")`, "s");
  return html.replace(re, (_, a, b) => a + esc(value) + b);
}

function page(path, title, description) {
  const url = site + path;
  let h = template;
  /* Seule l'accueil est indexée : les autres pages restent accessibles mais
     « noindex » (le robot doit pouvoir les lire pour voir la consigne, donc
     robots.txt ne les bloque pas). */
  if (path !== "/") {
    h = h.replace(/(<meta name="robots" content=")[^"]*(")/, (_, a, b) => a + "noindex, follow" + b);
  }
  h = h.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(title)}</title>`);
  h = setMeta(h, 'name="description"', description);
  h = setMeta(h, 'property="og:title"', title);
  h = setMeta(h, 'property="og:description"', description);
  h = setMeta(h, 'property="og:url"', url);
  h = setMeta(h, 'name="twitter:title"', title);
  h = setMeta(h, 'name="twitter:description"', description);
  h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, (_, a, b) => a + url + b);
  return h;
}

const routes = [
  { path: "/", ...seo.pages.home },
  { path: "/projets", ...seo.pages.projects },
  { path: "/contact", ...seo.pages.contact },
  ...projects.map((p) => ({
    path: `/projets/${p.slug}`,
    title: `${p.title} — Projet de Loïck Davi`,
    description: p.description,
  })),
];

for (const r of routes) {
  const file = r.path === "/" ? join(dist, "index.html") : join(dist, r.path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page(r.path, r.title, r.description));
}

/* 404 : la coquille de l'accueil, que le routeur reprend en charge. */
writeFileSync(join(dist, "404.html"), template);

const today = new Date().toISOString().slice(0, 10);
const prio = (p) => (p === "/" ? "1.0" : p === "/projets" ? "0.9" : p === "/contact" ? "0.7" : "0.8");
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  routes
    .filter((r) => r.path === "/")
    .map(
      (r) =>
        `  <url><loc>${site}${r.path}</loc><lastmod>${today}</lastmod><priority>${prio(r.path)}</priority></url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;
writeFileSync(join(dist, "sitemap.xml"), sitemap);

console.log(`SEO : ${routes.length} pages (accueil seule indexée) + sitemap.xml + 404.html`);
