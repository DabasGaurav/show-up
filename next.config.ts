import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The local database ships WASM; load it from node_modules instead of bundling.
  serverExternalPackages: ["@electric-sql/pglite"],
  devIndicators: false,
};

export default nextConfig;
