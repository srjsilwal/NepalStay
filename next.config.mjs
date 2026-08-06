import path from "path";
import { fileURLToPath } from "url";

/** @type {import('next').NextConfig} */
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true, // Ignore TypeScript errors during build
  },
  turbopack: {
    root: __dirname,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "uploadthing.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    // Serve modern formats for better compression and faster load times
    formats: ["image/avif", "image/webp"],
    // Cache optimised images for 7 days
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  // Remove X-Powered-By header (minor security + payload improvement)
  poweredByHeader: false,
  // Enable gzip compression
  compress: true,
  // Disable experimental CSS optimization to prevent build hangs
  experimental: {
    optimizeCss: false,
  },
  // Increase timeout for page data collection
  staticPageGenerationTimeout: 600,
};

export default nextConfig;
