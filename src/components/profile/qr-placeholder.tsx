import { cn } from "@/lib/utils";

const SIZE = 21;

/** A deterministic QR-styled graphic (decorative — the functional share is the copyable link). */
export function QrPlaceholder({ className }: { className?: string }) {
  const cells: boolean[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const inFinder =
        (x < 7 && y < 7) || (x >= SIZE - 7 && y < 7) || (x < 7 && y >= SIZE - 7);
      // Deterministic pseudo-pattern for the data area; finders drawn separately.
      cells.push(!inFinder && (x * 7 + y * 13 + x * y) % 3 === 0);
    }
  }

  return (
    <div
      className={cn("relative grid aspect-square w-full bg-white p-1", className)}
      style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {cells.map((on, i) => (
        <span key={i} className={on ? "bg-black" : "bg-white"} />
      ))}
      {/* Finder squares */}
      <Finder className="left-1 top-1" />
      <Finder className="right-1 top-1" />
      <Finder className="bottom-1 left-1" />
    </div>
  );
}

function Finder({ className }: { className: string }) {
  return (
    <span className={cn("pointer-events-none absolute h-[28%] w-[28%] border-[3px] border-black bg-white p-[3px]", className)}>
      <span className="block h-full w-full bg-black" />
    </span>
  );
}
