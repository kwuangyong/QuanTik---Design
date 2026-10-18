import { test, expect, type Page } from "@playwright/test";

// This substitutes only TradingView's network script, not the application lifecycle.
async function stubWidgets(page: Page) {
  await page.route("https://s3.tradingview.com/external-embedding/**", route => route.fulfill({
    contentType: "text/javascript",
    body: `(() => { const s=document.currentScript;const c=s.parentElement;c.dataset.testTvConfig=s.textContent;const f=document.createElement('iframe');f.src='about:blank';c.querySelector('.tradingview-widget-container__widget').appendChild(f); })();`,
  }));
}
test("Native TradingView toolbar is enabled without outer controls or Quant sidebar", async ({ page }) => {
  await stubWidgets(page);
  await page.goto("/charts?symbol=PVS");
  const chart = page.locator('[data-tv-kind="chart"]');
  await expect(chart).toHaveAttribute("data-tv-state", "frame");
  await expect(page.getByLabel("Nguồn biểu đồ", {exact:true})).toHaveCount(0);
  await expect(chart.locator("iframe")).toHaveCount(1);
  await expect(page.locator(".chart-controls,.chart-quant,.sample-chart")).toHaveCount(0);
  await expect(chart.locator('[data-test-tv-config]')).toHaveAttribute("data-test-tv-config", /"hide_top_toolbar":false/);
  await expect(chart.locator('[data-test-tv-config]')).toHaveAttribute("data-test-tv-config", /"hide_side_toolbar":false/);
  await page.getByRole("button", { name: "Chuyển chế độ sáng", exact: true }).click();
  await expect(chart.locator('[data-test-tv-config]')).toHaveAttribute("data-test-tv-config", /"theme":"light"/);
  await expect(chart.locator("iframe")).toHaveCount(1);

});
test("A failed script exposes retry without substituting mock prices", async ({ page }) => {
  await page.route("https://s3.tradingview.com/external-embedding/**", route => route.abort());
  await page.goto("/charts?symbol=PVS");
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
