/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { Serwist, type PrecacheEntry } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST?: Array<PrecacheEntry | string>;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  precacheOptions: {
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^id$/, /^title$/, /^text$/, /^url$/],
  },
  runtimeCaching: defaultCache,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
});

serwist.addEventListeners();
