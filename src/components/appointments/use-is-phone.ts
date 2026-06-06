"use client";

import * as React from "react";

const QUERY = "(max-width: 639px)";

/**
 * True when the viewport is phone-width (< 640px, Tailwind's `sm` breakpoint). The initializer
 * reads synchronously on the client so consumers get the right answer on first render with no
 * flash; on the server it defaults to `false`.
 *
 * Drives the only layout *swap* in this feature: the month grid (tablet/laptop/desktop) becomes a
 * day-agenda on phone, and the detail surface becomes a bottom Sheet instead of a Dialog.
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
