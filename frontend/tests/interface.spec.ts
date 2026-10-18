import { test, expect, type Page } from "@playwright/test";
import { analysisFixture } from "./fixtures/analysis";


test("Home giữ nội dung và dẫn đến đăng nhập hệ thống", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Nghe một mã/ })).toBeVisible();
  await page.locator(".home-live-heading button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401, contentType: "application/json", body: '{"code":"UNAUTHENTICATED"}' }));
  await page.getByRole("button", { name: "Đăng nhập hệ thống" }).click();
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole("heading", { name: "Đăng nhập hệ thống" })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Khu vực quản trị" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Dashboard chỉ hiển thị bảng điện và Theo dõi", async ({ page }) => {
  await page.goto("/dashboard");
  const board = page.getByRole("region", { name: "Bảng cổ phiếu; cuộn ngang để xem đủ cột" });
  await expect(board.locator("tbody tr")).toHaveCount(16);
  await page.screenshot({ path: `test-results/ui/${test.info().project.name}/dashboard.png`, fullPage: true });
  await page.getByRole("textbox", {name:"Tìm trong danh sách cổ phiếu",exact:true}).fill("SSI");
  await expect(board.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Theo dõi SSI", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /^Theo dõi 4$/ }).click();
  await expect(board.getByRole("button", { name: "SSI", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bỏ theo dõi SSI", exact: true }).click();
  await expect(board.getByRole("button", { name: "SSI", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await page.getByLabel("Lọc nhóm ngành", {exact:true}).selectOption("Công nghệ Thông tin");
  await expect(board.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Xóa lọc ngành" }).click();
  const positions = await page.locator(".dashboard-stack > section").evaluateAll(elements => elements.map(el => el.getBoundingClientRect().top));
  expect(positions.length).toBe(1);

  await expect(page.locator(".selected-stock")).toHaveCount(0);
});

test("Bấm mã chỉ mở popup chart TradingView", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("textbox", {name:"Tìm trong danh sách cổ phiếu",exact:true}).fill("FPT");
  await page.getByRole("button", { name: "FPT", exact: true }).click();
  const chart = page.getByRole("dialog", { name: "Biểu đồ FPT", exact: true });
  await expect(chart).toBeVisible();
  await expect(chart.locator('[data-tv-kind="chart"]')).toBeVisible();
  await expect(chart.locator(".chart-controls,.chart-quant,.sample-chart")).toHaveCount(0);
  await expect(chart.getByRole("combobox")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(chart).not.toBeVisible();
});

test("Quét toàn sàn yêu cầu đăng nhập và không có nút phát động quét", async ({ page }) => {
  await page.goto("/screener");
  await expect(page.getByRole("heading", { name: "Cần đăng nhập", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quét toàn sàn", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Quét lại", exact: true })).toHaveCount(0);
});

test("Theme và các trang giữ bố cục trong màn hình desktop/mobile", async ({ page, isMobile }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Chuyển chế độ sáng" }).click();
  await page.reload();
  await expect(page.locator(".terminal")).toHaveAttribute("data-theme", "light");
  for (const route of ["/", "/dashboard", "/screener", "/analysis?symbol=FPT", "/charts?symbol=FPT"]) {
    await page.goto(route);
    const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(sizes.scroll, route).toBeLessThanOrEqual(sizes.width + 1);
  }
  if (isMobile) {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
    await page.getByRole("link", { name: "Quét toàn sàn", exact: true }).click();
    await expect(page).toHaveURL(/screener/);
    await expect(page.getByRole("button", { name: "Mở menu", exact: true })).toHaveAttribute("aria-expanded", "false");
  }
});

test("Biểu đồ: mã ngoài snapshot vẫn dùng widget theo sàn", async ({ page }) => {
  await analysisFixture(page);
  await page.goto("/charts?symbol=ACG&exchange=HOSE");
  await expect(page.locator('[data-tv-kind="chart"]')).toBeVisible();
  await expect(page.locator('[data-tv-kind="chart"] a').first()).toHaveAttribute("href", /HOSE%3AACG/);
  await expect(page.getByLabel("Nguồn biểu đồ",{ exact:true })).toHaveCount(0);
});
