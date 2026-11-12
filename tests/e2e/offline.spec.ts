import { expect, test } from "@playwright/test";

test("offline create and reload persists note", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/");
  await context.setOffline(true);

  await page.evaluate(async () => {
    const request = indexedDB.open("aurikrex-notes");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const upgradeDb = request.result;
        if (!upgradeDb.objectStoreNames.contains("notes")) {
          upgradeDb.createObjectStore("notes", { keyPath: "id" });
        }
        if (!upgradeDb.objectStoreNames.contains("settings")) {
          upgradeDb.createObjectStore("settings", { keyPath: "id" });
        }
      };
    });

    const now = Date.now();
    const note = {
      id: crypto.randomUUID(),
      title: "Offline Note",
      body: "Offline Body",
      tags: [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("notes", "readwrite");
      tx.objectStore("notes").put(note);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });

  await context.setOffline(false);
  await page.goto("/");
  await expect(page.getByText("Offline Note")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Offline Note")).toBeVisible();
});

test("share target parameters create note", async ({ page }) => {
  await page.goto("/new?title=Shared%20Title&text=Shared%20Text&url=https%3A%2F%2Fexample.com");
  await expect(page).toHaveURL(/\/note\?id=/);
  await expect(page.getByLabel("Title")).toHaveValue("Shared Title");
  await expect(page.getByLabel("Body")).toHaveValue(/Shared Text/);
  await expect(page.getByLabel("Body")).toHaveValue(/https:\/\/example.com/);
});
