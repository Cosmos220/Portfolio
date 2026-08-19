/* ============================================================
   CONTENU DU PORTFOLIO — édite ce seul fichier.

   ⚠️  Tout ce qui est entre [CROCHETS] est un placeholder à
       remplacer par TES infos. Les listes de technos sont des
       valeurs de démonstration courantes : adapte-les à ta stack.
   ============================================================ */

export const profile = {
  name: "DAVI",
  firstName: "Loïck",
  lastName: "DAVI", // 2e ligne du hero
  role: "Futur développeur d'applications", // ex : Développeur Frontend
  company: "IUT de Lens", // société actuelle (soulignée dans le hero)
  companyUrl: "",
  availabilityStatus: "Disponible",
  availabilityNote: "",
  focusLine: "",
  slogan: "",
  // Coordonnées (page Contact)
  location: "Hauts-de-France, France",
  availabilityLong:
    "Je suis actuellement à la recherche de nouvelles opportunités. Que ce soit pour une question, une offre de stage, d'alternance ou simplement pour échanger, le moyen le plus rapide de me joindre est par e-mail.",
  bio: [
    "Je m’appelle Loïck Davi et je suis actuellement étudiant à l’IUT de Lens en informatique, avec une spécialisation en développement d’applications. Passionné par l’univers du code depuis mes débuts, j’ai choisi ce cursus pour transformer ma curiosité en une expertise technique solide. Mon objectif est simple : concevoir des solutions numériques qui soient à la fois performantes, intuitives et utiles aux utilisateurs.",
    "Aujourd'hui, je souhaite mettre mon dynamisme et ma capacité d'apprentissage au service d'une entreprise innovante. Je suis activement à la recherche d'une alternance débutant en avril 2026. Rigoureux, autonome et doté d'un bon esprit d'équipe, je suis prêt à m’investir pleinement dans vos projets pour continuer à progresser tout en apportant une réelle valeur ajoutée à votre équipe de développement."
  ],
  email: "daviloick@gmail.com",
  calLink: "",
  metaDescription:
    "Portfolio de DAVI Loïck, Futur développeur d'applications.",
};

/* Section « À propos » de l'accueil. La bio vient de profile.bio. */
export const about = {
  eyebrow: "// À propos",
  heading: "Derrière le code.",
  facts: [
    { label: "Formation", value: "BUT Informatique · IUT de Lens" },
    { label: "Objectif", value: "Alternance — avril 2026" },
    { label: "Basé à", value: "Hauts-de-France, France" },
  ],
};

/* Liens en haut à droite du header (comme « Zenith Studio · LinkedIn »). */
export const headerLinks = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/loïck-davi" },
];

export const socials = [
  { label: "LinkedIn", short: "in", href: "https://www.linkedin.com/in/loïck-davi" },
  { label: "GitHub", short: "gh", href: "https://github.com/Cosmos220" },
];

/* Mots-clés / citations qui défilent dans le bandeau marquee. */
export const marqueeItems = [
  "Java",
  "Python",
  "PHP",
  "Laravel",
  "JavaScript",
  "TypeScript",
  "Vue.js",
  "Angular",
  "HTML5",
  "CSS3",
  "MySQL",
  "Podman",
  "Git"
];

/* Stack technique — valeurs de démo, adapte à TA stack. */
export const stack: { title: string; items: string[] }[] = [
  {
    title: "Langages & Frameworks",
    items: ["Java", "Python", "PHP", "Laravel", "JavaScript", "TypeScript", "Vue.js", "Angular"],
  },
  {
    title: "Outils & Base de données",
    items: ["HTML5", "CSS3", "MySQL", "Podman", "Git"],
  }
];

export type Project = {
  slug: string; // identifiant d'URL : /projets/<slug>
  title: string;
  description: string; // résumé court (cartes)
  longDescription?: string; // texte complet (page détail)
  features?: string[]; // points clés (page détail)
  tags: string[];
  github?: string; // lien code source (optionnel)
  liveUrl?: string; // démo en ligne réelle (optionnel)
  image?: string; // visuel de couverture
  images?: string[]; // galerie (page détail) ; défaut = [image]
  featured?: boolean; // affiché sur la page d'accueil
};

/* ⭐ Pour mettre un projet en avant sur l'accueil : `featured: true`.
   Pour l'ajouter ailleurs, il apparaît automatiquement sur /projets. */
export const projects: Project[] = [
  {
    slug: "larsen",
    title: "Larsen",
    description:
      "Blog de musique de type grunge en collaboration avec le département MMI.",
    longDescription:
      "Larsen est une plateforme web immersive dédiée à la culture et à la musique Grunge. Ce projet a été réalisé dans le cadre d'un Marathon Web (SAÉ) à l'IUT de Lens. Il s'agit d'un projet collaboratif interdisciplinaire alliant l'expertise technique du département Informatique et la vision créative du département MMI (Métiers du Multimédia et de l'Internet).",
    features: [
      "Design Immersif : Une interface utilisateur unique inspirée de l'esthétique Grunge (textures, typographies, ambiance sombre).",
      "Système d'Articles : Blog dynamique pour explorer l'histoire des groupes emblématiques (Nirvana, Pearl Jam, etc.).",
      "Authentification Sécurisée : Gestion complète des utilisateurs via Laravel Fortify.",
      "Performance : Utilisation de Vite pour un bundling ultra-rapide des assets.",
      "Responsive : Interface entièrement adaptée aux mobiles et desktops grâce à TailwindCSS.",
    ],
    tags: ["PHP", "MySQL", "Tailwind CSS"],
    github: "https://github.com/Cosmos220/Larsen-Marathon-Web",
    image: "/assets/img/Projects/Larsen/Larsen_2.png",
    images: [
      "/assets/img/Projects/Larsen/Larsen_2.png",
      "/assets/img/Projects/Larsen/Larsen_1.png",
    ],
    featured: true,
  },
  {
    slug: "bomberman",
    title: "Bomberman",
    description: "Le jeux Bomberman réalisé en javafx",
    longDescription:
      "Une réimplémentation du célèbre jeu d'arcade Bomberman développée en Java avec le framework JavaFX. Ce projet a été réalisé dans le cadre du BUT Informatique (IUT de Lens / Université d'Artois).",
    features: [
      "Déplacement fluide du personnage sur une grille.",
      "Système de Bombes : Posez des bombes pour détruire les obstacles et les ennemis.",
      "Inventaire de Bombes : Possibilité de sélectionner différents types de bombes via un menu dédié.",
      "Gestion des Vies (Pv) : Système de points de vie avec affichage visuel (cœurs).",
      "Ennemis : IA basique gérant les déplacements des ennemis.",
      "Conditions de Victoire/Défaite : Gestion des états \"Game Over\" et \"Victoire\" avec possibilité de relancer la partie.",
    ],
    tags: ["Java", "JavaFX"],
    github: "https://github.com/Cosmos220/JavaFX-Jeux-Bomberman",
    image: "/assets/img/Projects/Bomberman/Bomberman_1.png",
    featured: true,
  },
  {
    slug: "polaris",
    title: "Polaris",
    description:
      "Une application Todo list pwa pour gérer mes taches au quotidien.",
    longDescription:
      "Polaris est une Progressive Web App (PWA) moderne et intuitive conçue pour offrir une gestion de tâches fluide et robuste. Développée avec Vue 3 et Vite, l'application met l'accent sur l'accessibilité et la continuité de service, permettant une utilisation optimale même sans connexion internet grâce à une synchronisation intelligente.",
    features: [
      "Organisation Intelligente : Gérez vos priorités via des listes personnalisées ou des vues automatiques comme \"Importants\" et une \"Vue par Jour\" pour planifier votre calendrier.",
      "Mode Hors-ligne & Synchro : Travaillez sans interruption ; vos modifications sont sauvegardées localement via IndexedDB et synchronisées automatiquement dès que vous retrouvez une connexion.",
      "Interface Personnalisable : Design minimaliste avec un support complet du mode sombre/clair et la possibilité de personnaliser entièrement la couleur d'accentuation de l'interface.",
      "Navigation Immersive : Une expérience \"mobile-first\" incluant le support des gestes tactiles (swipe) pour naviguer entre les menus et une interface responsive adaptée à tous les écrans.",
      "Authentification Sécurisée : Système complet de gestion des utilisateurs incluant l'inscription, la connexion sécurisée",
      "Performance Optimisée : Utilisation de Pinia pour une gestion d'état réactive et de Vite pour un bundling ultra-rapide des ressources.",
    ],
    tags: ["Vue.js", "API REST", "Python", "Flask"],
    image: "/assets/img/Projects/Polaris/Polaris.png",
    featured: true,
  },
  {
    slug: "guessraudit",
    title: "GuessrAudit",
    description: "Une extension pour le site OpenGuessr.",
    longDescription:
      "GuessrAudit est une extension de navigateur qui intercepte et analyse le trafic réseau du jeu web OpenGuessr. Grâce à un travail de reverse engineering sur les communications entre le client et l'API, elle permet de contourner les mécaniques du jeu : révélation des coordonnées GPS cachées et modification directe des statistiques du joueur (Expérience, Badges, Pins). Cette solution met en lumière les risques liés au manque de validation stricte côté serveur dans les applications web modernes.",
    features: [
      "Reverse engineering du fonctionnement client d'OpenGuessr.",
      "Interception et analyse des appels API du jeu.",
      "Extension navigateur en JavaScript.",
    ],
    tags: ["Reverse engineering", "JavaScript", "API"],
    image: "/assets/img/Projects/GuessrAudit/GuessrAudit.png",
    featured: false,
  },
];

/* Helpers projets — gardent les vues et le routeur sans logique dupliquée. */
export const featuredProjects = projects.filter((p) => p.featured);
export const getProject = (slug: string) =>
  projects.find((p) => p.slug === slug);

export const offer = {
  eyebrow: "",
  title: "",
  description: "",
  bullets: [],
  ctaLabel: "",
};

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
};

export const testimonials: Testimonial[] = [];
