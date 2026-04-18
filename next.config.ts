import type { NextConfig } from "next"

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",  value: "on" },
  { key: "X-Frame-Options",         value: "DENY" },
  { key: "X-Content-Type-Options",  value: "nosniff" },
  { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",      value: "camera=(), microphone=(self), geolocation=()" },
]

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
