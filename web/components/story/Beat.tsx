"use client";

import type { ReactNode } from "react";
import { useInView } from "@/lib/useInView";

/** A narrative section that fades/rises into view on scroll. */
export function Beat({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <section
      ref={ref}
      className={`mx-auto max-w-2xl px-5 py-12 transition-all duration-700 ease-out ${
        inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </section>
  );
}

/** Body paragraph in the editorial measure. */
export function Para({ children }: { children: ReactNode }) {
  return (
    <p className="story-prose mt-5 text-lg leading-relaxed text-neutral-800 dark:text-neutral-200">
      {children}
    </p>
  );
}

/** Section kicker + headline. */
export function BeatHead({ kicker, children }: { kicker?: string; children: ReactNode }) {
  return (
    <>
      {kicker && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          {kicker}
        </div>
      )}
      <h2 className="story-display text-3xl font-bold leading-tight text-neutral-900 dark:text-neutral-50">
        {children}
      </h2>
    </>
  );
}
