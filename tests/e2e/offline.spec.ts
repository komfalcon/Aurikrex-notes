import { expect, test } from "@playwright/test";

test("offline create and reload persists note", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Create a new note" }).click();
  await expect(page).toHaveURL(/\/note\?id=/);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.getByLabel("Title").fill("Offline Note");
  await page.getByLabel("Body").fill("Saved without a network connection");
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel("Body").fill("Edited and saved while offline");
  await expect(page.getByText("Saved on this device")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Title")).toHaveValue("Offline Note");
  await expect(page.getByLabel("Body")).toHaveValue("Edited and saved while offline");
});

test("share target parameters create note", async ({ page }) => {
  await page.goto("/new?title=Shared%20Title&text=Shared%20Text&url=https%3A%2F%2Fexample.com");
  await expect(page).toHaveURL(/\/note\?id=/);
  await expect(page.getByLabel("Title")).toHaveValue("Shared Title");
  await expect(page.getByLabel("Body")).toHaveValue(/Shared Text/);
  await expect(page.getByLabel("Body")).toHaveValue(/https:\/\/example.com/);
});
