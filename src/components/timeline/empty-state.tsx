import { FileText } from "lucide-react";

export function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No updates yet</h3>
      <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
        {hasFilters
          ? "No events match your current filters. Try adjusting your search or filter criteria."
          : "Be the first to share an update about Antonio's care."}
      </p>
    </div>
  );
}
