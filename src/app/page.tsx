import { getDemoOverview } from "@/db/queries";

// Always read fresh from Aurora (no static caching for this proof-of-life page).
export const dynamic = "force-dynamic";

const typeColor: Record<string, string> = {
  med: "bg-[#0F766E]",
  vital: "bg-[#1D4ED8]",
  note: "bg-[#EC7C5A]",
  task: "bg-[#B45309]",
  appointment: "bg-[#7C3AED]",
  incident: "bg-[#B91C1C]",
  document: "bg-[#6B716C]",
  system: "bg-[#6B716C]",
};

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ago(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function Home() {
  const data = await getDemoOverview();

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FBFAF8] p-8 text-[#1B231F]">
        <p className="text-lg">
          No circle found. Run{" "}
          <code className="rounded bg-[#F1EFEA] px-1.5 py-0.5">npm run db:seed</code>.
        </p>
      </main>
    );
  }

  const { circle, recipient, events, members } = data;

  return (
    <main className="min-h-screen bg-[#FBFAF8] text-[#1B231F]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0F766E] text-sm font-semibold text-white">
              C
            </span>
            <span className="truncate text-lg font-semibold">CareCircle</span>
          </div>
          <span className="shrink-0 rounded-full border border-[#E6E3DC] bg-white px-3 py-1 text-xs text-[#6B716C]">
            live on Amazon Aurora
          </span>
        </header>

        {/* Recipient card */}
        <section className="mt-8 rounded-2xl border border-[#E6E3DC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#0F766E]/10 text-lg font-semibold text-[#0F766E]">
              {initials(recipient?.fullName ?? "A")}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">
                {recipient?.fullName ?? circle.name}
              </h1>
              <p className="truncate text-sm text-[#6B716C]">
                {circle.name} · {circle.primaryTimezone}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-[#0F766E]/[0.06] px-4 py-3 text-sm text-[#0F766E]">
            Antonio is having a good day — all morning meds given.
          </div>

          {recipient && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Conditions" items={recipient.conditions ?? []} />
              <Field label="Allergies" items={recipient.allergies ?? []} danger />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {members.map((m) => (
              <span
                key={m.id}
                className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[#E6E3DC] px-2.5 py-1 text-xs"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#EC7C5A]/15 text-[10px] font-semibold text-[#9a4a2f]">
                  {initials(m.name)}
                </span>
                <span className="truncate">{m.name}</span>
                <span className="text-[#6B716C]">· {m.label ?? m.role}</span>
              </span>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6B716C]">
            Care timeline
          </h2>
          <ol className="space-y-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-xl border border-[#E6E3DC] bg-white p-4 shadow-sm"
              >
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    typeColor[e.eventType] ?? "bg-[#6B716C]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{e.summary}</p>
                  <p className="mt-1 text-xs text-[#6B716C]">
                    {e.actorName ?? "System"} · {ago(e.occurredAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-10 text-center text-xs text-[#6B716C]">
          Reading {events.length} live events from Amazon Aurora PostgreSQL · Row-Level
          Security ready
        </footer>
      </div>
    </main>
  );
}

function Field({
  label,
  items,
  danger,
}: {
  label: string;
  items: string[];
  danger?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-[#6B716C]">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-sm text-[#6B716C]">—</span>
        ) : (
          items.map((it) => (
            <span
              key={it}
              className={`rounded-md px-2 py-0.5 text-xs ${
                danger
                  ? "bg-[#B91C1C]/10 text-[#B91C1C]"
                  : "bg-[#F1EFEA] text-[#1B231F]"
              }`}
            >
              {it}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
