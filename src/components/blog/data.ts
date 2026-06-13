// Blog content. Real, truthful posts only — authored by the Kintwadi team, no fabricated
// people, traction, or testimonials. Each post has a `slug` and a real `body` rendered at
// /blog/[slug]. Add new posts here as they're actually written.

export interface PostBlock {
  type: "p" | "h2" | "quote";
  text: string;
}

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  author: { name: string; initials: string; color: string };
  cover: string;
  body: PostBlock[];
}

const img = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

// The team byline — an honest attribution, not an invented person.
const TEAM = { name: "The Kintwadi team", initials: "K", color: "bg-primary/10 text-primary" };

export const FEATURED: Post = {
  slug: "why-we-built-kintwadi",
  title: "Why we built Kintwadi: one record for everyone caring for someone",
  excerpt:
    "Caring for an aging parent is one of the most universal human experiences — and one of the worst-tooled. Here's the thinking behind a calmer, role-aware way to coordinate care across siblings, cities and time zones.",
  category: "Our story",
  date: "Jun 6, 2026",
  readTime: "5 min read",
  author: TEAM,
  cover: img("1576091160550-2173dba999ef", 1200),
  body: [
    {
      type: "p",
      text: "Almost everyone, eventually, helps care for someone who is getting older. It is one of the most universal experiences there is — and one of the worst-supported. The work of caring rarely happens in one place or by one person. It is a parent in one city, an adult child in another, a sibling abroad, sometimes a paid aide who shows up each morning, and a doctor who is seen for fifteen minutes twice a year.",
    },
    {
      type: "p",
      text: "What ties all of that together today is usually a group chat. Medication times live in someone's memory. The latest blood-pressure reading is a photo buried in a thread. Who visited last weekend, what the doctor actually said, whether the prescription was refilled — all of it is scattered, half-remembered, and quietly stressful. The people furthest away feel the most guilt and have the least information.",
    },
    {
      type: "h2",
      text: "The real problem isn't information — it's coordination",
    },
    {
      type: "p",
      text: "We kept coming back to one observation: families don't lack care, they lack a shared picture of it. Two siblings can both be doing a lot and still resent each other, simply because neither can see what the other is doing. A faraway relative can love someone deeply and still feel cut off from their day. The information exists; it just isn't anywhere everyone can stand and look at it together.",
    },
    {
      type: "quote",
      text: "Families don't lack care. They lack a shared place to see it.",
    },
    {
      type: "p",
      text: "So Kintwadi is built around a single shared record for one person's care — a care circle. Everyone involved joins the same circle and sees the same timeline: medications given or skipped, vitals logged, appointments, notes, documents. One source of truth instead of five partial ones.",
    },
    {
      type: "h2",
      text: "Different people need different views — enforced, not assumed",
    },
    {
      type: "p",
      text: "A paid aide should be able to log a medication without seeing the family's private financial documents. A faraway sibling might only want a gentle daily summary, not every detail. The primary coordinator needs the full picture. So roles aren't a cosmetic setting in Kintwadi — they are enforced at the database itself, with row-level security, so a person can only ever read or write what their role in that specific circle allows. It is the difference between a permission you can trust and one you simply hope holds.",
    },
    {
      type: "h2",
      text: "Built to lower the temperature, not raise it",
    },
    {
      type: "p",
      text: "Two features came directly out of the emotional reality of caregiving. The daily digest is a short, warm, AI-written summary of how the day went — so the relative who can't be there still feels connected, and guilt turns into participation. And Ask Kintwadi lets anyone ask plain-language questions of the record — \"when was the last specialist appointment?\", \"has blood pressure improved this month?\" — answered only from that circle's own data, with the sources shown.",
    },
    {
      type: "p",
      text: "We didn't build Kintwadi to add another app to a stressful life. We built it to take a few things off the pile: the mental load of remembering, the friction of coordinating, and the quiet ache of being far away. One record, many lenses, calmer days. That's the whole idea.",
    },
  ],
};

// More posts will be added here as they're genuinely written.
export const POSTS: Post[] = [];

/** All posts (featured first), and a slug lookup used by /blog/[slug]. */
export const ALL_POSTS: Post[] = [FEATURED, ...POSTS];

export function getPost(slug: string): Post | undefined {
  return ALL_POSTS.find((p) => p.slug === slug);
}
