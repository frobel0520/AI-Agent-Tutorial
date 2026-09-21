import { expect, test } from "@playwright/test";

const SMOKE_ACCESS_TOKEN = "smoke-session-token";

async function installMockSession(page) {
  await page.route("https://mock.supabase.test/**", (route) => route.abort());
  await page.addInitScript((accessToken) => {
    window.localStorage.setItem(
      "sb-mock-auth-token",
      JSON.stringify({
        access_token: accessToken,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        refresh_token: "smoke-refresh-token",
        token_type: "bearer",
        user: {
          email: "smoke@example.test",
          id: "00000000-0000-4000-8000-000000000001",
          user_metadata: { full_name: "Smoke Test" },
        },
      }),
    );
  }, SMOKE_ACCESS_TOKEN);
}

async function mockHealthyApi(page, requests) {
  await page.route("**/health", async (route) => {
    requests.push(route.request());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        app_name: "Smoke API",
        dify_configured: false,
        llm_provider: "mock",
        llm_ready: true,
        persistent_data: true,
        status: "ok",
        storage: "mock",
      }),
    });
  });
  await page.route("**/notes", async (route) => {
    requests.push(route.request());
    if (route.request().method() === "GET") {
      await route.fulfill({ contentType: "application/json", body: "[]" });
      return;
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: 1 }) });
  });
  await page.route("**/dify/access", async (route) => {
    requests.push(route.request());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ authenticated: true, authorized: false }),
    });
  });
}

async function openApp(page, requests = []) {
  await installMockSession(page);
  await mockHealthyApi(page, requests);
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "從這裡開始學 RAG" })).toBeVisible();
}

test("built app renders at a path prefix with headings, navigation, and assets", async ({ page }) => {
  const requests = [];
  await openApp(page, requests);

  await expect(page.getByRole("navigation", { name: "教學步驟" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "學習路徑" })).toBeVisible();
  expect(page.url()).toContain("/smoke/");
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((request) => request.headers().authorization === `Bearer ${SMOKE_ACCESS_TOKEN}`)).toBe(true);

  const assetFailures = [];
  page.on("response", (response) => {
    if (response.url().includes("/smoke/") && response.status() >= 400) {
      assetFailures.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "從這裡開始學 RAG" })).toBeVisible();
  expect(assetFailures).toEqual([]);
});

test("render exception shows safe Traditional Chinese fallback and reload action", async ({ page }) => {
  await page.goto("./tests/error-boundary.html");

  await expect(page.getByRole("heading", { name: "頁面暫時無法顯示" })).toBeVisible();
  await expect(page.getByRole("button", { name: "重新載入頁面" })).toBeVisible();
  await expect(page.getByText("fixture-only secret-like details must not be rendered")).toHaveCount(0);
});

test("API failure keeps the page rendered", async ({ page }) => {
  await installMockSession(page);
  await page.route("**/health", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "internal provider details must stay hidden" }),
    });
  });
  await page.route("**/notes", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.route("**/dify/access", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ authenticated: true, authorized: false }) });
  });
  await page.goto("./");

  await expect(page.getByRole("heading", { name: "從這裡開始學 RAG" })).toBeVisible();
  await expect(page.getByText("服務目前無法完成請求，請稍後再試。").first()).toBeVisible();
  await expect(page.getByText("internal provider details must stay hidden")).toHaveCount(0);
});

test("401, 403, and 429 are clear and do not trigger automatic retries", async ({ page }) => {
  const requests = [];
  await openApp(page, requests);
  const statusResponses = [401, 403, 429];
  await page.route("**/webhooks", async (route) => {
    const status = statusResponses.shift();
    requests.push(route.request());
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ detail: "sensitive backend detail" }),
    });
  });

  await page.getByLabel("WebHook 接收 URL").fill("https://example.test/hook");
  for (const [status, message] of [
    [401, "登入狀態已失效或缺少登入，請重新登入。"],
    [403, "你沒有權限執行此操作。"],
    [429, "請求過於頻繁，請稍後再試。"],
  ]) {
    await page.getByRole("button", { name: "註冊 WebHook" }).click();
    // The same message also appears in the global status banner; assert the webhook result box.
    await expect(page.locator("#webhookResult")).toHaveText(`${status}：${message}`);
    await expect(page.getByText("sensitive backend detail")).toHaveCount(0);
  }

  const webhookRequests = requests.filter((request) => request.url().endsWith("/webhooks"));
  expect(webhookRequests).toHaveLength(3);
  expect(webhookRequests.every((request) => request.headers().authorization === `Bearer ${SMOKE_ACCESS_TOKEN}`)).toBe(true);
});
