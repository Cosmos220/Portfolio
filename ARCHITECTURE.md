# Portfolio de Loïck Davi — architecture (pour prompter sans le code)

Colle ce fichier en début de prompt, puis demande ta modification. Les chemins sont relatifs à la racine du dépôt.

## 1. Stack et déploiement
- Vue 3 (Composition API, `<script setup lang="ts">`), vue-router 4, Tailwind 4 (`@tailwindcss/vite`), Vite 8, TypeScript strict (`vue-tsc -b`, `erasableSyntaxOnly` : pas de paramètres de constructeur, `noUnusedLocals`).
- Three.js 0.185 (imports nommés, chargé en différé), Lenis (défilement doux). Pas de GSAP : les animations sont en CSS (`steps()`), JS maison et shaders.
- Scripts : `npm run dev`, `npm run build` (typecheck + build). Déploiement GitHub Pages par `.github/workflows/deploy.yml`, domaine `https://portfolio.loickdavi.fr/` (`public/CNAME`).
- Site 100 % statique : aucun backend. Le contenu vient de `src/data/content.ts`.

- **SEO** : `index.html` (meta, Open Graph, Twitter, JSON-LD Person/WebSite, `<noscript>`), `src/data/seo.json` (titres/descriptions des pages), `src/composables/useSeo.ts` (met le `<head>` à jour à chaque navigation), `scripts/seo.mjs` (lancé par `npm run build` : génère `dist/<route>/index.html` avec les bonnes balises pour chaque page et projet, `sitemap.xml`, `404.html`), `public/robots.txt`, `public/og-image.png` (1200×630). Un nouveau projet dans `content.ts` est référencé automatiquement.

## 2. Direction artistique (ctOS / Watch Dogs)
- Noir et gris neutres, texte blanc, **cyan `--cyan #3ee7ff`** réservé aux éléments interactifs, bleu `--blue` rare, **rouge `--red`** uniquement pour les alertes. Pas de dominante bleue.
- Jetons dans `src/style.css` (`:root`) : `--background --surface --card --foreground --muted --muted-2 --border --border-strong --cyan --blue --red --accent`. Polices : Hanken Grotesk (texte), Geist Mono (mono), Silkscreen (`font-pixel`, étiquettes de HUD).
- Règles d'animation : mouvements « par crans » (`steps()`), jamais de grosses translations saccadées ; tout a un repli `prefers-reduced-motion`. Rien de permanent et de bruyant.
- Le corps de page est transparent : la ville 3D est un canvas fixe derrière (z-index −1) ; les sections posent un voile sombre pour la lisibilité.

## 3. Arborescence utile
```
src/
  main.ts                 point d'entrée, monte l'app et le routeur
  App.vue                 assemble tout (voir §4)
  style.css               jetons, utilitaires (.panel, .chip, .sys-brackets, .glitch…), animations globales
  router/index.ts         routes
  views/                  HomeView, ProjectsView, ProjectDetailView, ContactView
  data/
    content.ts            TOUT le contenu : profile, about, stack, skillDescriptions, profileCard, projects, socials…
    assets.ts             asset(path) → URL d'une image (import.meta.glob)
    techIcons.ts          icônes des technologies
  composables/
    useCityCamera.ts      défilement/route → points de vue de la ville
    useRubrics.ts         les 5 rubriques (RUBRICS) + go(rubrique)
    useNotify.ts          file de notifications système
    useSmoothScroll.ts    Lenis
    useChiptune.ts        sons de l'interface
  directives/scramble.ts  v-scramble : effet de décryptage du texte
  city/                   MOTEUR 3D (aucune dépendance à Vue sauf state.ts)
    generate.ts           ville procédurale (graine fixe), quartiers, repères (landmarks)
    stations.ts           points de vue de la caméra par rubrique + detailStation(slug)
    director.ts           caméra : amortissement, dérive, parallaxe souris
    shaders.ts            GLSL : bâtiments, sol, arcs, balises, trafic, poussière, ciel
    createScene.ts        scène Three.js (InstancedMesh, sélection, projection)
    state.ts              pont Vue ↔ ville : cityState réactif + ordres de caméra
    random.ts             générateur pseudo-aléatoire (mulberry32)
  components/
    city/CityBackdrop.vue    canvas, boucle de rendu, WebGL/qualité/repli
    city/CityFallback.vue    skyline SVG si pas de WebGL
    city/SelectionLock.vue   survol/clic des 5 bâtiments CAM-00n (pointeur sur la fenêtre + rayon), cadre, fiche BUILDING IDENTIFIED
    city/CameraFeed.vue      réseau de surveillance : liste, phases ACCESSING/CONNECTED, interférence, cadre vidéo, Échap
    IntroLoader.vue          écran de démarrage d'origine (formes, blocs, écran titre)
    SiteHeader.vue / PhoneNav.vue   navigation par rubriques + menu « smartphone »
    StatusHud.vue            ligne d'état bas-gauche (liaison, secteur, coordonnées)
    NotificationStack.vue    notifications de déplacement
    TargetReticle.vue   mire de ciblage
    IntroHero.vue, About.vue, TechStack.vue (+ SkillTree.vue), Projects.vue, ProjectCard.vue,
    ContactCta.vue, GithubProfiler.vue, MarqueeBand.vue, SiteFooter.vue, CvActions.vue,
    EasterEggCreeper.vue, TraceRoute.vue, Reveal.vue
    ui/                      Modal, PhoneMockup, CamFrame, LedMask, PixelSprite, TechIcon, TypeLine
  assets/img, docs (CV PDF), sounds
```
Fichiers présents mais **inutilisés** : `Beams.vue`, `ui/EtheralShadow.vue`, `ObjectiveToast.vue`, `SkillNetwork.vue`, `CtaFeature.vue`/`Testimonials.vue` (à vérifier). Supprimables.

## 4. Montage de l'application (`App.vue`)
`App` fournit `provide("loading", loading)` ; il appelle `useCityCamera(loading)`, `useSmoothScroll()` et `showCity(true)` à la fin de l'intro.

Routes : `/` (Home : hero, à propos, stack, projets sélectionnés, contact), `/projets`, `/projets/:slug`, `/contact`, le reste redirige vers `/`.

## 5. La ville 3D
- **Génération** (`generate.ts`) : grille de blocs (24×24 en « full », 16×16 en « lite »), pas de 18, rues aux multiples de 18, 5 quartiers (centre, nord, docks, industrie, périphérie), graine `20130527`. `getCity(quality)` est mis en cache et renvoie `buildings`, `landmarks` (les plus hauts), `districts`.
- **Rendu** (`createScene.ts`) : un seul `InstancedMesh` pour les bâtiments, tout le détail (fenêtres, routes, brouillard exp2) est calculé dans les shaders, sans texture. Arcs réseau entre repères, balises (feux rouges aériens), trafic en points, poussière (full seulement). Sélection : cadre filaire + faisceau sur un bâtiment (`select()`), `project()` convertit un point du monde en pixels.
- **Qualité** (`CityBackdrop.vue`) : « lite » si écran <820 px, tactile ou ≤2 cœurs ; pas de WebGL, `saveData` ou contexte perdu → `CityFallback`. Résolution plafonnée à 1,25 et baissée automatiquement si les images tardent.
- **Performance** : 60 i/s quand la caméra ou la souris bouge, 30 i/s au repos ; boucle stoppée si l'onglet est masqué ; mouvement réduit = une seule image.
- **Caméra** (`director.ts`, `stations.ts`) : une station par rubrique (`profil, parcours, competences, projets, contact`, plus `intro-*` et `detail`) avec position, point visé, fov et `veil` (opacité du voile sombre). `useCityCamera` observe la section visible et interpole entre deux stations pendant le défilement.
- **Réseau de surveillance** : `generate.ts` désigne 5 bâtiments existants (`city.cams`, CAM-001 profil, 002 projets, 003 compétences, 004 parcours, 005 contact) et leur donne une caméra fixe posée à une intersection (`pos`, `look`, `fov`). `stations.camStation(cam)` les convertit en point de vue. `cityState.surv` = `{ mode: "aerial" | "camera", phase: idle|accessing|switching|connected|live, id, hover, signal }` ; `connectCamera(id)` / `exitCamera()` pilotent la prise de contrôle (coupure franche pendant l'interférence, puis ouverture de la rubrique via `setCamNavigator`). En mode caméra, `setCityTarget`/`setCityCustom` mémorisent leur ordre sans l'appliquer et `useCityCamera` n'agit plus ; au retour, il reprend la rubrique visible. `renderer.pick(x, y)` tire un rayon contre les boîtes de tous les bâtiments (le plus proche gagne : aucun faux positif). `SelectionLock` n'interroge la ville que si le pointeur est sur du fond (pas de lien, texte, carte, panneau…).
- **Pont Vue** (`state.ts`) : `cityState` (ready, supported, visible, quality, station, district, veil, cam, nodes), `setCityTarget(a, b?, t)`, `setCityCustom(id, station)`, `showCity()`, `getCityRenderer()`. Les ordres reçus avant le chargement de Three.js sont retenus puis appliqués.

## 6. Navigation et rubriques
`useRubrics.ts` définit `RUBRICS` une fois (Profil `/#top`, Projets `/projets`, Compétences `/#stack`, Parcours `/#about`, Contact `/contact`) et `go(rubrique)`. L'en-tête (liens), `PhoneNav` (menu smartphone) s'en servent : une seule source.

## 7. Contenu (`src/data/content.ts`)
`profile` (nom, rôle, e-mail, bio), `about`, `socials`, `stack` (4 catégories, utilisée par la roue `SkillTree`), `skillNetworkCategories` + `skillDescriptions`, `profileCard` (6 lignes de la fiche de profil), `Project` (`slug, title, description, tags, image, images?, github?, liveUrl?, status?`), `projects`, `featuredProjects` (3 sur l'accueil), `projectStatus(p)` (En ligne / Code public / Réalisé), `getProject(slug)`.
Ajouter un projet = une entrée dans `projects` + ses images dans `src/assets/img/Projects/...`.

## 8. Fonctions interactives
- **Mire** : carré suiveur sur les cibles (TargetReticle).
- **Easter egg** : creeper pixel caché dans le pied de page (MP3 réel dans `src/assets/sounds`).
- **CV** : modale de téléchargement (`CvActions`, `ui/Modal`).

## 9. Conventions pour les modifications
- Pas de constructeur à paramètres de propriété ; pas de variables inutilisées.
- Couleurs via les jetons, jamais de bleu en dur ; cyan = interactif, rouge = alerte.
- Toute animation : version `steps()` + repli `prefers-reduced-motion`.
- Aucune donnée personnelle inventée ; le contenu reste dans `content.ts`.
- Ne pas importer Three.js ailleurs que dans `src/city/createScene.ts` (il doit rester dans le chunk différé).
- Si la grille de `generate.ts` change, revoir les coordonnées de `stations.ts`.

## 10. Limites connues
- Seuls les 5 bâtiments CAM-00n sont sélectionnables, et seulement sur les zones de fond de la page (les clics sur du contenu ne traversent jamais). Sur mobile, pas de survol : la liste du réseau ou un appui sur la ville donnent accès aux caméras.
- Pas de réseau 3D sélectionnable.
- Le chunk Three.js pèse ≈541 kB (137 kB gzip), chargé après l'affichage initial.
