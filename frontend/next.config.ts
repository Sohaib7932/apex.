import type { NextConfig } from "next";

// FastAPI base URL. The browser only ever calls this app's own origin
// (/api/...), and Next.js forwards the request, so auth cookies stay first-party.
const apiUrl = (process.env.API_URL ?? "http://localhost:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The repo root has its own package-lock.json (Neon tooling); keep Turbopack scoped to frontend/.
  turbopack: { root: __dirname },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
