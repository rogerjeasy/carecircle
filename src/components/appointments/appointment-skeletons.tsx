import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the Calendar view (month grid + day panel). */
export function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-5 xl:flex-row">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-7 gap-px px-px pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="mx-auto h-3 w-6" />
          ))}
        </div>
        <div className="grid grid-cols-7 overflow-hidden rounded-xl border">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[4.75rem] border-b border-r p-1.5 sm:min-h-[6rem] lg:min-h-[7rem]">
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="w-full shrink-0 xl:w-80">
        <Card className="h-full">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Loading placeholder for the List view (a couple of card skeletons). */
export function ListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-24" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center justify-between border-t pt-3">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-4 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
