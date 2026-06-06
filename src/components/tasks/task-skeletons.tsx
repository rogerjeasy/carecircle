import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <div className="flex items-start gap-2">
        <Skeleton className="h-5 w-5 rounded-md" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex items-center justify-between pl-7">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

/** Loading placeholder for the List view (grouped grid of card skeletons). */
export function ListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-20" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Loading placeholder for the board (three columns) + fair-share panel. */
export function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <div className="min-w-0 flex-1">
        <div className="grid grid-flow-col auto-cols-[minmax(17rem,1fr)] gap-4 overflow-hidden">
          {[0, 1, 2].map((c) => (
            <div key={c} className="space-y-2 rounded-2xl border bg-muted/30 p-2">
              <Skeleton className="mx-1 mb-2 mt-1 h-5 w-20" />
              {[0, 1].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="w-full shrink-0 xl:w-80">
        <Card className="h-full">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <Skeleton className="h-5 w-40" />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-7 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
