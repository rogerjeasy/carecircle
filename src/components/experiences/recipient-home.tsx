"use client";

import * as React from "react";
import { toast } from "sonner";
import { Calendar, Check, HeartHandshake, Phone, Pill, Volume2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EMERGENCY_CONTACTS, RECIPIENT, TODAY_APPTS, TODAY_DOSES, type Dose } from "./data";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Care recipient home — dignified, large-type, high-contrast, oversized tap targets. */
export function RecipientHome() {
  const [doses, setDoses] = React.useState<Dose[]>(TODAY_DOSES);
  const [speaking, setSpeaking] = React.useState(false);
  const family = EMERGENCY_CONTACTS[0];

  React.useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const tookIt = (id: string) => {
    setDoses((prev) => prev.map((d) => (d.id === id ? { ...d, given: true } : d)));
    toast.success("Well done — that's recorded 💚");
  };

  const due = doses.filter((d) => !d.given);

  const readAloud = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast("Read-aloud isn't available on this device");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text =
      due.length > 0
        ? `${greeting()}, ${RECIPIENT.name}. You have ${due.length} ${due.length === 1 ? "medicine" : "medicines"} to take. ` +
          due.map((d) => `${d.name}, ${d.strength}, at ${d.time}.`).join(" ")
        : `${greeting()}, ${RECIPIENT.name}. You've taken all your medicines today. Well done.`;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  return (
    <div className="space-y-8 text-lg">
      {/* Greeting */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {greeting()}, {RECIPIENT.name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {due.length > 0 ? `You have ${due.length} ${due.length === 1 ? "medicine" : "medicines"} to take.` : "You've taken all your medicines today 💚"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={readAloud}
          aria-pressed={speaking}
          className="h-14 shrink-0 px-5 text-base"
        >
          {speaking ? <Square className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          <span className="ml-2">{speaking ? "Stop" : "Read aloud"}</span>
        </Button>
      </div>

      {/* Medications */}
      <section aria-label="Today's medications" className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Pill className="h-5 w-5 text-primary" aria-hidden="true" />
          Today&apos;s medicines
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {doses.map((d) => (
            <Card key={d.id} className={cn("flex h-full flex-col", d.given && "bg-success/5")}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="min-w-0">
                  <p className="text-2xl font-bold leading-tight">
                    {d.name} <span className="text-lg font-semibold text-muted-foreground">{d.strength}</span>
                  </p>
                  <p className="mt-1 text-base text-muted-foreground">{d.time} · {d.purpose}</p>
                </div>
                <div className="mt-auto">
                  {d.given ? (
                    <div className="flex h-14 items-center justify-center gap-2 rounded-xl bg-success/10 text-base font-semibold text-success">
                      <Check className="h-5 w-5" aria-hidden="true" />
                      Taken
                    </div>
                  ) : (
                    <Button
                      className="h-16 w-full text-lg"
                      onClick={() => tookIt(d.id)}
                      aria-label={`I took ${d.name} ${d.strength}`}
                    >
                      <Check className="h-6 w-6" />
                      <span className="ml-2">I took it</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Appointments */}
      <section aria-label="Today's appointments" className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
          Appointments
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {TODAY_APPTS.map((a) => (
            <Card key={a.title}>
              <CardContent className="p-5">
                <p className="text-xl font-semibold">{a.title}</p>
                <p className="mt-1 text-base text-muted-foreground">{a.time}</p>
                <p className="text-base text-muted-foreground">{a.provider} · {a.location}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Help actions */}
      <section aria-label="Get help" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Button asChild className="h-20 text-xl">
          <a href={`tel:${family.phone.replace(/[^+\d]/g, "")}`} aria-label={`Call ${family.name}`}>
            <Phone className="h-7 w-7" />
            <span className="ml-2">Call family</span>
          </a>
        </Button>
        <Button
          variant="destructive"
          className="h-20 text-xl"
          onClick={() => toast.success("Reaching your family now — hold tight 💚")}
        >
          <HeartHandshake className="h-7 w-7" />
          <span className="ml-2">I need help</span>
        </Button>
      </section>

      <p className="text-center text-base text-muted-foreground">
        You decide what to share. This is your space.
      </p>
    </div>
  );
}
