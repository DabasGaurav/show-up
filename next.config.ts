import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets `dev:proto` and `dev:mvp` run side by side locally (one dev server per build folder).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Embedded Postgres ships WASM; load it from node_modules instead of bundling.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
