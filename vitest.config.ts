import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://aurikrex-notes.pages.dev/"
      }
    },
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
});
