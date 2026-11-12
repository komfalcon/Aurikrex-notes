import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import withSerwistInit from "@serwist/next";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "public");
const buildRevision = process.env.CF_PAGES_COMMIT_SHA ?? Date.now().toString();

const collectPublicEntries = (directory = publicDir) => {
  const entries = [];
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, item.name);
    if (item.isDirectory()) {
      entries.push(...collectPublicEntries(filePath));
      continue;
    }
    const relativePath = path.relative(publicDir, filePath).split(path.sep).join("/");
    if (relativePath === "sw.js" || relativePath === "sw.js.map" || /^swe-worker-.*\.js(?:\.map)?$/.test(relativePath)) continue;
    const revision = createHash("md5").update(readFileSync(filePath)).digest("hex");
    entries.push({ url: `/${relativePath}`, revision });
  }
  return entries;
};

const appRouteEntries = ["/", "/new", "/note", "/trash", "/settings"].map((url) => ({ url, revision: buildRevision }));

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
  additionalPrecacheEntries: [...appRouteEntries, ...collectPublicEntries()],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default withSerwist(nextConfig);
