import { test, expect } from "@playwright/test";
import { analysisFixture } from "./fixtures/analysis";

test("Quant: tự cập nhật lịch sử giữ trang đang xem", async ({ page }) => {
  await page.clock.install();
  const state = await analysisFixture(page); state.status = "SUCCEEDED";
  state.jobs = Array.from({ length: 21 }, (_, index) => ({ id: `history-${index}`, symbol: index === 20 ? "HPG" : "FPT", target_session: index === 20 ? "2026-10-14" : "2026-10-16",
    status: "SUCCEEDED", created_at: 1792224000-index, deadline: 1792310400, attempt: 1, report_id: "report-1", reason: null, quota_effect: "CONSUMED" }));
  await page.goto("/analysis?symbol=FPT");
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.getByText("2026-10-14", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "HPG", exact: true })).toBeVisible();
  await page.clock.fastForward(31000);
  await expect(page.getByRole("button", { name: "Trang trước", exact: true })).toBeEnabled();
  await expect(page.getByText("2026-10-14", { exact: true })).toBeVisible();
});

test("Quant: gửi yêu cầu, tự nhận báo cáo API và mở lại URL", async ({ page }) => {
  const state = await analysisFixture(page), errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/analysis?symbol=FPT");
  await expect(page.getByLabel("Phiên phân tích", { exact: true })).toHaveCount(0);
  await page.getByText("Quy mô vị thế theo vốn (tùy chọn)").click();
  await page.getByLabel("Sử dụng vốn của tôi").check();
  await page.getByLabel("Vốn tài khoản (VND)").fill("100000000");
  await page.getByRole("button", { name: "Gửi yêu cầu Quant FPT", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page).toHaveURL(/job=job-1/);
  await expect(page.getByRole("heading", { name: /Đã tiếp nhận/ })).toBeVisible();
  expect(state.payloads[0]).toEqual({ symbol: "FPT", target_session: "2026-10-16", sizing: { account_size_vnd: 100000000, max_position_risk_ratio: 0.02 } });
  state.status = "SUCCEEDED";
  await expect(page.getByText("Báo cáo kiểm thử theo hợp đồng API.", { exact: true }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".quant-report-section")).toHaveCount(16);
  await page.getByText("Biểu đồ bổ sung · Đối chiếu toàn bộ báo cáo", { exact: true }).click();
  await expect(page.getByRole("img", { name: "Lịch sử giá đóng cửa FPT", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Xâu chuỗi các mô hình và khuyến nghị", exact: true })).toHaveCount(0);
  for (const name of ["Dải giá Monte Carlo FPT", "Phân phối lợi suất cuối kỳ", "Lịch sử trạng thái HMM FPT", "Sụt giảm từ đỉnh FPT", "Hồ sơ nhân tố chuẩn hóa", "Biến động dự báo GARCH"]) {
    await expect(page.getByRole("img", { name, exact: true })).toBeVisible();
  }
  await page.getByText("Xem dữ liệu biểu đồ", { exact: true }).first().click();
  await expect(page.getByRole("columnheader", { name: "P05 (VND)", exact: true })).toBeVisible();
  await expect(page.getByText(/100\.000/).first()).toBeVisible();
  await expect(page.getByText("nghìn ₫", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Xem kết quả mẫu", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Đã hoàn tất/ })).toBeVisible();
  expect(state.created).toBe(1); expect(state.unknown).toEqual([]); expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBeTruthy();
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: `test-results/ui/${test.info().project.name}/analysis-live.png`, scale: "css" });
  await page.getByRole("region", { name: "Phân tích từng module", exact: true }).screenshot({ path: `test-results/ui/${test.info().project.name}/analysis-synthesis.png`, scale: "css" });
  await page.getByRole("region", { name: "Visual Quant FPT", exact: true }).screenshot({ path: `test-results/ui/${test.info().project.name}/analysis-visuals.png`, scale: "css" });
 });

test("Quant: không dùng mẫu để lấp biểu đồ mô hình còn thiếu", async ({ page }) => {
  const state = await analysisFixture(page); state.status = "SUCCEEDED";
  state.report.research!.cone = []; state.report.research!.distribution = [];
  await page.goto("/analysis?symbol=FPT");
  await page.getByRole("button", { name: "Gửi yêu cầu Quant FPT", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await page.getByText("Biểu đồ bổ sung · Đối chiếu toàn bộ báo cáo", { exact: true }).click();
  await expect(page.getByRole("img", { name: "Lịch sử giá đóng cửa FPT", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Sụt giảm từ đỉnh FPT", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Dải giá Monte Carlo FPT", exact: true })).toHaveCount(0);
  await expect(page.getByText(/Báo cáo này chưa có dữ liệu cho biểu đồ/).first()).toBeVisible();
});

test("Quant: mất phản hồi sau tiếp nhận vẫn retry cùng key khi hết hạn mức", async ({ page }) => {
  const state = await analysisFixture(page); state.limit = 1; state.failSubmitOnce = true;
  await page.goto("/analysis?symbol=FPT");
  await page.getByRole("button", { name: "Gửi yêu cầu Quant FPT", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByText(/Chưa xác định được kết quả gửi/)).toBeVisible();
  state.ready = false;
  await expect(page.getByRole("button", { name: "Gửi yêu cầu Quant FPT", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Gửi yêu cầu Quant FPT", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page).toHaveURL(/job=job-1/);
  expect(state.created).toBe(1); expect(state.keys).toHaveLength(2); expect(state.keys[0]).toBe(state.keys[1]);
  expect(state.unknown).toEqual([]);
 });

test("Quant: chặn thiếu gói/kiểm định và không lộ report khi mất phiên", async ({ page }) => {
  const state = await analysisFixture(page); state.active = false;
  await page.goto("/analysis?symbol=FPT");
  await expect(page.getByRole("link", { name: "Xem gói phân tích", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gửi yêu cầu Quant FPT", exact: true })).toBeDisabled();
  state.active = true; state.ready = false;
  await page.reload();
  await expect(page.getByText(/Danh sách thị trường chưa hoàn tất kiểm định/)).toBeVisible();
  expect(state.created).toBe(0);
  state.ready = true; state.status = "SUCCEEDED"; state.denyReport = true;
  await page.reload();
  await page.getByRole("button", { name: "Gửi yêu cầu Quant FPT", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  const job = page.getByRole("region", { name: "Yêu cầu phân tích", exact: true });
  await expect(job.getByText(/Không tìm thấy dữ liệu/)).toBeVisible();
  await expect(page.locator(".quant-report")).toHaveCount(0);
  state.user = false;
  await job.getByRole("button", { name: "Tải lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cần đăng nhập", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Yêu cầu phân tích", exact: true })).toHaveCount(0);
 });
