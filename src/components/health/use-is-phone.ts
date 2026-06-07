"use client";

import * as React from "react";

const QUERY = "(max-width: 639px)";

/**
 * True when the viewport is phone-width (< 640px). Drives the readings table → stacked cards swap
 * and the log-reading Dialog → bottom Sheet swap.
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
