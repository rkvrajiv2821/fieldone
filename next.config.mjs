/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell webpack not to bundle these Node.js-only packages for the browser/edge
  serverExternalPackages: ["bcryptjs", "@prisma/client", "twilio"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
