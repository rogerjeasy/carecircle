// Loading placeholder for a timeline event row.
export function EventSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="h-9 w-9 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded bg-muted" />
            <div className="h-5 w-20 rounded bg-muted" />
          </div>
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
