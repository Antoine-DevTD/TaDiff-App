import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return ["/ressources/:path*", "/resources/:path*", "/admin/resources/:path*", "/api/resources/:path*"].map((source) => ({ source, headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Pages can become members-only; do not retain an indexed or cached copy.
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ] }));
  },
};

export default nextConfig;
