"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Link2, Link2Off, Pencil, Printer, Share2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmergencyCardView } from "./emergency-card-view";
import {
  createEmergencyShare,
  revokeEmergencyShare,
  updateAdvanceDirective,
} from "@/lib/emergency-card/actions";
import { EC_LANGS, EC_STRINGS, type ECLang, type EmergencyCardData } from "./data";

/** The circle's live public share link, projected by the server (null when none is active). */
export interface EmergencyShareProps {
  url: string;
  /** ISO timestamp the link stops working. */
  expiresAt: string;
  viewCount: number;
}

export interface EmergencyCardScreenProps {
  /** Projected emergency-card data, or null when there's no recipient profile / circle yet. */
  data: EmergencyCardData | null;
  /** Active public share link, if one exists. */
  share: EmergencyShareProps | null;
}

/** The Emergency Card — high-contrast, scannable, shareable, and printable to one clean page. */
export function EmergencyCardScreen({ data, share: initialShare }: EmergencyCardScreenProps) {
  const tp = useTranslations("profile");
  const locale = useLocale();
  const { role } = useAppShell();
  const canManage = role === "coordinator"; // owner / family admin
  const [lang, setLang] = React.useState<ECLang>("en");
  const t = EC_STRINGS[lang];

  // The live public link — seeded by the server, updated in place by create/revoke.
  const [share, setShare] = React.useState<EmergencyShareProps | null>(initialShare);
  const [shareBusy, setShareBusy] = React.useState(false);

  // Advance directive is editable in place by managers; seeded from the server projection.
  const [advanceDirective, setAdvanceDirective] = React.useState<string | null>(data?.advanceDirective ?? null);
  const [editingAd, setEditingAd] = React.useState(false);
  const [adDraft, setAdDraft] = React.useState("");
  const [savingAd, setSavingAd] = React.useState(false);

  const saveAdvanceDirective = async () => {
    setSavingAd(true);
    const res = await updateAdvanceDirective(adDraft);
    setSavingAd(false);
    if (res.ok) {
      setAdvanceDirective(res.value);
      setEditingAd(false);
      toast.success(tp("ec.advanceDirectiveSaved"));
    } else {
      toast.error(res.error);
    }
  };

  const createShare = async () => {
    setShareBusy(true);
    const res = await createEmergencyShare();
    setShareBusy(false);
    if (res.ok) {
      setShare({ url: res.url, expiresAt: res.expiresAt, viewCount: 0 });
      toast.success(tp("ec.linkLive"));
    } else {
      toast.error(res.error);
    }
  };

  const revokeShare = async () => {
    setShareBusy(true);
    const res = await revokeEmergencyShare();
    setShareBusy(false);
    if (res.ok) {
      setShare(null);
      toast.success(tp("ec.linkRevoked"));
    } else {
      toast.error(res.error);
    }
  };

  // Share the PUBLIC link when one is live (works for EMS with no account); else this page's URL.
  const share2 = async () => {
    const url = share?.url ?? (typeof window !== "undefined" ? window.location.href : "");
    try {
      if (navigator.share) {
        await navigator.share({ title: `${data?.fullName ?? tp("ec.fallbackName")} — ${t.emergencyCard}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(share ? tp("ec.publicLinkCopied") : tp("ec.linkCopied"));
    } catch {
      toast(tp("ec.shareCancelled"));
    }
  };

  const print = () => {
    if (typeof window !== "undefined") window.print();
  };

  if (!data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-semibold">{tp("ec.emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tp("ec.emptyDescription")}
          </p>
        </div>
      </div>
    );
  }

  // Localized via native Intl (project convention) — not date-fns for user-visible dates.
  const expiresLabel = share
    ? new Date(share.expiresAt).toLocaleString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const advanceDirectiveNode = editingAd ? (
    <div className="space-y-2 print:hidden">
      <Input
        value={adDraft}
        onChange={(e) => setAdDraft(e.target.value)}
        placeholder={tp("ec.advanceDirectivePlaceholder")}
        aria-label={tp("ec.advanceDirectiveAria")}
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={saveAdvanceDirective} disabled={savingAd}>
          {savingAd ? tp("ec.saving") : tp("ec.save")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditingAd(false)} disabled={savingAd}>
          {tp("ec.cancel")}
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex items-start justify-between gap-2">
      <p className="text-base font-semibold">{advanceDirective ?? tp("card.notRecorded")}</p>
      {canManage && (
        <button
          type="button"
          onClick={() => {
            setAdDraft(advanceDirective ?? "");
            setEditingAd(true);
          }}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
          aria-label={tp("ec.editAdvanceDirective")}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  // Footer: a REAL QR encoding the public /e/<token> link when one is live (printed on the card so
  // EMS can scan it from the fridge door), plus the coordinator's create/rotate/revoke controls.
  const footer = (
    <footer className="space-y-3 border-t pt-4">
      {share ? (
        <div className="flex items-center gap-4">
          <div className="w-24 shrink-0 rounded-md bg-white p-1.5" aria-label={tp("ec.qrAria")}>
            <QRCode value={share.url} size={84} className="h-auto w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t.scanToOpen}</p>
            <p className="text-xs text-muted-foreground">
              {tp("ec.opensExpires", { expires: expiresLabel ?? "" })}
              {share.viewCount > 0 ? tp("ec.openedAudited", { count: share.viewCount }) : tp("ec.everyOpenAudited")}.
            </p>
            {canManage && (
              <div className="mt-2 flex flex-wrap gap-2 print:hidden">
                <Button size="sm" variant="outline" onClick={createShare} disabled={shareBusy}>
                  <Link2 className="h-3.5 w-3.5" />
                  <span className="ml-1">{shareBusy ? tp("ec.working") : tp("ec.rotateLink")}</span>
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={revokeShare} disabled={shareBusy}>
                  <Link2Off className="h-3.5 w-3.5" />
                  <span className="ml-1">{tp("ec.revoke")}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="min-w-0">
            <p className="text-sm font-medium">{tp("ec.noLinkTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {canManage ? tp("ec.noLinkManager") : tp("ec.noLinkMember")}
            </p>
          </div>
          {canManage && (
            <Button size="sm" onClick={createShare} disabled={shareBusy}>
              <Link2 className="h-4 w-4" />
              <span className="ml-1">{shareBusy ? tp("ec.creating") : tp("ec.createLink")}</span>
            </Button>
          )}
        </div>
      )}
    </footer>
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      {/* Toolbar (not printed) */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="inline-flex rounded-xl border p-0.5" role="group" aria-label={tp("cardLangAria")}>
          {EC_LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLang(l.value)}
              aria-pressed={lang === l.value}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                lang === l.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={share2}>
            <Share2 className="h-4 w-4" />
            <span className="ml-1">{tp("share")}</span>
          </Button>
          <Button onClick={print}>
            <Printer className="h-4 w-4" />
            <span className="ml-1">{tp("print")}</span>
          </Button>
        </div>
      </div>

      <EmergencyCardView data={{ ...data, advanceDirective }} t={t} advanceDirectiveNode={advanceDirectiveNode} footer={footer} />
    </div>
  );
}
