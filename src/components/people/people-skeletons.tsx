import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the members list. */
export function PeopleSkeleton() {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border">
        <div className="border-b bg-muted/40 px-4 py-3">
          <Skeleton className="h-3 w-24" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-t px-4 py-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
