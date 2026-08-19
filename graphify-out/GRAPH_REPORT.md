# Graph Report - .  (2026-06-25)

## Corpus Check
- Corpus is ~5,308 words - fits in a single context window. You may not need a graph.

## Summary
- 96 nodes · 75 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_TypeScript Node Config|TypeScript Node Config]]
- [[_COMMUNITY_Portfolio Content Data|Portfolio Content Data]]
- [[_COMMUNITY_TypeScript App Config|TypeScript App Config]]
- [[_COMMUNITY_Package Manifest & Scripts|Package Manifest & Scripts]]
- [[_COMMUNITY_Hero Section Component|Hero Section Component]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Brand & Visual Identity|Brand & Visual Identity]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Ethereal Shadow Effect|Ethereal Shadow Effect]]
- [[_COMMUNITY_TypeScript Root Config|TypeScript Root Config]]
- [[_COMMUNITY_Framework Logos|Framework Logos]]
- [[_COMMUNITY_Contact Footer|Contact Footer]]
- [[_COMMUNITY_Icon Sprite|Icon Sprite]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `compilerOptions` - 7 edges
3. `scripts` - 4 edges
4. `App HTML Shell` - 4 edges
5. `Charcoal Theme Color #161618` - 2 edges
6. `private` - 1 edges
7. `dev` - 1 edges
8. `build` - 1 edges
9. `preview` - 1 edges
10. `@tailwindcss/vite` - 1 edges

## Surprising Connections (you probably didn't know these)
- `Hero Isometric Slab Artwork` --conceptually_related_to--> `Charcoal Theme Color #161618`  [INFERRED]
  src/assets/hero.png → index.html
- `App HTML Shell` --references--> `Site Favicon`  [EXTRACTED]
  index.html → public/favicon.svg
- `App HTML Shell` --conceptually_related_to--> `Vue 3 + TypeScript + Vite Template`  [INFERRED]
  index.html → README.md
- `Vite Logo` --semantically_similar_to--> `Vue Logo`  [INFERRED] [semantically similar]
  src/assets/vite.svg → src/assets/vue.svg

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Visual Identity Assets** — assets_hero_isometric_slabs, public_favicon, public_icons, index_theme_color [INFERRED 0.75]

## Communities (23 total, 4 thin omitted)

### Community 0 - "TypeScript Node Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 1 - "Portfolio Content Data"
Cohesion: 0.18
Nodes (10): headerLinks, marqueeItems, offer, profile, Project, projects, socials, stack (+2 more)

### Community 2 - "TypeScript App Config"
Cohesion: 0.20
Nodes (9): compilerOptions, erasableSyntaxOnly, noFallthroughCasesInSwitch, noUnusedLocals, noUnusedParameters, tsBuildInfoFile, types, extends (+1 more)

### Community 3 - "Package Manifest & Scripts"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, preview, type, version

### Community 4 - "Hero Section Component"
Cohesion: 0.29
Nodes (4): fadeStyle, initials, nameStyle, portraitStyle

### Community 5 - "Dev Dependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @types/node, typescript, vite, @vitejs/plugin-vue, vue-tsc, @vue/tsconfig

### Community 6 - "Brand & Visual Identity"
Cohesion: 0.33
Nodes (6): Hero Isometric Slab Artwork, App HTML Shell, Google Fonts (Hanken Grotesk + Geist Mono), Charcoal Theme Color #161618, Site Favicon, Vue 3 + TypeScript + Vite Template

### Community 7 - "Runtime Dependencies"
Cohesion: 0.40
Nodes (5): dependencies, lenis, tailwindcss, @tailwindcss/vite, vue

### Community 8 - "Ethereal Shadow Effect"
Cohesion: 0.50
Nodes (3): animationDuration, baseFreq, displacementScale

## Knowledge Gaps
- **66 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+61 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Dev Dependencies` to `Package Manifest & Scripts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Manifest & Scripts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TypeScript Node Config` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._