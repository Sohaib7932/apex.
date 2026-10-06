import type { NextConfig } from "next";

// FastAPI base URL, e.g. https://apex-api.onrender.com. The browser only ever calls
// this app's own origin (/api/...) and Next.js forwards the request, so auth
// cookies stay first-party. Set it in frontend/.env.local and on Vercel.
const apiUrl = process.env.API_URL?.replace(/\/$/, "");

if (!apiUrl) {
  console.warn("[apex] API_URL is not set: /api requests will 404 and data pages will show an error state.");
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The repo root has its own package-lock.json (Neon tooling); keep Turbopack scoped to frontend/.
  turbopack: { root: __dirname },
  images: {
    // Product photos ship in public/products. Sellers may also paste Unsplash URLs;
    // other hosts are rendered unoptimized (see components/ui/ProductImage.tsx).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    return apiUrl ? [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }] : [];
  },
};

export default nextConfig;
