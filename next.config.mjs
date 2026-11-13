import withSerwistInit from "@serwist/next";
import path from "node:path";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@huggingface/transformers$": path.resolve("node_modules/@huggingface/transformers/dist/transformers.web.js")
    };
    return config;
  },
  images: {
    unoptimized: true
  }
};

export default withSerwist(nextConfig);
