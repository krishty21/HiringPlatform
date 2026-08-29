import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Vercel handles output packaging — do not set output: "standalone" */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
