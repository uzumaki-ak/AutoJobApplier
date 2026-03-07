// [F77] next.config.ts — Next.js 15 configuration
// Handles image domains, API rewrites, environment exposure

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure correct workspace root when multiple lockfiles exist
  outputFileTracingRoot: process.cwd(),
  // Avoid bundling worker-thread packages that need runtime files
  serverExternalPackages: ["thread-stream"],
  experimental: {
    // Enable React 19 server components optimizations
    reactCompiler: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  // Only expose safe public env vars to the client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
  },
};

export default nextConfig;
