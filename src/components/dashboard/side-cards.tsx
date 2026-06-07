"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Phone, Users, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fairShareData } from "./data";

export function AIDigestCard() {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Daily Digest</CardTitle>
        </div>
        <CardDescription>AI-generated summary</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div
              className="h-4 w-full rounded bg-muted animate-pulse"
              style={{ background: "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }}
            />
            <div
              className="h-4 w-4/5 rounded bg-muted animate-pulse"
              style={{ background: "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", animationDelay: "0.1s" }}
            />
            <div
              className="h-4 w-3/5 rounded bg-muted animate-pulse"
              style={{ background: "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", animationDelay: "0.2s" }}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Antonio had a positive day. All medications were administered on schedule. Blood pressure readings remain
            stable. Grace noted he enjoyed lunch and was in good spirits during the afternoon walk.
          </p>
        )}
        <Button variant="ghost" size="sm" className="mt-3 -ml-2 text-primary">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Ask CareCircle
        </Button>
      </CardContent>
    </Card>
  );
}

export function RotaCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-success" />
            <CardTitle className="text-base">On call now</CardTitle>
          </div>
          <Badge variant="success" className="text-xs">Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-accent/10 text-accent font-semibold">GS</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">Grace Santos</p>
            <p className="text-xs text-muted-foreground">Until 6:00 PM</p>
          </div>
        </div>
        <Separator className="my-3" />
        <Link href="/rota">
          <Button variant="ghost" size="sm" className="-ml-2 w-full justify-start">
            View full rota
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function FairShareCard() {
  const maxHours = Math.max(...fairShareData.map((d) => d.hours));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Fair share this week</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fairShareData.map((member) => (
            <div key={member.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{member.name}</span>
                <span className="text-muted-foreground tabular-nums">{member.hours}h</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${member.color} transition-all duration-500`}
                  style={{ width: `${(member.hours / maxHours) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
