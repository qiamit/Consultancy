import path from "path";
import type { NextConfig } from "next";

const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Compile imports from sibling Backend/ folder
  outputFileTracingRoot: repoRoot,
  serverExternalPackages: ["imapflow", "mailparser", "nodemailer", "pdf-parse", "resend"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  experimental: {
    externalDir: true,
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
