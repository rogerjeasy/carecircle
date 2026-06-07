"use client";

import * as React from "react";

/**
 * Reveals `text` progressively for a subtle streaming effect. When `enabled` is false (reduced
 * motion, or older messages) the full text shows immediately.
 */
export function useTypewriter(text: string, enabled: boolean): { shown: string; done: boolean } {
  // Initialised from `enabled` at mount; consumers key this hook per message so it remounts fresh.
  const [count, setCount] = React.useState(enabled ? 0 : text.length);

  React.useEffect(() => {
    if (!enabled) return;
    let i = 0;
    const step = Math.max(2, Math.round(text.length / 80)); // finish in ~80 ticks max
    const timer = setInterval(() => {
      i += step;
      setCount(i >= text.length ? text.length : i); // setState only inside the async tick
      if (i >= text.length) clearInterval(timer);
    }, 24);
    return () => clearInterval(timer);
  }, [text, enabled]);

  return { shown: text.slice(0, count), done: count >= text.length };
}

/** True when the user prefers reduced motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
