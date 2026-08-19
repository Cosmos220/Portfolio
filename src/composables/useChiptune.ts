/* Bruitages 8-bit synthétisés à la volée.

   Pas de fichiers audio : une onde carrée pilotée par Web Audio reproduit
   exactement ce que faisaient les puces sonores d'époque, pèse zéro octet
   au téléchargement, et reste accordable depuis le code.

   Le contexte audio n'est créé qu'au premier son — les navigateurs refusent
   de le démarrer avant une interaction, et en créer un au chargement le
   laisserait suspendu tout en consommant des ressources. */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  /* Safari et Chrome suspendent le contexte tant qu'aucun geste utilisateur
     n'a eu lieu ; on le réveille au premier appel déclenché par un clic. */
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/* ─── Échantillons audio (fichiers) ────────────────────────────────────────

   Le décodage est mutualisé et mémorisé : un même son cliqué dix fois ne doit
   être ni retéléchargé ni redécodé. La promesse en cours est aussi mémorisée,
   sinon deux appels rapprochés (survol puis clic) lanceraient deux requêtes. */
const sampleCache = new Map<string, AudioBuffer>();
const samplePending = new Map<string, Promise<AudioBuffer | null>>();

export function loadSample(url: string): Promise<AudioBuffer | null> {
  const cached = sampleCache.get(url);
  if (cached) return Promise.resolve(cached);
  const pending = samplePending.get(url);
  if (pending) return pending;

  const c = getCtx();
  if (!c) return Promise.resolve(null);

  const task = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await c.decodeAudioData(await res.arrayBuffer());
      sampleCache.set(url, buf);
      return buf;
    } catch {
      /* Fichier absent ou format refusé : l'appelant retombe sur la synthèse. */
      return null;
    } finally {
      samplePending.delete(url);
    }
  })();

  samplePending.set(url, task);
  return task;
}

/* Joue un échantillon déjà décodé. Renvoie false s'il ne l'est pas encore,
   pour que l'appelant décide (attendre, ou basculer sur la synthèse). */
export function playSample(
  url: string,
  opts: { offset?: number; gain?: number } = {},
): boolean {
  const c = getCtx();
  const buf = sampleCache.get(url);
  if (!c || !buf) return false;

  const src = c.createBufferSource();
  src.buffer = buf;
  const env = c.createGain();
  env.gain.value = opts.gain ?? 1;
  src.connect(env).connect(c.destination);
  /* `offset` permet de sauter le silence de tête du fichier. */
  src.start(0, opts.offset ?? 0);
  return true;
}

/* Tampon de bruit blanc, généré une fois et rejoué en boucle.

   Un oscillateur produit une hauteur ; un sifflement ou une explosion n'en
   ont pas — ce sont des spectres larges. Il faut donc du bruit, que l'on
   sculpte ensuite au filtre. C'est la différence entre un « bip » et un
   « pschhh ». */
let noiseBuffer: AudioBuffer | null = null;

function getNoise(c: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === c.sampleRate) return noiseBuffer;
  const len = Math.floor(c.sampleRate * 2);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

type NoiseHit = {
  /* Fréquence de coupure du filtre, au début puis à la fin : c'est ce
     balayage qui donne son mouvement au son. */
  from: number;
  to?: number;
  duration: number;
  at?: number;
  gain?: number;
  filter?: BiquadFilterType;
  q?: number;
};

function playNoise(hits: NoiseHit[]) {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  for (const h of hits) {
    const src = c.createBufferSource();
    src.buffer = getNoise(c);
    src.loop = true;

    const filt = c.createBiquadFilter();
    filt.type = h.filter ?? "bandpass";
    filt.Q.value = h.q ?? 1;

    const env = c.createGain();
    const start = now + (h.at ?? 0);
    const peak = h.gain ?? 0.06;

    filt.frequency.setValueAtTime(h.from, start);
    if (h.to) {
      filt.frequency.exponentialRampToValueAtTime(h.to, start + h.duration);
    }

    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(peak, start + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, start + h.duration);

    src.connect(filt).connect(env).connect(c.destination);
    src.start(start);
    src.stop(start + h.duration + 0.05);
  }
}

type Note = {
  freq: number;
  /* Fréquence d'arrivée : la note glisse de `freq` vers `to` sur toute sa
     durée. C'est ce glissement descendant qui fait « boum » plutôt qu'un
     simple bip grave — les explosions 8-bit d'époque n'étaient que ça. */
  to?: number;
  /* Décalage du début, en secondes, pour enchaîner des notes. */
  at?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
};

function play(notes: Note[]) {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  for (const n of notes) {
    const osc = c.createOscillator();
    const env = c.createGain();
    const start = now + (n.at ?? 0);
    const dur = n.duration ?? 0.08;
    const peak = n.gain ?? 0.06;

    osc.type = n.type ?? "square";
    osc.frequency.setValueAtTime(n.freq, start);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, start + dur);

    /* Enveloppe courte : une attaque instantanée puis une décroissance
       exponentielle, sinon chaque note claque (clic de coupure). */
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(peak, start + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(env).connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

/* Le clic alterne deux hauteurs voisines : répété vite, un son strictement
   identique devient vite lassant. */
let clickToggle = false;
export function sfxClick() {
  clickToggle = !clickToggle;
  play([{ freq: clickToggle ? 660 : 700, duration: 0.05, gain: 0.05 }]);
}

/* Achat : petit arpège ascendant, la récompense doit s'entendre. */
export function sfxBuy() {
  play([
    { freq: 523, at: 0, duration: 0.07 },
    { freq: 659, at: 0.06, duration: 0.07 },
    { freq: 784, at: 0.12, duration: 0.11 },
  ]);
}

/* Déblocage d'une nouvelle techno : plus haut et plus long que l'achat. */
export function sfxUnlock() {
  play([
    { freq: 784, at: 0, duration: 0.08 },
    { freq: 988, at: 0.07, duration: 0.08 },
    { freq: 1319, at: 0.14, duration: 0.16, gain: 0.07 },
  ]);
}

/* Le creeper caché : sifflement puis explosion.

   Le son officiel de Minecraft est un asset sous copyright Mojang, qu'on ne
   peut pas redistribuer ici — celui-ci est donc une reconstitution.

   Tout repose sur du bruit et non sur des oscillateurs : un sifflement, comme
   une explosion, n'a pas de hauteur définie. Une version aux ondes carrées
   donnerait des bips de jeu d'arcade, pas un « ssss » suivi d'un « boum ». */
export function sfxCreeper() {
  playNoise([
    /* Sifflement : bande passante étroite qui monte, c'est de l'air qui
       s'échappe sous pression croissante. */
    { at: 0, duration: 0.62, from: 1100, to: 4200, gain: 0.05, q: 1.4 },
    /* Explosion : même bruit, mais passe-bas qui s'effondre — le spectre
       s'assombrit à mesure que le souffle s'éloigne. */
    {
      at: 0.68,
      duration: 0.75,
      from: 2200,
      to: 70,
      gain: 0.2,
      filter: "lowpass",
      q: 1.1,
    },
  ]);

  /* Grondement sinusoïdal sous l'explosion : c'est lui qu'on ressent plus
     qu'on ne l'entend, et qui donne du corps au souffle. */
  play([
    { freq: 95, to: 26, at: 0.68, duration: 0.62, gain: 0.13, type: "sine" },
  ]);
}
