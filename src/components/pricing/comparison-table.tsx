import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureValue } from "./feature-value";
import { comparisonCategories } from "./data";

/** Full feature comparison — a real table on tablet+/desktop, stacked cards on phone. */
export function ComparisonTable() {
  return (
    <>
      {/* Desktop/Tablet table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-4 px-4 font-semibold w-[40%]">Feature</th>
              <th className="text-center py-4 px-4 font-semibold w-[20%]">Free</th>
              <th className="text-center py-4 px-4 font-semibold w-[20%]">
                <span className="inline-flex items-center gap-2">
                  Plus
                  <Badge variant="default" className="text-xs">Popular</Badge>
                </span>
              </th>
              <th className="text-center py-4 px-4 font-semibold w-[20%]">Care Teams</th>
            </tr>
          </thead>
          <tbody>
            {comparisonCategories.map((category) => (
              <React.Fragment key={category.name}>
                <tr className="bg-muted/50">
                  <td colSpan={4} className="py-3 px-4 font-semibold text-sm">
                    {category.name}
                  </td>
                </tr>
                {category.features.map((feature) => (
                  <tr key={feature.name} className="border-b border-border/50">
                    <td className="py-3 px-4 text-sm">{feature.name}</td>
                    <td className="py-3 px-4 text-center">
                      <FeatureValue value={feature.free} />
                    </td>
                    <td className="py-3 px-4 text-center bg-primary/5">
                      <FeatureValue value={feature.plus} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <FeatureValue value={feature.teams} />
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="sm:hidden space-y-6">
        {comparisonCategories.map((category) => (
          <Card key={category.name}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{category.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.features.map((feature) => (
                <div key={feature.name} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <p className="font-medium text-sm mb-2">{feature.name}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-1">Free</p>
                      <FeatureValue value={feature.free} />
                    </div>
                    <div className="text-center bg-primary/5 rounded-md py-1">
                      <p className="text-muted-foreground mb-1">Plus</p>
                      <FeatureValue value={feature.plus} />
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground mb-1">Teams</p>
                      <FeatureValue value={feature.teams} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
