import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  outputFileTracingRoot: path.join(process.cwd())
};

export default nextConfig;
