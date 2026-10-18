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

test("Dashboard hợp nhất bảng điện, nhóm ngành và Theo dõi", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Dữ liệu mẫu · xem bố cục", exact: true }).click();
  const board = page.getByRole("region", { name: "Bảng cổ phiếu; cuộn ngang để xem đủ cột" });
  await expect(board.locator("tbody tr")).toHaveCount(8);
  await page.screenshot({ path: `test-results/ui/${test.info().project.name}/dashboard.png`, fullPage: true });
  await page.getByPlaceholder("Tìm mã hoặc tên").fill("SSI");
  await expect(board.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Theo dõi SSI", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Dữ liệu mẫu · xem bố cục", exact: true }).click();
  await page.getByRole("button", { name: /^Theo dõi 4$/ }).click();
  await expect(board.getByRole("button", { name: "SSI", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bỏ theo dõi SSI", exact: true }).click();
  await expect(board.getByRole("button", { name: "SSI", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await page.getByRole("button", { name: "Công nghệ Thông tin", exact: true }).click();
  await expect(board.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Xóa lọc ngành" }).click();
  const positions = await page.locator(".dashboard-stack > section").evaluateAll(elements => elements.map(el => el.getBoundingClientRect().top));
  expect(positions.length).toBe(3);
  expect(positions[1]).toBeGreaterThan(positions[0]);
  await expect(page.locator(".selected-stock")).toHaveCount(0);
});

test("Bấm mã mở biểu đồ mô phỏng cùng Quant, mở/thu sidebar và toàn màn hình", async ({ page }) => {
  const quant = await analysisFixture(page);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Dữ liệu mẫu · xem bố cục", exact: true }).click();
  await page.getByPlaceholder("Tìm mã hoặc tên").fill("FPT");
  await page.getByRole("button", { name: "FPT", exact: true }).click();
  const chart = page.getByRole("dialog", { name: "Biểu đồ FPT", exact: true });
  await expect(chart).toBeVisible();
  await chart.getByLabel("Nguồn biểu đồ", { exact: true }).selectOption("sample");
  await expect(chart.getByRole("img", { name: /Biểu đồ nến mô phỏng FPT/ })).toBeVisible();
  await chart.getByLabel("Khung thời gian", { exact: true }).selectOption("W");
  await expect(chart.getByText("Nến mẫu · FPT · 1W", { exact: true })).toBeVisible();
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
  await page.getByRole("button", { name: "Dữ liệu mẫu · xem bố cục", exact: true }).click();
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
  await page.getByRole("button", { name: "Dữ liệu mẫu · xem bố cục", exact: true }).click();
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
    await page.getByRole("link", { name: "Quét toàn sàn", exact: true }).click();
    await expect(page).toHaveURL(/screener/);
    await expect(page.getByRole("button", { name: "Mở menu", exact: true })).toHaveAttribute("aria-expanded", "false");
  }
});

test("Biểu đồ: mã chưa có mẫu hiển thị trạng thái rõ ràng", async ({ page }) => {
  await analysisFixture(page);
  await page.goto("/charts?symbol=ACG&exchange=HOSE");
  await page.getByLabel("Nguồn biểu đồ", { exact: true }).selectOption("sample");
  await expect(page.getByText("Chưa có nến mẫu cho ACG",{ exact:true })).toBeVisible();
  await expect(page.getByLabel("Chọn mã biểu đồ",{ exact:true })).toHaveValue("ACG");
  await expect(page.getByLabel("Nguồn biểu đồ",{ exact:true })).toHaveValue("sample");
});
