import * as React from "react";
import Link from "next/link";
import { Heart, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { getInvitationByToken } from "@/db/invitations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { AcceptInviteClient, type InviteRole } from "./accept-invite-client";

// Map the schema's role enum onto the page's friendlier display roles.
function toDisplayRole(role: string): InviteRole {
  switch (role) {
    case "owner":
    case "family_admin":
      return "coordinator";
    case "family":
      return "family";
    case "caregiver":
      return "caregiver";
    case "read_only":
      return "readonly";
    case "care_recipient":
      return "care-recipient";
    case "clinician":
      return "clinician";
    default:
      return "family";
  }
}

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CC";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, session] = await Promise.all([getInvitationByToken(token), auth()]);

  // Not found, expired, already accepted, or revoked → friendly terminal state.
  if (!invite || !invite.isValid) {
    const accepted = invite?.status === "accepted";
    const expired = invite?.status === "pending"; // pending but invalid ⇒ past expiry
    return (
      <InviteLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-8 pb-8 px-6 sm:pt-8 sm:pb-8 sm:px-6 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              {accepted ? (
                <CheckCircle2 className="h-8 w-8 text-success" />
              ) : expired ? (
                <Clock className="h-8 w-8 text-muted-foreground" />
              ) : (
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h1 className="font-serif text-2xl font-bold mb-2">
              {accepted
                ? "Invitation already accepted"
                : expired
                  ? "Invitation expired"
                  : "Invitation not found"}
            </h1>
            <p className="text-muted-foreground mb-6">
              {accepted
                ? "This invitation has already been used. Try signing in to reach the care circle."
                : expired
                  ? "This invitation has expired. Please contact the person who invited you to request a new link."
                  : "This invitation link is invalid or has been revoked. Please ask the circle coordinator to send you a new invitation."}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/">Go to homepage</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </InviteLayout>
    );
  }

  return (
    <InviteLayout>
      <AcceptInviteClient
        isSignedIn={Boolean(session?.user?.id)}
        invitedEmail=""
        invite={{
          token,
          inviterName: invite.inviterName?.trim() || "A family member",
          inviterInitials: initialsOf(invite.inviterName),
          circleName: invite.circleName,
          careRecipientName: invite.recipientName,
          assignedRole: toDisplayRole(invite.role),
          personalNote: invite.personalNote ?? undefined,
        }}
      />
    </InviteLayout>
  );
}

function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between p-4 sm:p-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Heart className="h-4 w-4" />
            </span>
            <span className="text-lg font-semibold">CareCircle</span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-4 pb-8 sm:px-6 md:px-8">
          {children}
        </main>

        <footer className="py-4 text-center text-xs text-muted-foreground">
          <p>
            Need help?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact support
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
