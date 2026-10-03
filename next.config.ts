import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // The import page reads the collector script to offer it for copying.
  outputFileTracingIncludes: {
    "/import": ["src/importers/duolingo/browser-script.js"],
  },
};

export default nextConfig;
