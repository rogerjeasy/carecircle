import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
