import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Mistyped or autocompleted addresses that land under /jobs.
  async redirects() {
    return [
      { source: "/jobs/login", destination: "/login", permanent: false },
      { source: "/jobs/register", destination: "/register", permanent: false },
    ];
  },
};

export default nextConfig;
