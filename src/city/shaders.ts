/* Shaders de la ville.

   Tout le détail visuel — fenêtres, marquage des routes, impulsions du réseau —
   est CALCULÉ à partir des coordonnées dans le shader : aucune texture à
   télécharger, et un seul appel de dessin pour des centaines d'immeubles.

   Le brouillard est refait à la main dans chaque shader (même formule
   partout) plutôt que d'utiliser celui de Three.js, qui n'est pas appliqué
   aux `ShaderMaterial` sans branchement supplémentaire. */

const FOG = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  float fogAmount(float dist) {
    return 1.0 - exp(-pow(dist * uFogDensity, 2.0));
  }
`;

/* ---- Bâtiments (InstancedMesh) --------------------------------- */
export const BUILDING_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aTone;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vSeed;
  varying float vTone;
  varying float vDist;
  void main() {
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    /* Les instances ne sont qu'étirées (jamais tournées) : la normale d'une
       face reste alignée sur un axe, il n'y a rien à corriger. */
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vSeed = aSeed;
    vTone = aTone;
    vec4 mv = viewMatrix * wp;
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const BUILDING_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uWindows;
  ${FOG}
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vSeed;
  varying float vTone;
  varying float vDist;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 n = normalize(vNormalW);
    float wall = 1.0 - step(0.5, abs(n.y));

    /* Gris anthracite, avec une variation propre à chaque immeuble. */
    float tone = 0.1 + vTone * 0.085;
    vec3 sun = normalize(vec3(-0.45, 0.8, 0.35));
    float diff = max(dot(n, sun), 0.0);
    vec3 col = vec3(tone) * (0.55 + 1.25 * diff);
    /* Léger reflet bleuté : le gris pur paraît mort sur un fond bleu nuit. */
    col += vec3(0.008) * diff;

    /* Toits un peu plus clairs : ils accrochent la lumière du ciel. */
    if (n.y > 0.5) col = vec3(tone * 1.7 + 0.018);

    /* Les pieds d'immeuble sont dans l'ombre, les sommets émergent. */
    col *= 0.45 + 0.65 * smoothstep(0.0, 70.0, vWorld.y);

    if (wall > 0.5 && uWindows > 0.0) {
      /* Position le long de la façade : z pour les faces tournées vers x,
         x pour les autres. */
      bool faceX = abs(n.x) > 0.5;
      float u = faceX ? vWorld.z : vWorld.x;
      float v = vWorld.y;
      vec2 cell = vec2(floor(u / 2.6), floor(v / 3.4));
      vec2 f = vec2(fract(u / 2.6), fract(v / 3.4));
      float pane = step(0.27, f.x) * step(f.x, 0.73) * step(0.3, f.y) * step(f.y, 0.7);
      float h = hash(cell + vSeed * 91.7 + (faceX ? 17.0 : 0.0));

      /* ~5 % de fenêtres allumées : la ville dort, elle ne brille pas. */
      float lit = step(0.968, h);
      float flick = 0.75 + 0.25 * sin(uTime * 0.7 + h * 60.0);

      /* À distance les fenêtres se réduisent à un grésillement : on les
         estompe plutôt que de laisser un moiré. */
      float near = 1.0 - smoothstep(60.0, 190.0, vDist);

      col = mix(col, col * 0.84, pane * 0.7 * near);
      col += pane * lit * vec3(0.85, 0.9, 0.95) * 0.42 * flick * near * uWindows;
    }

    col = mix(col, uFogColor, fogAmount(vDist));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ---- Sol et rues ----------------------------------------------- */
export const GROUND_VERT = /* glsl */ `
  varying vec3 vWorld;
  varying float vDist;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mv = viewMatrix * wp;
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const GROUND_FRAG = /* glsl */ `
  precision highp float;
  uniform float uPitch;
  uniform float uHalf;
  uniform float uTime;
  ${FOG}
  varying vec3 vWorld;
  varying float vDist;

  void main() {
    vec2 p = vWorld.xz;
    /* Distance à l'axe de la rue la plus proche, sur chaque axe. Les rues
       passent par les multiples de uPitch (les blocs sont centrés entre
       elles). */
    vec2 q = abs(mod(p + uPitch * 0.5, uPitch) - uPitch * 0.5);
    float roadX = 1.0 - smoothstep(1.7, 2.1, q.x);
    float roadZ = 1.0 - smoothstep(1.7, 2.1, q.y);
    float inside = 1.0 - smoothstep(uHalf, uHalf + 18.0, max(abs(p.x), abs(p.y)));
    float road = max(roadX, roadZ) * inside;

    vec3 col = vec3(0.012);
    col = mix(col, vec3(0.034), road);

    /* Ligne centrale en pointillés, très ténue. */
    float lineX = (1.0 - smoothstep(0.05, 0.16, q.x)) * step(0.5, fract(p.y / 5.0));
    float lineZ = (1.0 - smoothstep(0.05, 0.16, q.y)) * step(0.5, fract(p.x / 5.0));
    col += (lineX * roadX + lineZ * roadZ) * inside * vec3(0.07);

    /* Un point lumineux à chaque carrefour. */
    float node = exp(-dot(q, q) * 0.9) * inside;
    col += node * vec3(0.0, 0.16, 0.22);

    /* Au-delà de la ville : un quadrillage de plan, comme une carte. */
    vec2 g = abs(mod(p + 45.0, 90.0) - 45.0);
    float grid = (1.0 - smoothstep(0.0, 0.5, min(g.x, g.y))) * (1.0 - inside);
    col += grid * vec3(0.0, 0.04, 0.06);

    col = mix(col, uFogColor, fogAmount(vDist));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ---- Réseau : arcs de données entre les tours ------------------- */
export const ARC_VERT = /* glsl */ `
  attribute float aT;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aRed;
  varying float vT;
  varying float vPhase;
  varying float vSpeed;
  varying float vRed;
  varying float vDist;
  void main() {
    vT = aT;
    vPhase = aPhase;
    vSpeed = aSpeed;
    vRed = aRed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const ARC_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uIntensity;
  ${FOG}
  varying float vT;
  varying float vPhase;
  varying float vSpeed;
  varying float vRed;
  varying float vDist;
  void main() {
    /* Une impulsion qui parcourt l'arc : tête vive, traîne courte. */
    float head = fract(vPhase - uTime * vSpeed);
    float d = fract(vT - head);
    float pulse = exp(-d * 11.0) * step(d, 0.5);
    float a = (0.07 + 0.93 * pulse) * uIntensity;
    vec3 cyan = vec3(0.22, 0.88, 1.0);
    vec3 red = vec3(1.0, 0.18, 0.28);
    vec3 col = mix(cyan, red, vRed);
    a *= 1.0 - fogAmount(vDist);
    gl_FragColor = vec4(col, a);
  }
`;

/* ---- Points lumineux (balises, circulation, poussière) ---------- */
export const POINT_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aKind;
  uniform float uTime;
  uniform float uScale;
  varying float vKind;
  varying float vBlink;
  varying float vDist;
  void main() {
    vKind = aKind;
    /* Les balises rouges clignotent lentement, comme les feux d'avertissement
       des tours ; les autres respirent à peine. */
    float rate = aKind > 1.5 ? 1.6 : 0.7;
    vBlink = 0.55 + 0.45 * sin(uTime * rate + aPhase * 6.2831);
    if (aKind > 1.5) vBlink = step(0.0, sin(uTime * rate + aPhase * 6.2831)) * 0.85 + 0.15;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_PointSize = aSize * uScale / max(vDist, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const POINT_FRAG = /* glsl */ `
  precision highp float;
  ${FOG}
  varying float vKind;
  varying float vBlink;
  varying float vDist;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float core = smoothstep(0.5, 0.0, r);
    vec3 cyan = vec3(0.25, 0.9, 1.0);
    vec3 white = vec3(0.92);
    vec3 red = vec3(1.0, 0.2, 0.3);
    vec3 col = vKind > 1.5 ? red : (vKind > 0.5 ? white : cyan);
    float a = core * core * vBlink;
    a *= 1.0 - fogAmount(vDist);
    gl_FragColor = vec4(col, a);
  }
`;

/* ---- Circulation : points qui suivent les rues ------------------ */
export const TRAFFIC_VERT = /* glsl */ `
  attribute vec4 aLane;   /* x : coordonnée de la rue, y : axe (0 = x, 1 = z), z : vitesse, w : phase */
  uniform float uTime;
  uniform float uHalf;
  uniform float uScale;
  varying float vDist;
  varying float vFade;
  void main() {
    float span = uHalf * 2.0;
    float along = mod(aLane.w * span + uTime * aLane.z, span) - uHalf;
    vec3 p = aLane.y < 0.5
      ? vec3(along, 0.5, aLane.x)
      : vec3(aLane.x, 0.5, along);
    /* Fondu aux extrémités : un point qui disparaît d'un coup trahit la boucle. */
    vFade = smoothstep(0.0, 14.0, uHalf - abs(along));
    vec4 mv = viewMatrix * vec4(p, 1.0);
    vDist = -mv.z;
    gl_PointSize = 2.6 * uScale / max(vDist, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const TRAFFIC_FRAG = /* glsl */ `
  precision highp float;
  ${FOG}
  varying float vDist;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.05, r) * vFade * 0.9;
    a *= 1.0 - fogAmount(vDist);
    gl_FragColor = vec4(0.85, 0.93, 1.0, a);
  }
`;

/* ---- Poussière en suspension ------------------------------------ */
export const DUST_VERT = /* glsl */ `
  attribute vec4 aSeed;   /* xyz : position de base, w : phase */
  uniform float uTime;
  uniform float uScale;
  varying float vDist;
  varying float vTw;
  void main() {
    float H = 240.0;
    vec3 p = aSeed.xyz;
    p.y = mod(p.y + uTime * (1.2 + aSeed.w * 2.0), H);
    p.x += sin(uTime * 0.15 + aSeed.w * 30.0) * 5.0;
    p.z += cos(uTime * 0.12 + aSeed.w * 20.0) * 5.0;
    vTw = 0.5 + 0.5 * sin(uTime * 0.8 + aSeed.w * 50.0);
    vec4 mv = viewMatrix * vec4(p, 1.0);
    vDist = -mv.z;
    gl_PointSize = 1.7 * uScale / max(vDist, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const DUST_FRAG = /* glsl */ `
  precision highp float;
  ${FOG}
  varying float vDist;
  varying float vTw;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r) * 0.32 * vTw;
    a *= 1.0 - fogAmount(vDist);
    gl_FragColor = vec4(0.7, 0.88, 1.0, a);
  }
`;

/* ---- Ciel ------------------------------------------------------- */
export const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    /* Collé au plan lointain : le ciel ne doit jamais cacher la ville. */
    gl_Position.z = gl_Position.w * 0.9999;
  }
`;

export const SKY_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    /* La lueur se concentre sur l'horizon et s'éteint vite vers le haut. */
    vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));
    gl_FragColor = vec4(col, 1.0);
  }
`;
