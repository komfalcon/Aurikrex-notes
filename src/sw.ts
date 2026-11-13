/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { CacheFirst, ExpirationPlugin, Serwist, type PrecacheEntry, type RuntimeCaching } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST?: Array<PrecacheEntry | string>;
};

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isModelAsset = url.hostname === "huggingface.co" || url.hostname.endsWith(".huggingface.co");
  if (!isModelAsset || event.request.method !== "GET") return;

  event.respondWith((async () => {
    const cache = await caches.open("aurikrex-transformers-v1");
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  })());
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  precacheOptions: {
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^id$/, /^title$/, /^text$/, /^url$/],
  },
  runtimeCaching: [
    {
      matcher: ({ url }) => url.hostname === "huggingface.co" || url.hostname.endsWith(".huggingface.co") || url.hostname === "hf.co" || url.hostname.endsWith(".hf.co") || /ort-(?:wasm|webgpu)|ort\.webgpu/i.test(url.pathname),
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
