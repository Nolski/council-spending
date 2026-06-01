"use client";

import type { ReactNode } from "react";
import { useInView } from "@/lib/useInView";

export function PullQuote({ children, cite }: { children: ReactNode; cite?: string }) {
  const [ref, inView] = useInView<HTMLQuoteElement>();
  return (
    <blockquote
      ref={ref}
      className={`mx-auto my-12 max-w-2xl border-l-4 border-blue-500 px-6 transition-all duration-700 ${
        inView ? "opacity-100" : "opacity-0"
      }`}
    >
      <p className="story-display text-2xl font-medium leading-snug text-neutral-900 dark:text-neutral-100">
        {children}
      </p>
      {cite && <footer className="mt-2 text-sm text-neutral-500">— {cite}</footer>}
    </blockquote>
  );
}
