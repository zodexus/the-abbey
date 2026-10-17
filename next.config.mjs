/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep iCloud's old local cache separate; Vercel expects the standard output.
  distDir: process.env.VERCEL ? '.next' : '.next-abbey',
};

export default nextConfig;
