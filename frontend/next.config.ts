import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ignore lint and type errors during CI builds (Render)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Silence Next.js workspace root warning by pointing to the monorepo root
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
