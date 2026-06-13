import { useEffect, useRef } from "react";

/**
 * Adds the `is-visible` class to the returned ref when it scrolls into view.
 * Pair with the `.reveal` (and optional `.reveal-left/right/scale`) utility
 * defined in `src/index.css` to get a fade/slide reveal.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(opts?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour reduced motion — show immediately
    const reduced = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.classList.add("is-visible");
      return;
    }

    const once = opts?.once ?? true;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove("is-visible");
          }
        });
      },
      {
        threshold: opts?.threshold ?? 0.15,
        rootMargin: opts?.rootMargin ?? "0px 0px -10% 0px",
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [opts?.threshold, opts?.rootMargin, opts?.once]);

  return ref;
}