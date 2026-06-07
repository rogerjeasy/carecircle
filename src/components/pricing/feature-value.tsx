import { Check, X } from "lucide-react";

/** Renders a comparison-cell value: a check/cross for booleans, or the text. */
export function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-5 w-5 text-success mx-auto" />
    ) : (
      <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
    );
  }
  return <span className="text-sm font-medium">{value}</span>;
}
