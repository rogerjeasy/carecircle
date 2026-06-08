import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (RAG ingest PDF text extraction) wraps pdfjs-dist; neither bundles cleanly under
  // Turbopack. Externalize both so they're required from node_modules at runtime.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  experimental: {
    serverActions: {
      // Medication attachments (images up to 5 MB, documents up to 15 MB) and pill-photo data
      // URLs are uploaded through Server Actions, which default to a 1 MB request body. Raise the
      // ceiling so those uploads aren't rejected; the per-file size is still capped client-side
      // and re-validated server-side in src/lib/storage/s3.ts.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
