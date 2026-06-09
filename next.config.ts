import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Avoid build failure when ESLint config is not fully set up on CI
    ignoreDuringBuilds: true,
  },
  // Tesseract.js ships native worker assets; keep them external on the server
  // so Next.js doesn't try to bundle them.
  serverExternalPackages: ["tesseract.js"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    // Allow uploading larger meter images via Server Actions (we use route handlers
    // primarily, but this is a sensible default for future expansion).
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
