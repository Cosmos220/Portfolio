/* Résolution des fichiers de `src/assets`.

   Les chemins écrits dans `content.ts` (« /assets/img/Projects/… ») sont des
   URL absolues : elles ne fonctionneraient que si les fichiers étaient dans
   `public/`. Or ils sont dans `src/assets/`, que Vite ne sert pas tel quel —
   d'où les 4 cartes projets qui affichaient toutes leur placeholder.

   `import.meta.glob` en mode `eager` demande à Vite d'inclure ces fichiers
   dans le build et renvoie leurs URL finales (avec empreinte, donc cache
   long). On garde ainsi des chemins lisibles côté contenu. */

const files = import.meta.glob<string>(
  "../assets/img/**/*.{png,jpg,jpeg,webp,avif,svg,gif}",
  { eager: true, query: "?url", import: "default" },
);

/* Les clés du glob sont relatives à CE fichier (« ../assets/img/… ») ; les
   chemins de contenu commencent par « /assets/… ». Le préfixe « .. » suffit
   donc à passer des seconds aux premières. */
export function asset(path?: string): string | undefined {
  if (!path) return undefined;
  /* Une URL externe ou déjà résolue est renvoyée telle quelle. */
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  const resolved = files[`..${path}`];
  if (!resolved && import.meta.env.DEV) {
    /* Silencieux en production : l'appelant retombe sur son placeholder. */
    console.warn(`[assets] introuvable : ${path}`);
  }
  return resolved;
}

/* Le CV est importé directement : un seul fichier, pas besoin de glob. */
export { default as cvUrl } from "../assets/docs/CV_Davi_Loïck_Développeur_dapplications.pdf?url";

/* Son de l'easter egg. Il n'est jamais chargé au démarrage : le composant ne
   le télécharge qu'au survol du sprite (voir EasterEggCreeper), pour ne pas
   imposer 118 Ko à tous les visiteurs pour un détail que la plupart ne
   trouveront jamais. */
export { default as creeperSoundUrl } from "../assets/sounds/Creeper Minecraft Sound Effect.mp3?url";

/* Nom proposé au téléchargement : le fichier réel porte des accents et une
   empreinte de build, ce qui donnerait un nom illisible dans le dossier
   « Téléchargements » du visiteur. */
export const cvFileName = "CV-Loick-Davi.pdf";
