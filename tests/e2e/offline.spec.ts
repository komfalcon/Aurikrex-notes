import { expect, test } from "@playwright/test";

test("offline create and reload persists note", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Create a new note" }).click();
  await expect(page).toHaveURL(/\/note\?id=/);
  await page.getByLabel("Title").fill("Offline Note");
  await page.getByLabel("Body").fill("Saved without a network connection");
  await context.setOffline(true);
  await page.getByLabel("Body").fill("Edited while offline");
  await context.setOffline(false);
  const reopened = await context.newPage();
  await reopened.goto(page.url());
  await expect(reopened.getByLabel("Title")).toHaveValue("Offline Note");
  await expect(reopened.getByLabel("Body")).toHaveValue("Edited while offline");
  await reopened.close();
});

test("share target parameters create note", async ({ page }) => {
  await page.goto("/new?title=Shared%20Title&text=Shared%20Text&url=https%3A%2F%2Fexample.com");
  await expect(page).toHaveURL(/\/note\?id=/);
  await expect(page.getByLabel("Title")).toHaveValue("Shared Title");
  await expect(page.getByLabel("Body")).toHaveValue(/Shared Text/);
  await expect(page.getByLabel("Body")).toHaveValue(/https:\/\/example.com/);
});

test("Cloudflare credentials persist locally", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Cloudflare Account ID").fill("0123456789abcdef0123456789abcdef");
  await page.getByLabel("Cloudflare API Token").fill("test-token-that-is-never-sent-during-save");
  await page.getByRole("button", { name: "Save credentials" }).click();
  await expect(page.getByRole("button", { name: "Credentials saved" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Cloudflare Account ID")).toHaveValue("0123456789abcdef0123456789abcdef");
  await expect(page.getByLabel("Cloudflare API Token")).toHaveValue("test-token-that-is-never-sent-during-save");
});

test("auto-title and summarize apply successful AI responses", async ({ page }) => {
  await page.route(/https:\/\/(?:cdn\.jsdelivr\.net|(?:cdn-lfs\.)?huggingface\.co)\//, (route) => route.abort());
  await page.goto("/settings");
  await page.getByLabel("Cloudflare Account ID").fill("0123456789abcdef0123456789abcdef");
  await page.getByLabel("Cloudflare API Token").fill("test-token-never-sent-to-cloudflare");
  await page.getByRole("button", { name: "Save credentials" }).click();

  await page.route("**/api/ai", async (route) => {
    const body = route.request().postDataJSON() as { messages: Array<{ content: string }> };
    const response = body.messages.some((message) => message.content.startsWith("Create a concise title"))
      ? "A generated note title"
      : "- First key point\n- Second key point\n- Third key point";
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, result: { response } }) });
  });

  await page.goto("/new?text=My mechanical engineering study plans and lecture notes for this semester.");
  await expect(page).toHaveURL(/\/note\?id=/);
  await expect(page.getByLabel("Title")).toHaveValue("A generated note title", { timeout: 15_000 });

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Summarize" }).click();
  await expect(page.getByLabel("Body")).toHaveValue(/First key point/);
  await expect(page.getByLabel("Title")).toHaveValue("A generated note title");
});
