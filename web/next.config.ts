import type { NextConfig } from "next";

const tapHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      { source: "/w", headers: tapHeaders },
      { source: "/w/:path*", headers: tapHeaders },
    ];
  },
};

export default nextConfig;
