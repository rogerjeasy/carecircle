"use client";

import { Smile } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CareRecipient } from "@/lib/circle/care-recipient";
import { WeekAtGlance } from "./widgets";
import { weekAtGlance } from "./data";

export function StatusBanner({ role, recipient }: { role: string; recipient: CareRecipient | null }) {
  const isCaregiver = role === "caregiver";
  const isReadonly = role === "readonly";
  const fallbackInitials = recipient?.initials || "AS";
  // Recipient's first name for the banner copy (neutral fallback until the profile loads).
  const recipientName = recipient?.fullName?.trim().split(/\s+/)[0] || "Your loved one";

  if (isCaregiver) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-4 p-4 sm:p-4">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            {recipient?.avatarUrl && <AvatarImage src={recipient.avatarUrl} alt={recipient.fullName} />}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{fallbackInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">Your shift</h3>
              <Badge variant="secondary" className="text-xs">Until 6 PM</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">3 tasks to complete · 2 medications due</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button size="sm" variant="outline">View tasks</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isReadonly) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="flex items-center gap-4 p-4 sm:p-4">
          <Avatar className="h-12 w-12 border-2 border-success/20">
            {recipient?.avatarUrl && <AvatarImage src={recipient.avatarUrl} alt={recipient.fullName} />}
            <AvatarFallback className="bg-success/10 text-success font-semibold">{fallbackInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{recipientName} is doing well</h3>
              <Smile className="h-4 w-4 text-success" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">All medications on track · Grace is on call today</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default: Coordinator/Family view
  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="flex items-center gap-4 p-4 sm:p-4">
        <Avatar className="h-12 w-12 border-2 border-success/20">
          {recipient?.avatarUrl && <AvatarImage src={recipient.avatarUrl} alt={recipient.fullName} />}
          <AvatarFallback className="bg-success/10 text-success font-semibold">{fallbackInitials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{recipientName} is having a good day</h3>
            <Smile className="h-4 w-4 text-success" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Mood: cheerful · Last update 20 min ago by Grace</p>
        </div>
        <WeekAtGlance days={weekAtGlance} />
      </CardContent>
    </Card>
  );
}
