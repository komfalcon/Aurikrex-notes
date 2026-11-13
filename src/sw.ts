/// <reference lib="webworker" />

import { Serwist, type PrecacheEntry } from "serwist";

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
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true
});

serwist.addEventListeners();
