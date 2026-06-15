// Adds the top-level `blog.*` namespace — UI chrome only. Post articles (title/excerpt/body/
// category/date) live in src/components/blog/data.ts as authored Kintwadi-team content and stay
// in the source language (domain content, not UI strings).
import { readFileSync, writeFileSync } from "node:fs";

const BLOG = {
  en: {
    badge: "Kintwadi blog",
    heroTitle: "Notes on caring, together",
    heroSubtitle: "Stories, product updates, and ideas for coordinating care across families, distance and time zones.",
    featured: "Featured",
    readStory: "Read the story",
    morePosts: "More stories are on the way.",
    allPosts: "All posts",
  },
  fr: {
    badge: "Blog Kintwadi",
    heroTitle: "Réflexions sur l'accompagnement, ensemble",
    heroSubtitle: "Histoires, nouveautés produit et idées pour coordonner les soins entre familles, distances et fuseaux horaires.",
    featured: "À la une",
    readStory: "Lire l'article",
    morePosts: "D'autres histoires arrivent bientôt.",
    allPosts: "Tous les articles",
  },
  de: {
    badge: "Kintwadi Blog",
    heroTitle: "Gedanken über das gemeinsame Umsorgen",
    heroSubtitle: "Geschichten, Produktneuheiten und Ideen, um die Pflege über Familien, Distanzen und Zeitzonen hinweg zu koordinieren.",
    featured: "Empfohlen",
    readStory: "Geschichte lesen",
    morePosts: "Weitere Geschichten folgen in Kürze.",
    allPosts: "Alle Beiträge",
  },
  es: {
    badge: "Blog de Kintwadi",
    heroTitle: "Notas sobre cuidar, juntos",
    heroSubtitle: "Historias, novedades del producto e ideas para coordinar los cuidados entre familias, distancias y zonas horarias.",
    featured: "Destacado",
    readStory: "Leer la historia",
    morePosts: "Pronto habrá más historias.",
    allPosts: "Todas las publicaciones",
  },
  it: {
    badge: "Blog Kintwadi",
    heroTitle: "Riflessioni sul prendersi cura, insieme",
    heroSubtitle: "Storie, novità sul prodotto e idee per coordinare l'assistenza tra famiglie, distanze e fusi orari.",
    featured: "In evidenza",
    readStory: "Leggi la storia",
    morePosts: "Altre storie sono in arrivo.",
    allPosts: "Tutti gli articoli",
  },
  ar: {
    badge: "مدونة Kintwadi",
    heroTitle: "ملاحظات حول الرعاية، معًا",
    heroSubtitle: "قصص وتحديثات للمنتج وأفكار لتنسيق الرعاية بين العائلات والمسافات والمناطق الزمنية.",
    featured: "مميّز",
    readStory: "اقرأ القصة",
    morePosts: "المزيد من القصص في الطريق.",
    allPosts: "كل المقالات",
  },
  he: {
    badge: "הבלוג של Kintwadi",
    heroTitle: "מחשבות על טיפול, ביחד",
    heroSubtitle: "סיפורים, עדכוני מוצר ורעיונות לתיאום טיפול בין משפחות, מרחקים ואזורי זמן.",
    featured: "מומלץ",
    readStory: "קראו את הסיפור",
    morePosts: "עוד סיפורים בדרך.",
    allPosts: "כל הפוסטים",
  },
};

for (const [code, dict] of Object.entries(BLOG)) {
  const path = `messages/${code}.json`;
  const obj = JSON.parse(readFileSync(path, "utf8"));
  obj.blog = dict;
  const out = (JSON.stringify(obj, null, 2) + "\n").replace(/\n/g, "\r\n");
  writeFileSync(path, out, "utf8");
  console.log(`${code}: added blog (${Object.keys(dict).length} keys)`);
}
