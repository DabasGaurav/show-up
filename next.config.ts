import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embedded Postgres ships WASM; load it from node_modules instead of bundling.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
