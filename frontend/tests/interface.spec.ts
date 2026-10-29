import { test, expect, type Page } from "@playwright/test";
import { analysisFixture } from "./fixtures/analysis";
import { agrFixture } from "./fixtures/agr";

test.beforeEach(async ({ page }) => {
  await agrFixture(page);
  await page.route("https://chart.vps.com.vn/tv/**", route => route.fulfill({ contentType: "text/html", body: "<html><body>Chart</body></html>" }));
});


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

test("Dashboard hợp nhất bảng điện, nhóm ngành và Theo dõi", async ({ page }) => {
  await page.goto("/dashboard");
  const board = page.getByRole("region", { name: "Bảng cổ phiếu; cuộn ngang để xem đủ cột" });
  await expect(board.locator("tbody tr")).toHaveCount(8);
  await page.screenshot({ path: `test-results/ui/${test.info().project.name}/dashboard.png`, fullPage: true });
  await page.getByPlaceholder("Tìm mã hoặc tên").fill("SSI");
  await expect(board.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Theo dõi SSI", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /^Theo dõi 4$/ }).click();
  await expect(board.getByRole("link", { name: "SSI", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bỏ theo dõi SSI", exact: true }).click();
  await expect(board.getByRole("link", { name: "SSI", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await page.getByRole("button", { name: "Công nghệ Thông tin", exact: true }).click();
  await expect(board.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Xóa lọc ngành" }).click();
  const positions = await page.locator(".dashboard-stack > section").evaluateAll(elements => elements.map(el => el.getBoundingClientRect().top));
  expect(positions.length).toBe(2);
  expect(positions[1]).toBeGreaterThan(positions[0]);
  await expect(page.locator(".selected-stock")).toHaveCount(0);
});

test("Dashboard mở trang biểu đồ bằng mã hoặc biểu tượng, giữ sidebar Quant", async ({ page }) => {
  const quant = await analysisFixture(page);
  await page.goto("/dashboard");
  await page.getByPlaceholder("Tìm mã hoặc tên").fill("FPT");
  await page.getByRole("link", { name: "FPT", exact: true }).click();
  await expect(page).toHaveURL(/\/charts\?symbol=FPT$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const chart = page.locator(".chart-workspace");
  await expect(chart).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByPlaceholder("Tìm mã hoặc tên").fill("FPT");
  await page.getByRole("link", { name: "Biểu đồ FPT", exact: true }).click();
  await expect(page).toHaveURL(/\/charts\?symbol=FPT$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(chart.getByLabel("Nguồn biểu đồ", { exact: true })).toHaveCount(0);
  await expect(chart.locator('iframe[title="Biểu đồ FPT"]')).toHaveAttribute("src", "https://chart.vps.com.vn/tv/?symbol=FPT&allowFullscreen=true&resolution=1D&lang=vi");
  await chart.getByLabel("Khung thời gian", { exact: true }).selectOption("1W");
  await expect(chart.locator("iframe")).toHaveAttribute("src", /resolution=1W/);
  await expect(chart.locator("iframe")).toHaveAttribute("allowfullscreen", "");
  await expect(chart.getByRole("link", { name: "Mở biểu đồ ↗", exact: true })).toHaveAttribute("href", "https://chart.vps.com.vn/tv/?symbol=FPT&allowFullscreen=true&resolution=1W&lang=vi");
  await chart.getByRole("button", { name: "Thu phân tích", exact: true }).click();
  await expect(chart.getByRole("complementary")).toHaveCount(0);
  await chart.getByRole("button", { name: "Mở phân tích bên chart", exact: true }).click();
  await chart.getByRole("button", { name: "Gửi yêu cầu Quant FPT", exact: true }).click();
  const review = chart.getByRole("region", { name: "Gửi yêu cầu phân tích?", exact: true });
  await expect(review).toContainText("Phiên 2026-10-16");
  await review.getByRole("button", { name: "Quay lại", exact: true }).click();
  expect(quant.created).toBe(0);
  await chart.getByRole("link", { name: "Mở Quant toàn màn hình" }).click();
  await expect(page).toHaveURL(/analysis\?symbol=FPT/);
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

test("Biểu đồ VPS hỗ trợ mã ngoài danh sách cục bộ", async ({ page }) => {
  await analysisFixture(page);
  await page.goto("/charts?symbol=ACG&exchange=HOSE");
  await expect(page.locator('iframe[title="Biểu đồ ACG"]')).toHaveAttribute("src", /symbol=ACG/);
  await page.goto("/charts?symbol=ABW");
  await expect(page.locator("iframe")).toHaveAttribute("src", "https://chart.vps.com.vn/tv/?symbol=ABW&allowFullscreen=true&resolution=1D&lang=vi");
  await expect(page.getByLabel("Chọn mã biểu đồ",{ exact:true })).toHaveValue("ABW");
  await expect(page.getByLabel("Nguồn biểu đồ",{ exact:true })).toHaveCount(0);
});
