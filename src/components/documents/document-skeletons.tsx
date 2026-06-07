import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the documents grid. */
export function DocumentsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden p-0">
          <Skeleton className="h-28 w-full rounded-none sm:h-32" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <div className="flex items-center gap-2 border-t pt-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
