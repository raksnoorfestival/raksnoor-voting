import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only: lets the dev server be opened as 127.0.0.2, .3, ...
  // Each address has its own cookie jar, which is how a sign-in flow gets
  // tested from a browser that already holds a session on localhost.
  allowedDevOrigins: ["127.0.0.2", "127.0.0.3", "127.0.0.4", "127.0.0.5", "127.0.0.6", "127.0.0.7", "127.0.0.8", "127.0.0.9"],
};

export default nextConfig;
