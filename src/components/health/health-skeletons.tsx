import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the metric-card grid. */
export function MetricGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-8 w-24" />
          <Skeleton className="mt-3 h-12 w-full rounded-lg" />
        </Card>
      ))}
    </div>
  );
}

/** Loading placeholder for the focus chart + readings table. */
export function FocusChartSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-7 w-48 rounded-full" />
        </div>
        <Skeleton className="h-[260px] w-full rounded-xl sm:h-[300px]" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
