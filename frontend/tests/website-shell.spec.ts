import { test, expect } from "@playwright/test";
import { analysisFixture } from "./fixtures/analysis";

test("Tra cứu và điều hướng dùng báo cáo Design mà không tự gửi yêu cầu Quant", async ({ page, isMobile }) => {
  const quant = await analysisFixture(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dashboard");
  await page.getByRole("search").getByRole("textbox").fill("HPG Q");
  await page.getByRole("button", { name: "Mở ↗", exact: true }).click();
  await expect(page).toHaveURL(/analysis\?symbol=HPG/);
  await expect(page.getByRole("button", { name: "Gửi yêu cầu Quant HPG", exact: true })).toBeEnabled();
  expect(quant.created).toBe(0);
  await page.getByRole("search").getByRole("textbox").fill("WATCH");
  await page.getByRole("button", { name: "Mở ↗", exact: true }).click();
  await expect(page).toHaveURL(/watch/);
  await expect(page.getByRole("button", { name: /^Theo dõi 3$/ })).toHaveAttribute("aria-pressed", "true");
  if (isMobile) await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.getByRole("link", { name: "Hướng dẫn", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chạy phân tích Quant", exact: true })).toBeVisible();
  await page.getByRole("search").getByRole("textbox").fill("bad command!");
  await page.getByRole("button", { name: "Mở ↗", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Nhập mã như FPT");
  expect(errors).toEqual([]);
});

test("Bộ lọc thị trường được giữ giữa bảng giá, tổng quan và nhóm ngành", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByPlaceholder("Tìm mã hoặc tên").fill("SSI");
  await page.getByRole("button", { name: "Tổng quan", exact: true }).click();
  const overview = page.getByRole("region", { name: "Tổng quan cổ phiếu; cuộn ngang để xem đủ cột" });
  await expect(overview.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Bảng giá", exact: true }).click();
  await expect(page.getByRole("region", { name: "Bảng cổ phiếu; cuộn ngang để xem đủ cột" }).locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Xóa lọc", exact: true }).click();
  await expect(page.getByRole("region", { name: "Bảng cổ phiếu; cuộn ngang để xem đủ cột" }).locator("tbody tr")).toHaveCount(8);
  for (const route of ["/watch", "/guide"]) {
    await page.goto(route);
    const width = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
    expect(width[1]).toBeLessThanOrEqual(width[0] + 1);
  }
});
