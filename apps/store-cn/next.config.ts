import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@ocs/core", "@ocs/config"],
};

export default nextConfig;
