"use client";

import * as React from "react";

const QUERY = "(max-width: 639px)";

/**
 * True when the viewport is phone-width (< 640px). Drives the rota's swap from the 7-day week grid
 * to a day-by-day stacked list, and the add-shift Dialog → bottom Sheet swap.
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia(QUERY).matches : false
  );

  React.useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isPhone;
}
