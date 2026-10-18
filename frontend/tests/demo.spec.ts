import { test, expect } from "@playwright/test";
import { analysisFixture } from "./fixtures/analysis";

test("Phân tích Quant nằm ở trang riêng, không chen vào popup chart", async ({ page }) => {
  const quant = await analysisFixture(page);
  await page.goto("/dashboard");
  await page.getByPlaceholder("Tìm mã hoặc tên").fill("FPT");
  await page.getByRole("button", { name: "FPT", exact: true }).click();
  const chart = page.getByRole("dialog", { name: "Biểu đồ FPT", exact: true });
  await expect(chart.locator('[data-tv-kind="chart"]')).toBeVisible();
  await expect(chart.locator(".quant-panel,.chart-quant")).toHaveCount(0);
  expect(quant.created).toBe(0);
  await page.keyboard.press("Escape");
  await page.goto("/analysis?symbol=FPT");
  await page.getByRole("button", { name: "Gửi yêu cầu Quant FPT", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  quant.status = "SUCCEEDED";
  await expect(page.getByText("Báo cáo kiểm thử theo hợp đồng API.", { exact: true })).toBeVisible({timeout:10000});
  expect(quant.created).toBe(1);
  expect(quant.unknown).toEqual([]);
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
