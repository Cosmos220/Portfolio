/* `v-scramble` : au survol (ou au focus clavier), le texte se brouille en
   symboles puis se déchiffre lettre par lettre, de gauche à droite — un mot
   de passe qui se casse. À poser sur un lien ou un bouton au texte statique.

   Deux précautions :
   · la largeur est FIGÉE (`width`, pas `min-width`) et le débordement
     rogné : des symboles comme % ou # sont plus larges que des lettres, un
     simple minimum les laisserait élargir l'élément et faire trembler toute
     la navigation. Le contour de focus n'est pas rogné (il est hors boîte) ;
   · l'animation écrit dans `textContent`, ce que Vue possède : on restaure
     TOUJOURS le texte d'origine à la fin, et on ne fait rien si l'élément
     contient autre chose que du texte (une icône, par exemple). */
import type { Directive } from "vue";

const GLYPHS = "01#%&*+=<>/_?$";
const STEP_MS = 32;

const reduce =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type State = { iv?: number; original: string; run: () => void; stop: () => void };
const states = new WeakMap<HTMLElement, State>();

function rand(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
}

export const vScramble: Directive<HTMLElement> = {
  mounted(el) {
    if (reduce) return;

    const state: State = {
      original: "",
      stop() {
        window.clearInterval(state.iv);
        state.iv = undefined;
        if (el.childElementCount === 0 && state.original) {
          el.textContent = state.original;
        }
        el.style.width = "";
        el.style.overflow = "";
        el.style.whiteSpace = "";
      },
      run() {
        // Un élément avec des enfants (icône…) : on ne touche à rien.
        if (el.childElementCount > 0) return;
        state.stop();
        const original = (el.textContent ?? "").trim();
        if (!original) return;
        state.original = original;

        el.style.width = `${el.getBoundingClientRect().width}px`;
        el.style.overflow = "hidden";
        el.style.whiteSpace = "nowrap";
        let revealed = 0;
        state.iv = window.setInterval(() => {
          revealed++;
          let out = original.slice(0, revealed);
          for (let i = revealed; i < original.length; i++) {
            out += original[i] === " " ? " " : rand();
          }
          el.textContent = out;
          if (revealed >= original.length) state.stop();
        }, STEP_MS);
      },
    };

    states.set(el, state);
    el.addEventListener("mouseenter", state.run);
    el.addEventListener("focus", state.run);
  },

  beforeUnmount(el) {
    const s = states.get(el);
    if (!s) return;
    el.removeEventListener("mouseenter", s.run);
    el.removeEventListener("focus", s.run);
    window.clearInterval(s.iv);
    states.delete(el);
  },
};
