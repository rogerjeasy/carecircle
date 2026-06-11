// Demo content for the Blog index.

export interface Post {
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  author: { name: string; initials: string; color: string };
  cover: string;
}

const img = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const A = {
  maria: { name: "Maria Rodriguez", initials: "MR", color: "bg-accent/10 text-accent" },
  grace: { name: "Grace Martinez", initials: "GM", color: "bg-primary/10 text-primary" },
  paolo: { name: "Paolo Bianchi", initials: "PB", color: "bg-info/10 text-info" },
  carlos: { name: "Carlos Rodriguez", initials: "CR", color: "bg-success/10 text-success" },
};

export const FEATURED: Post = {
  title: "Why we built Kintwadi: one record for everyone caring for someone",
  excerpt:
    "Caregiving for an aging parent is one of the most universal human experiences — and one of the worst-tooled. Here's the story behind a calmer, role-aware way to coordinate care across siblings, cities and time zones.",
  category: "Our story",
  date: "Jun 6, 2026",
  readTime: "6 min read",
  author: A.maria,
  cover: img("1576091160550-2173dba999ef", 1200),
};

export const POSTS: Post[] = [
  {
    title: "The diaspora digest: turning guilt into participation",
    excerpt: "An AI-written, warm daily update keeps the faraway relative emotionally connected to a parent's day.",
    category: "Product",
    date: "Jun 2, 2026",
    readTime: "4 min read",
    author: A.paolo,
    cover: img("1522202176988-66273c2fd55f"),
  },
  {
    title: "Fair-share visibility: defusing the #1 cause of family conflict",
    excerpt: "When everyone can see who's contributing, the silent resentment that fractures families finally eases.",
    category: "Caregiving",
    date: "May 28, 2026",
    readTime: "5 min read",
    author: A.carlos,
    cover: img("1543269865-cbf427effbad"),
  },
  {
    title: "Medication safety, made family-friendly",
    excerpt: "Give/skip logging, refill alerts, and interaction warnings — clinical safety without the clinical coldness.",
    category: "Safety",
    date: "May 21, 2026",
    readTime: "4 min read",
    author: A.grace,
    cover: img("1584308666744-24d5c474f2ae"),
  },
  {
    title: "One record, many lenses: roles enforced at the database",
    excerpt: "How row-level security gives the aide, the sibling, the coordinator and the parent each the right view.",
    category: "Engineering",
    date: "May 14, 2026",
    readTime: "7 min read",
    author: A.maria,
    cover: img("1551288049-bebda4e38f71"),
  },
  {
    title: "A day in the life: Maria, Antonio, Paolo and Grace",
    excerpt: "From a morning med log in Manila to an evening digest in Toronto — coordination that finally feels calm.",
    category: "Stories",
    date: "May 7, 2026",
    readTime: "5 min read",
    author: A.grace,
    cover: img("1559839734-2b71ea197ec2"),
  },
  {
    title: "Designing for stressed caregivers and older adults",
    excerpt: "Calm over busy, warm not clinical, accessible by default — the principles behind every screen.",
    category: "Design",
    date: "Apr 30, 2026",
    readTime: "6 min read",
    author: A.maria,
    cover: img("1505751172876-fa1923c5c528"),
  },
];
