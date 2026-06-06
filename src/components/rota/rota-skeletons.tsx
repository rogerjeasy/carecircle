import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the on-call banner + week grid. */
export function RotaSkeleton() {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex items-center gap-3 p-4 sm:p-5">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardContent>
      </Card>
      <div className="overflow-hidden rounded-2xl border">
        <div className="grid min-w-[44rem] grid-cols-7 divide-x">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="border-b px-2 py-2">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="mt-1 h-2.5 w-10" />
              </div>
              <div className="flex min-h-[9rem] flex-col gap-1.5 p-1.5">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
