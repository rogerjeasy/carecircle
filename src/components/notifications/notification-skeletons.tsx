import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the notifications list. */
export function NotificationsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-20" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border bg-card p-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
