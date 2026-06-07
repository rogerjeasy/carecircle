"use client";

import * as React from "react";

/** True when the user prefers reduced motion — used to pick scroll behavior for jump-to-date. */
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
