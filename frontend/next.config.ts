import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Proxy API requests through Next.js to backend
  // In production with Docker, use container hostname
  // In development, use localhost
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === "production" ? "http://backend:8000" : "http://localhost:8001");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
