import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureValue } from "./feature-value";
import { comparisonCategories } from "./data";
import type { ComparisonValue } from "./types";

/** Full feature comparison — a real table on tablet+/desktop, stacked cards on phone. */
export function ComparisonTable() {
  const t = useTranslations("pricing.comparison");

  // Resolve a raw matrix value: booleans pass through; "tk:<token>" strings become translated
  // words; any other string (numbers, sizes) is shown verbatim.
  const resolve = (value: ComparisonValue): boolean | string => {
    if (typeof value === "string" && value.startsWith("tk:")) {
      const token = value.slice(3) as
        | "unlimited"
        | "basic"
        | "advanced"
        | "custom"
        | "days30"
        | "roles3"
        | "roles6";
      return t(`values.${token}`);
    }
    return value;
  };

  return (
    <>
      {/* Desktop/Tablet table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-4 px-4 font-semibold w-[40%]">{t("featureColumn")}</th>
              <th className="text-center py-4 px-4 font-semibold w-[20%]">{t("free")}</th>
              <th className="text-center py-4 px-4 font-semibold w-[20%]">
                <span className="inline-flex items-center gap-2">
                  {t("plus")}
                  <Badge variant="default" className="text-xs">{t("popular")}</Badge>
                </span>
              </th>
              <th className="text-center py-4 px-4 font-semibold w-[20%]">{t("teams")}</th>
            </tr>
          </thead>
          <tbody>
            {comparisonCategories.map((category) => (
              <React.Fragment key={category.key}>
                <tr className="bg-muted/50">
                  <td colSpan={4} className="py-3 px-4 font-semibold text-sm">
                    {t(`categories.${category.key}`)}
                  </td>
                </tr>
                {category.features.map((feature) => (
                  <tr key={feature.key} className="border-b border-border/50">
                    <td className="py-3 px-4 text-sm">{t(`rows.${feature.key}`)}</td>
                    <td className="py-3 px-4 text-center">
                      <FeatureValue value={resolve(feature.free)} />
                    </td>
                    <td className="py-3 px-4 text-center bg-primary/5">
                      <FeatureValue value={resolve(feature.plus)} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <FeatureValue value={resolve(feature.teams)} />
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
          <Card key={category.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t(`categories.${category.key}`)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.features.map((feature) => (
                <div key={feature.key} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <p className="font-medium text-sm mb-2">{t(`rows.${feature.key}`)}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-1">{t("free")}</p>
                      <FeatureValue value={resolve(feature.free)} />
                    </div>
                    <div className="text-center bg-primary/5 rounded-md py-1">
                      <p className="text-muted-foreground mb-1">{t("plus")}</p>
                      <FeatureValue value={resolve(feature.plus)} />
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground mb-1">{t("teamsShort")}</p>
                      <FeatureValue value={resolve(feature.teams)} />
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
