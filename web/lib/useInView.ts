"use client";

import { useEffect, useRef, useState } from "react";

/** Reveal-on-scroll: returns a ref + whether it has entered the viewport once. */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  opts: IntersectionObserverInit = { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setInView(true);
        obs.disconnect();
      }
    }, opts);
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return [ref, inView];
}
