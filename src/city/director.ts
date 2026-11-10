/* Directeur de caméra : transforme « où on veut être » en un mouvement fluide.

   Pur TypeScript, sans Three.js : il ne produit que des positions, que le
   rendu applique ensuite à sa caméra.

   Trois couches se superposent :
   · une CIBLE : un point de vue (ou un mélange de deux, piloté par le
     défilement) ;
   · une DÉRIVE lente autour de cette cible, pour que la ville ne soit jamais
     une image figée — la caméra « survole » ;
   · un PARALLAXE selon la souris.

   Le déplacement vers la cible utilise un amortissement du second ordre
   (« smooth damp ») plutôt qu'une simple interpolation : il démarre en
   douceur, accélère, puis freine, avec une vitesse plafonnée. C'est ce qui
   donne un vol cinématique ; une interpolation exponentielle partirait en
   flèche dès la première image. */
import { STATIONS, type Station, type StationId, type Vec3 } from "./stations";

type Damp = { v: number };

/* Amortissement critique (méthode de Game Programming Gems 4). */
function smoothDamp(
  current: number,
  target: number,
  vel: Damp,
  smoothTime: number,
  maxSpeed: number,
  dt: number,
): number {
  const st = Math.max(0.0001, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - target;
  const maxChange = maxSpeed * st;
  change = Math.max(-maxChange, Math.min(maxChange, change));
  const t = current - change;
  const temp = (vel.v + omega * change) * dt;
  vel.v = (vel.v - omega * temp) * exp;
  let out = t + (change + temp) * exp;
  // Évite de dépasser la cible à cause du plafonnement.
  if (target - current > 0 === out > target) {
    out = target;
    vel.v = (out - target) / dt;
  }
  return out;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

export type CameraState = {
  pos: Vec3;
  look: Vec3;
  fov: number;
  /* 0 = immobile, 1 = vitesse de croisière maximale : sert à l'élargissement
     du champ pendant un déplacement. */
  speed01: number;
  veil: number;
};

export class Director {
  private target: Station;
  private from: StationId = "intro-far";
  private to: StationId | null = null;
  private blendT = 0;

  private pos: Vec3;
  private look: Vec3;
  private fov: number;
  private veil: number;
  private vel: Damp[] = Array.from({ length: 8 }, () => ({ v: 0 }));

  private px = 0;
  private py = 0;
  private spx = 0;
  private spy = 0;

  /* Durée caractéristique du vol : plus elle est grande, plus c'est lent. */
  smoothTime = 1.15;
  /* Amplitude de la dérive, en unités. 0 la coupe (mouvement réduit). */
  driftAmount = 1;
  maxSpeed = 380;

  private readonly stations: Record<string, Station>;

  constructor(
    start: StationId = "intro-far",
    stations: Record<string, Station> = STATIONS,
  ) {
    /* Copie : `setCustomTarget` ajoute des entrées, et on ne veut pas
       polluer la table partagée des points de vue. */
    this.stations = { ...stations };
    this.target = this.stations[start]!;
    this.from = start;
    this.pos = [...this.target.pos] as Vec3;
    this.look = [...this.target.look] as Vec3;
    this.fov = this.target.fov;
    this.veil = this.target.veil;
  }

  /* Cible un point de vue, ou un mélange de deux (`t` de 0 à 1). Le dernier
     appel l'emporte : le défilement l'utilise en continu, les changements de
     page l'appellent une fois. */
  setTarget(a: StationId, b?: StationId, t = 0) {
    this.from = a;
    this.to = b ?? null;
    this.blendT = b ? Math.min(1, Math.max(0, t)) : 0;
  }

  /* Cible un point de vue calculé à la volée (fiche projet). */
  setCustomTarget(id: string, station: Station) {
    this.stations[id] = station;
    this.setTarget(id as StationId);
  }

  /* Saute directement à la cible, sans voyage (premier affichage, mouvement
     réduit). */
  snap() {
    const t = this.resolveTarget();
    this.pos = [...t.pos] as Vec3;
    this.look = [...t.look] as Vec3;
    this.fov = t.fov;
    this.veil = t.veil;
    this.vel.forEach((v) => (v.v = 0));
  }

  setPointer(nx: number, ny: number) {
    this.px = Math.max(-1, Math.min(1, nx));
    this.py = Math.max(-1, Math.min(1, ny));
  }

  get currentId(): StationId {
    return (this.blendT > 0.5 && this.to ? this.to : this.from) as StationId;
  }

  private resolveTarget(): Station {
    const a = this.stations[this.from]!;
    if (!this.to) return a;
    const b = this.stations[this.to]!;
    const k = smooth(this.blendT);
    return {
      pos: lerp3(a.pos, b.pos, k),
      look: lerp3(a.look, b.look, k),
      fov: lerp(a.fov, b.fov, k),
      veil: lerp(a.veil, b.veil, k),
      district: k > 0.5 ? b.district : a.district,
    };
  }

  update(dt: number, time: number): CameraState {
    dt = Math.min(dt, 0.08); // un onglet resté en arrière-plan ne doit pas téléporter
    const t = this.resolveTarget();
    const d = this.driftAmount;

    /* Dérive : une ellipse très lente autour de la cible. Les deux périodes
       ne sont pas multiples l'une de l'autre, donc le trajet ne boucle pas de
       façon visible. */
    const dx = Math.sin(time * 0.071) * 9 * d + Math.sin(time * 0.173) * 2.4 * d;
    const dy = Math.sin(time * 0.053 + 1.3) * 3.2 * d;
    const dz = Math.cos(time * 0.059) * 9 * d;

    const tp: Vec3 = [t.pos[0] + dx, t.pos[1] + dy, t.pos[2] + dz];
    const tl: Vec3 = [
      t.look[0] + Math.sin(time * 0.047 + 2) * 4 * d,
      t.look[1],
      t.look[2] + Math.cos(time * 0.041) * 4 * d,
    ];

    const before: Vec3 = [...this.pos] as Vec3;
    for (let i = 0; i < 3; i++) {
      this.pos[i] = smoothDamp(this.pos[i]!, tp[i]!, this.vel[i]!, this.smoothTime, this.maxSpeed, dt);
      this.look[i] = smoothDamp(this.look[i]!, tl[i]!, this.vel[3 + i]!, this.smoothTime * 0.85, this.maxSpeed, dt);
    }
    this.fov = smoothDamp(this.fov, t.fov, this.vel[6]!, this.smoothTime, 40, dt);
    this.veil = smoothDamp(this.veil, t.veil, this.vel[7]!, 0.6, 2, dt);

    /* Parallaxe : lissé à part, sinon la souris secouerait la caméra. */
    const k = 1 - Math.exp(-dt * 3.2);
    this.spx += (this.px - this.spx) * k;
    this.spy += (this.py - this.spy) * k;

    const speed = Math.hypot(
      this.pos[0] - before[0],
      this.pos[1] - before[1],
      this.pos[2] - before[2],
    ) / Math.max(dt, 0.0001);

    // Axe « droite » de la caméra, à plat : le parallaxe glisse latéralement.
    const fx = this.look[0] - this.pos[0];
    const fz = this.look[2] - this.pos[2];
    const len = Math.hypot(fx, fz) || 1;
    const rx = -fz / len;
    const rz = fx / len;
    const mx = this.spx * 7 * d;
    const my = this.spy * 3.5 * d;

    return {
      pos: [this.pos[0] + rx * mx, this.pos[1] - my, this.pos[2] + rz * mx],
      look: [this.look[0] + rx * mx * 0.4, this.look[1] - my * 0.4, this.look[2] + rz * mx * 0.4],
      fov: this.fov,
      speed01: Math.min(1, speed / this.maxSpeed),
      veil: this.veil,
    };
  }
}
