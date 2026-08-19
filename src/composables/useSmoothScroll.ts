import { onMounted, onBeforeUnmount } from "vue";
import Lenis from "lenis";

/* Défilement fluide global (momentum scroll) + gestion des ancres #.
   Désactivé si l'utilisateur préfère réduire les animations. */
export function useSmoothScroll() {
  let lenis: Lenis | null = null;
  let rafId = 0;
  let onClick: ((e: MouseEvent) => void) | null = null;

  onMounted(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });

    const raf = (time: number) => {
      lenis?.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;
      const el = document.querySelector(hash);
      if (el) {
        e.preventDefault();
        lenis?.scrollTo(el as HTMLElement, { offset: 0 });
      }
    };
    document.addEventListener("click", onClick);
  });

  onBeforeUnmount(() => {
    if (onClick) document.removeEventListener("click", onClick);
    cancelAnimationFrame(rafId);
    lenis?.destroy();
  });
}
