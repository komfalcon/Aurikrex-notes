/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { CacheFirst, ExpirationPlugin, Serwist, type PrecacheEntry, type RuntimeCaching } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST?: Array<PrecacheEntry | string>;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  precacheOptions: {
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^id$/, /^title$/, /^text$/, /^url$/],
  },
  runtimeCaching: [
    {
      matcher: ({ url }) => url.hostname === "huggingface.co" || url.hostname.endsWith(".huggingface.co") || url.hostname === "hf.co" || url.hostname.endsWith(".hf.co") || (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/")) || /ort-(?:wasm|webgpu)|ort\.webgpu/i.test(url.pathname),
      handler: new CacheFirst({
        cacheName: "transformers-model-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 365 * 24 * 60 * 60, maxAgeFrom: "last-used" })],
      }),
    } satisfies RuntimeCaching,
    ...defaultCache,
  ],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
});

serwist.addEventListeners();
