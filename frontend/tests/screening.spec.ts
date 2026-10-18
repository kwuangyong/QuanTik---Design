import { test, expect, type Page } from "@playwright/test";
import type { ScreeningItem } from "../src/lib/api/screening";
const item = (symbol: string): ScreeningItem => ({ symbol, exchange: "HOSE", price_vnd: 58000, change_ratio: 0.02, change_5d_ratio: -0.01, change_20d_ratio: 0.1,
  volume_shares: 400000, average_volume_20_shares: 200000, volume_ratio_20: 2, price_to_high20_ratio: 0.98,
  groups: { STRONG: { score: 71.4, met_count: 5, total_count: 7, unavailable_count: 0 }, ACCUMULATION: { score: 57.1, met_count: 4, total_count: 7, unavailable_count: 0 }, DISTRIBUTION: { score: 14.3, met_count: 1, total_count: 7, unavailable_count: 0 } },
  eligible: true, status: "ELIGIBLE" });
async function fixture(page: Page, mode = "ready") {
  const state = { mode, calls: [] as string[], results: [] as string[], details: [] as string[], mutations: [] as string[] };
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.slice(8);
    const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    state.calls.push(path);
    if (path === "auth/refresh") return json({ access_token: "screening-fixture", expires_in: 900 });
    if (path === "me") return json({ id: "screening-user", role: "user", display_name: "Khách kiểm thử", email: "screening@example.test" });
    if (request.method() !== "GET") { state.mutations.push(path); return json({},400); }
    if (path === "screenings/latest") {
      if (state.mode === "unpaid") return json({ code: "SCREENING_SUBSCRIPTION_REQUIRED" },403);
      if (state.mode === "network") return json({ code: "BACKEND_UNAVAILABLE" },502);
      if (state.mode === "waiting") return json({ code: "SCREENING_NOT_READY", latest_attempt: { reason: "TASK_DEADLINE" } },503);
      return json({ id: state.mode === "new" ? "new-run" : "ready-run", target_session: "2026-10-16", published_at: 1792123200, stale: state.mode === "stale", refresh_after_seconds: 60 });
    }
    const match = path.match(/^screenings\/(.+)\/results$/);
    if (match) {
      state.results.push(url.search);
      if (state.mode === "network") return json({ code: "BACKEND_UNAVAILABLE" },502);
      const group = url.searchParams.get("group");
      expect(["OVERALL", "DISTRIBUTION"]).toContain(group);
      const first = match[1] === "new-run" ? "VCB" : "FPT";
      // An oversized fixture also verifies the UI never displays a sixth row.
      const items = (group === "OVERALL" ? [first,"HPG","MBB","SSI","VNM","SHOULD_NOT_SHOW"] : ["BAD1","BAD2","BAD3","BAD4","BAD5","BAD6"]).map(item);
      return json({ run_id: match[1], group, items });
    }
    const detail = path.match(/^screenings\/(.+)\/symbols\/(.+)$/);
    if (detail) {
      state.details.push(path);
      return json({ run_id: detail[1], target_session: "2026-10-16", published_at: 1792123200, input_mode: "COMPLETED_DAILY", observed_at: "2026-10-16T09:00:00+00:00", item: item(detail[2]),
        assessment: { overall_signal: "Theo dõi", adjusted_signal: "Chọn lọc", money_flow: "Tích cực", trend: "Tăng", strength: "Mạnh", investor_note: "Quan sát vùng hỗ trợ.", broker_note: "Theo dõi thanh khoản." },
        market: { last_close: 1600, regime_label: "SIDEWAY", combined_score: 55, risk_label: "Trung bình", change_5d_ratio: 0.01, change_20d_ratio: -0.02, above_ma20: true, atr_pct: 1.4, investor_strategy: "Chọn lọc cơ hội.", broker_strategy: "Theo dõi thị trường." } });
    }
    return json({ code: "NOT_FOUND" },404);
  });
  return state;
}

test("Screening: banner chỉ đọc kết quả sau khi kích hoạt", async ({ page }) => {
  const state = await fixture(page); await page.goto("/screener");
  const activate = page.getByRole("button", { name: "Kích hoạt kết quả" });
  await expect(activate).toBeVisible();
  expect(state.calls.filter(path => path.startsWith("screenings/"))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBeTruthy();
  await activate.click();
  await expect(page.getByRole("button", { name: "FPT", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "← Xem lại banner" }).click();
  await expect(activate).toBeVisible();
  await activate.click();
  await expect(page.getByRole("button", { name: "FPT", exact: true })).toBeVisible();
  expect(state.mutations).toEqual([]);
});

test("Screening: hai bảng top 5 đầy đủ thông tin và modal", async ({ page }, testInfo) => {
  const state = await fixture(page); await page.goto("/screener"); await page.getByRole("button", { name: "Kích hoạt kết quả" }).click();
  const best = page.getByRole("region", { name:"5 mã tốt nhất", exact:true });
  const worst = page.getByRole("region", { name:"5 mã cần thận trọng", exact:true });
  await expect(best.locator("tbody tr")).toHaveCount(5);
  await expect(worst.locator("tbody tr")).toHaveCount(5);
  await expect(page.getByText("SHOULD_NOT_SHOW")).toHaveCount(0);
  await expect(page.getByRole("button", { name:"BAD6", exact:true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name:"Phân trang screening" })).toHaveCount(0);
  await expect(page.getByLabel("Tìm mã", { exact:true })).toHaveCount(0);
  await expect(page.getByLabel("Số mã / trang")).toHaveCount(0);
  for (const table of [best, worst]) {
    for (const label of ["Giá đóng cửa", "KL phiên", "KL TB20", "MẠNH", "TÍCH LŨY", "PHÂN PHỐI"]) {
      await expect(table.getByRole("columnheader", { name:label, exact:true })).toHaveCount(1);
    }
  }
  await expect(best.getByRole("link", { name:"Chạy phân tích Quant FPT", exact:true })).toHaveAttribute("href", "/analysis?symbol=FPT");
  await expect(worst.getByRole("link", { name:"Chạy phân tích Quant BAD1", exact:true })).toHaveAttribute("href", "/analysis?symbol=BAD1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBeTruthy();
  await page.screenshot({ path:testInfo.outputPath("screening-table.png"), fullPage:true });
  await best.getByRole("button", { name:"FPT", exact:true }).click();
  const modal = page.getByRole("dialog");
  await expect(modal.getByRole("heading", { name:"Bối cảnh VNINDEX", exact:true })).toBeVisible();
  await expect(modal.getByText("Quan sát vùng hỗ trợ.")).toBeVisible();
  await expect(modal.getByRole("link", { name:/Phân tích Quant/ })).toHaveAttribute("href", "/analysis?symbol=FPT");
  expect(await modal.evaluate(el => el.scrollWidth <= el.clientWidth+1)).toBeTruthy();
  const bounds = await modal.boundingBox();
  expect(bounds!.x).toBeGreaterThan(0);
  expect(Math.abs(bounds!.x*2 + bounds!.width - page.viewportSize()!.width)).toBeLessThan(2);
  await page.screenshot({ path:testInfo.outputPath("screening-modal.png") });
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(best.getByRole("button", { name:"FPT", exact:true })).toBeFocused();
  await worst.getByRole("button", { name:"BAD1", exact:true }).click();
  await expect(modal.getByRole("heading", { name:"BAD1 · Chi tiết screening" })).toBeVisible();
  await expect(modal.getByText("Quan sát vùng hỗ trợ.")).toBeVisible();
  expect(state.mutations).toEqual([]);
  expect(state.details).toContain("screenings/ready-run/symbols/FPT");
  expect(state.details).toContain("screenings/ready-run/symbols/BAD1");
});

test("Screening: cập nhật bảng giữ modal đúng bản công bố", async ({ page }) => {
  await page.clock.install();
  const state = await fixture(page); await page.goto("/screener"); await page.getByRole("button", { name: "Kích hoạt kết quả" }).click();
  await page.getByRole("button",{ name:"FPT", exact:true }).click();
  await expect(page.getByRole("dialog").getByText("Quan sát vùng hỗ trợ.")).toBeVisible();
  state.mode = "new";
  await page.clock.fastForward(61000);
  await expect(page.getByRole("button",{ name:"VCB", exact:true })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("heading",{ name:"FPT · Chi tiết screening" })).toBeVisible();
  expect(state.details.every(path => path.includes("ready-run"))).toBeTruthy();
  await page.getByRole("button",{ name:"Đóng", exact:true }).click();
  await page.getByRole("button",{ name:"VCB", exact:true }).click();
  await expect(page.getByRole("dialog").getByText("Quan sát vùng hỗ trợ.")).toBeVisible();
  expect(state.details).toContain("screenings/new-run/symbols/VCB");
});

test("Screening: gói hết hiệu lực dẫn mua và không tải danh sách", async ({ page }) => {
  const state=await fixture(page,"unpaid"); await page.goto("/screener"); await page.getByRole("button", { name: "Kích hoạt kết quả" }).click();
  await expect(page.getByRole("heading",{ name:"Cần gói phân tích còn hiệu lực",exact:true })).toBeVisible();
  await expect(page.getByRole("link",{ name:"Xem các gói phân tích",exact:true })).toHaveAttribute("href","/plans");
  expect(state.results).toEqual([]);
});

test("Screening: chờ dữ liệu không lộ nguyên nhân vận hành", async ({ page }) => {
  await fixture(page,"waiting"); await page.goto("/screener"); await page.getByRole("button", { name: "Kích hoạt kết quả" }).click();
  await expect(page.getByRole("heading",{ name:"Chưa có kết quả được công bố",exact:true })).toBeVisible();
  await expect(page.getByText(/TASK_DEADLINE|quá hạn xử lý|Lần xử lý gần nhất/)).toHaveCount(0);
});

test("Screening: giữ ngày dữ liệu và bản cũ khi cập nhật lỗi", async ({ page }) => {
  await page.clock.install();
  const state=await fixture(page,"stale"); await page.goto("/screener"); await page.getByRole("button", { name: "Kích hoạt kết quả" }).click();
  await expect(page.getByText("Dữ liệu ngày 16/10/2026",{ exact:true })).toBeVisible();
  await expect(page.getByText(/Đang hiển thị kết quả gần nhất/)).toBeVisible();
  await expect(page.getByRole("button",{ name:"FPT", exact:true })).toBeVisible();
  state.mode="network"; await page.clock.fastForward(61000);
  await expect(page.getByRole("button",{ name:"FPT", exact:true })).toBeVisible();
  await expect(page.getByRole("button",{ name:"Thử lại", exact:true })).toBeVisible();
});
