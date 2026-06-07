"use client";

import * as React from "react";

/** True when the user prefers reduced motion — used to skip reveal/typing animations. */
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
