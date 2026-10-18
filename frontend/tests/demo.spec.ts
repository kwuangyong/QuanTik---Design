import { test, expect } from "@playwright/test";
import { analysisFixture } from "./fixtures/analysis";

test("Biểu đồ mẫu và yêu cầu Quant API trong sidebar không trộn kết quả", async ({ page }) => {
  const quant = await analysisFixture(page);
  const errors: string[] = [], apiCalls: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (/\/api\/|\/quant\/jobs/.test(request.url())) apiCalls.push(request.url()); });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Toàn cảnh thị trường", exact: true })).toBeVisible();
  await page.getByPlaceholder("Tìm mã hoặc tên").fill("FPT");
  await page.getByRole("button", { name: "FPT", exact: true }).click();
  const chart = page.getByRole("dialog", { name: "Biểu đồ FPT", exact: true });
  await expect(chart.getByRole("img", { name: /48 phiên mẫu/ })).toBeVisible();
  const plot = await chart.locator(".sample-chart").boundingBox();
  const panel = await chart.locator(".chart-quant").boundingBox();
  if (plot && panel && panel.y < plot.y + plot.height) {
    expect(plot.x + plot.width).toBeLessThanOrEqual(panel.x);
  }
  await chart.getByLabel("Khung thời gian", { exact: true }).selectOption("1M");
  await expect(chart.getByRole("img", { name: /12 phiên mẫu/ })).toBeVisible();
  await chart.getByRole("button", { name: "Gửi yêu cầu Quant FPT", exact: true }).click();
  await chart.getByRole("button", { name: "Xác nhận", exact: true }).click();
  quant.status = "SUCCEEDED";
  await expect(chart.getByText("Báo cáo kiểm thử theo hợp đồng API.", { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(chart.locator(".quant-report-section[open]")).toHaveCount(0);
  await chart.locator(".quant-report-section > summary").filter({ hasText: "Hiệu suất & dòng tiền" }).click();
  await expect(chart.getByRole("img", { name: "Lịch sử giá đóng cửa FPT", exact: true })).toBeVisible();
  expect(quant.created).toBe(1); expect(quant.unknown).toEqual([]);
  expect(errors).toEqual([]);
  expect(apiCalls.some(url => url.includes("/analyses"))).toBeTruthy();
});

test("Đổi mã Quant kiểm tra danh sách thật, không dùng kết quả mẫu", async ({ page }) => {
  const quant = await analysisFixture(page);
  await page.goto("/analysis?symbol=HPG");
  await expect(page.getByRole("button", { name: "Gửi yêu cầu Quant HPG", exact: true })).toBeEnabled();
  await page.getByLabel("Chọn mã phân tích", { exact: true }).fill("ZZZ");
  await page.getByRole("button", { name: "Chọn mã", exact: true }).click();
  await expect(page.getByRole("button", { name: "Gửi yêu cầu Quant ZZZ", exact: true })).toBeDisabled();
  await expect(page.getByText(/Mã ZZZ chưa có dữ liệu phân tích/)).toBeVisible();
  expect(quant.created).toBe(0);
});
