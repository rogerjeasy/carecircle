// Curated, on-brand photography for the marketing landing page.
//
// Same approach as the blog (src/components/blog/data.ts): plain Unsplash CDN URLs rendered
// through <RemoteImage>, which lazy-loads each photo and falls back to a warm gradient if one
// ever fails to load — so a missing image can never break the layout or show a broken-image icon.
// Every id below was verified to resolve. Images are DECORATIVE (rendered with empty alt); the
// surrounding text always carries the meaning, per the accessibility rules in the design system.
//
// Widths are capped per use so we never ship a 2000px photo into a 400px card.
const img = (id: string, w = 640) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const MARKETING_IMG = {
  // Problem cards — the scattered, stressful "before".
  problems: {
    chat: img("1484480974693-6ca0a78fb36b"), // phone + laptop, juggling messages
    meds: img("1471864190281-a93a3070b6de"), // loose pills — easy to lose track
    guilt: img("1581579438747-1dc8d17bbce4"), // an older parent, far away
  },
  // Feature highlights — the calmer "after".
  features: {
    timeline: img("1434030216411-0b793f4b4173"), // logging the day by hand
    medications: img("1584308666744-24d5c474f2ae"), // organised blister packs
    roles: img("1521737711867-e3b97375f902"), // several people, different views
  },
  // The two spotlight features.
  digest: img("1506784983877-45594efa4cbe"), // coffee + notebook, a gentle morning read
  emergency: img("1559839734-2b71ea197ec2"), // a calm clinician — medical readiness
  // How it works — a real 3-step sequence, so each gets a small circular photo.
  howItWorks: {
    create: img("1499750310107-5fef28a66643", 320), // a desk, setting things up
    invite: img("1573497019940-1c28c88b4f3e", 320), // a warm face — bringing people in
    view: img("1563013544-824ae1b704d3", 320), // looking at the shared picture
  },
  // Trust & security.
  trust: {
    encryption: img("1555949963-aa79dcee981c"), // code — encrypted in transit and at rest
    access: img("1450101499163-c8848c66ca85"), // signing off — role-based access
    audit: img("1517842645767-c639042777db"), // pen + notebook — the append-only record
  },
  // Mission quote background (decorative, heavily scrimmed).
  testimonial: img("1516627145497-ae6968895b74", 1100), // a desk of family photos
  // Closing call to action — full-bleed, warm.
  cta: img("1543269865-cbf427effbad", 1600), // people together around a table
} as const;

// ---- /how-it-works page ----
export const HOWITWORKS_IMG = {
  hero: img("1516627145497-ae6968895b74", 1600), // faint warm texture behind the intro
  timeline: {
    create: img("1499750310107-5fef28a66643"), // setting up
    invite: img("1573497019940-1c28c88b4f3e"), // bringing people in
    coordinate: img("1559027615-cd4628902d4a"), // hands together — coordinating
    connect: img("1591019479261-1a103585c559"), // a video call — staying connected across distance
  },
  rolesBg: img("1521737711867-e3b97375f902", 1400), // faint, slides in from the left
  securityBg: img("1526374965328-7f61d4dc18c5", 1400), // faint code, slides in from the right
  cta: img("1543269865-cbf427effbad", 1600),
} as const;

// ---- /onboarding (first-run circle setup) ----
// Warm, human moments that fit the first-run context: bringing family and helpers together to set
// up care for a loved one — including the across-cities/across-borders reality Kintwadi is built
// for. Full-bleed (1600w) since they sit behind the whole onboarding card; <OnboardingBackdrop>
// slowly crossfades + drifts between them. All ids have a committed local copy so the fallback
// chain in <RemoteImage> keeps them working offline.
// Captions below describe what each photo ACTUALLY shows (verified visually), so future edits keep
// the set on-context: an aging parent, the family and the care team who look after them.
export const ONBOARDING_IMG = [
  img("1543269865-cbf427effbad", 1600), // a family gathered around a tablet — coordinating together
  img("1581579438747-1dc8d17bbce4", 1600), // an older woman at home — the loved one at the center
  img("1531983412531-1f49a365ffed", 1600), // a tender parent-and-child moment — the warmth of caring
  img("1529156069898-49953e39b3ac", 1600), // people arm-in-arm — a circle of support
  img("1559839734-2b71ea197ec2", 1600), // a warm clinician — the care team standing with the family
] as const;

// ---- /about page ----
export const ABOUT_IMG = {
  hero: img("1531983412531-1f49a365ffed", 1600), // faint warm moment behind the tagline
  problemBg: img("1484480974693-6ca0a78fb36b", 1400),
  difference: {
    fairShare: img("1521791136064-7986c2920216"), // a handshake — fair, shared load
    diaspora: img("1591019479261-1a103585c559"), // a video call — family across borders
    oneRecord: img("1516627145497-ae6968895b74"), // one shared record
  },
  personasBg: img("1529156069898-49953e39b3ac", 1400),
  pillarsBg: img("1517842645767-c639042777db", 1400),
  principlesBg: img("1506784983877-45594efa4cbe", 1400),
  cta: img("1543269865-cbf427effbad", 1600),
} as const;
