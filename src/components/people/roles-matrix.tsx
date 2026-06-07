"use client";

import { Database } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AccessCell } from "./badges";
import { useIsPhone } from "./use-is-phone";
import { CAPABILITIES, PERMISSIONS, ROLES } from "./data";

/** "Roles & what they can see" — a matrix on tablet+/desktop, per-role accordions on phone. */
export function RolesMatrix() {
  const isPhone = useIsPhone();

  return (
    <section aria-label="Roles and permissions" className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">Roles &amp; what they can see</h2>
        <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          These rules are enforced in the database, not just hidden in the app.
        </p>
      </div>

      {isPhone ? (
        <Accordion type="single" collapsible className="rounded-2xl border bg-card">
          {ROLES.map((role) => (
            <AccordionItem key={role.key} value={role.key} className="px-3 last:border-b-0">
              <AccordionTrigger className="text-left">
                <span className="font-medium">{role.label}</span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="mb-3 text-xs text-muted-foreground">{role.blurb}</p>
                <ul className="space-y-2">
                  {CAPABILITIES.map((cap) => (
                    <li key={cap.key} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm">{cap.label}</span>
                      <AccessCell access={PERMISSIONS[cap.key][role.key]} />
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border [scrollbar-width:thin]">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <caption className="sr-only">Permissions by role</caption>
              <thead>
                <tr className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <th scope="col" className="sticky left-0 z-10 bg-muted/40 px-4 py-3 font-medium">
                    Capability
                  </th>
                  {ROLES.map((role) => (
                    <th key={role.key} scope="col" className="px-3 py-3 text-center font-medium">
                      <span className="block leading-tight">{role.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((cap) => (
                  <tr key={cap.key} className="border-t">
                    <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left font-medium">

                      <span className="flex items-center gap-1.5">
                        {cap.label}
                        {cap.sensitive && (
                          <span className="rounded bg-warning/10 px-1 py-0.5 text-[10px] font-medium text-warning">
                            sensitive
                          </span>
                        )}
                      </span>
                    </th>
                    {ROLES.map((role) => (
                      <td key={role.key} className="px-3 py-2.5 text-center">
                        <span className="inline-flex justify-center">
                          <AccessCell access={PERMISSIONS[cap.key][role.key]} compact />
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <AccessCell access="edit" /> Full access
            </span>
            <span className="flex items-center gap-1.5">
              <AccessCell access="view" /> View only
            </span>
            <span className="flex items-center gap-1.5">
              <AccessCell access="none" /> No access
            </span>
          </div>
        </>
      )}
    </section>
  );
}
