import { test, expect, type Page } from "@playwright/test";

// This substitutes only TradingView's network script, not the application lifecycle.
async function stubWidgets(page: Page) {
  await page.route("https://s3.tradingview.com/external-embedding/**", route => route.fulfill({
    contentType: "text/javascript",
    body: `(() => { const s=document.currentScript;const c=s.parentElement;c.dataset.testTvConfig=s.textContent;const f=document.createElement('iframe');f.src='about:blank';c.querySelector('.tradingview-widget-container__widget').appendChild(f); })();`,
  }));
}
test("Widgets mount once; chart controls update config and keep the chosen exchange", async ({ page }) => {
  await stubWidgets(page);
  await page.goto("/dashboard");
  const chart = page.locator('[data-tv-kind="chart"]');
  await expect(chart).toHaveAttribute("data-tv-state", "frame");
  await expect(page.locator('[data-tv-kind="quotes"] iframe')).toHaveCount(1);
  await expect(chart.locator("iframe")).toHaveCount(1);
  await page.getByLabel("Khung thời gian", { exact: true }).selectOption("15");
  await expect(chart.locator('[data-test-tv-config]')).toHaveAttribute("data-test-tv-config", /"interval":"15"/);
  await page.getByLabel("Bộ chỉ báo", { exact: true }).selectOption("momentum");
  await expect(chart.locator('[data-test-tv-config]')).toHaveAttribute("data-test-tv-config", /MACD@tv-basicstudies/);
  await page.getByLabel("Mã TradingView", { exact: true }).fill("HNX:A32");
  await page.getByRole("button", { name: "Mở", exact: true }).click();
  await expect(chart.locator('[data-test-tv-config]')).toHaveAttribute("data-test-tv-config", /"symbol":"HNX:A32"/);
  await page.getByRole("button", { name: "Chuyển chế độ sáng", exact: true }).click();
  await expect(chart.locator('[data-test-tv-config]')).toHaveAttribute("data-test-tv-config", /"theme":"light"/);
  await expect(chart.locator("iframe")).toHaveCount(1);
  await page.getByRole("button", { name: "Thị trường Việt Nam", exact: true }).click();
  await expect(page.locator('[data-tv-kind="market"] [data-test-tv-config]')).toHaveAttribute("data-test-tv-config", /"market":"vietnam"/);
});
test("A failed script exposes retry without substituting mock prices", async ({ page }) => {
  await page.route("https://s3.tradingview.com/external-embedding/**", route => route.abort());
  await page.goto("/dashboard");
  const chart = page.locator('[data-tv-kind="chart"]');
  await expect(chart).toHaveAttribute("data-tv-state", "error");
  await expect(chart).toContainText("Chưa tải được widget");
  await expect(page.locator(".sample-chart")).toHaveCount(0);
  await page.unroute("https://s3.tradingview.com/external-embedding/**");
  await stubWidgets(page);
  await chart.getByRole("button", { name: "Tải lại", exact: true }).click();
  await expect(chart).toHaveAttribute("data-tv-state", "frame");
  await expect(chart.locator("iframe")).toHaveCount(1);
});
