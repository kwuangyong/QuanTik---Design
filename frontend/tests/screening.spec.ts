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
  const worst = page.getByRole("region", { name:"5 mã nên tránh nhất", exact:true });
  await expect(best.locator("tbody tr")).toHaveCount(5);
  await expect(worst.locator("tbody tr")).toHaveCount(5);
  await expect(page.getByText("SHOULD_NOT_SHOW")).toHaveCount(0);
  await expect(page.getByRole("button", { name:"BAD6", exact:true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name:"Phân trang screening" })).toHaveCount(0);
  await expect(page.getByLabel("Tìm mã", { exact:true })).toHaveCount(0);
  await expect(page.getByLabel("Số mã / trang")).toHaveCount(0);
  for (const table of [best, worst]) {
    await expect(table.locator("tbody tr").first().locator("th, td")).toHaveCount(42);
    // Independent header order read from the supplied Google Sheet, not the component schema.
    await expect(table.locator("thead button")).toHaveText(["Mã", "Khuyến nghị", "Đạt bộ lọc", "Giải thích điều kiện", "Điểm", "Đánh giá", "Thời gian nắm giữ", "Xu hướng VN-Index", "Nhóm ngành", "Xu hướng ngành", "Lợi nhuận ngành 20 phiên (%)", "Tương quan ngành", "Mã dẫn dắt ngành", "Sharpe", "Win Rate (%)", "Max DD (%)", "Annual Return (%)", "HMM", "Volatility Regime", "Dự báo", "Lợi nhuận dự báo (%)", "Đồng thuận (%)", "Lợi nhuận gộp (%)", "Chi phí (%)", "Lợi nhuận ròng (%)", "Biến động mô phỏng", "Sụt giảm khi chờ T+2 (%)", "Xác suất lỗ trên 3% (%)", "Chất lượng dữ liệu", "Điểm dữ liệu", "Cảnh báo dữ liệu", "Thanh khoản", "GTGD TB 20 phiên (tỷ)", "Sức chứa tối đa (cổ phiếu)", "Khoảng trống giá 95% (%)", "Entry", "SL", "TP1", "TP2", "Model Agreement (%)", "RiskPctNAV", "Nhận xét chi tiết"]);
    await expect(table.locator("tbody tr").first().locator("[data-sheet-key]")).toHaveCount(41);
    await expect(table.getByRole("link", { name: /Kích hoạt phân tích quant chi tiết/ })).toHaveCount(5);
    for (const label of ["Khuyến nghị", "Đạt bộ lọc", "Giải thích điều kiện", "Điểm", "Sharpe", "RiskPctNAV"]) {
      await expect(table.getByRole("columnheader", { name:label, exact:true })).toHaveCount(1);
    }
  }
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

test("Screening sheet: giữ đúng đơn vị, gate, chú giải và cột mã khi cuộn", async ({ page }, testInfo) => {
  const state = await fixture(page);
  await page.route("**/api/v1/screenings/*/results?*", async route => {
    const group = new URL(route.request().url()).searchParams.get("group");
    const enriched = { ...item("FPT"), name: "Công ty Cổ phần FPT", action: "WATCH", gate_pass: false,
      gate_reasons: ["TIMING_NOT_READY"], score: 72, rating: "THEO DÕI", holding_sessions: 10,
      index_trend: "NEUTRAL", sector: "Công nghệ", sector_trend: "Tăng", sector_return_20d_pct: 5.1,
      sector_correlation: 0.75, sector_lead_lag: "FPT dẫn trước 1 phiên", sharpe: 1.23,
      up_day_ratio_pct: 60, max_drawdown_pct: -12, annual_return_pct: 18, hmm_regime: "BULL",
      volatility_regime: "NORMAL", forecast_direction: "TĂNG", ensemble_return_pct: 6,
      agreement_pct: 75, gross_forecast_pct: 6, roundtrip_cost_pct: 0.6, net_forecast_pct: 5.4,
      mc_volatility_source: "recursive GARCH-t", lock_drawdown_pct: -4, probability_loss_gt_3pct: 8,
      data_quality_status: "PASS", data_quality_score: 95, data_quality_flags: [], liquidity_tier: "A",
      adv20_value_vnd: 10000000000, capacity_shares: 20000, gap_abs_p95_pct: 2.2,
      entry_vnd: 58000, stop_loss_vnd: 55000, take_profit_1_vnd: 62000, take_profit_2_vnd: 65000,
      trade_model_agreement_pct: 75, risk_pct_nav: null, commentary: "Nhận xét đầy đủ của phiên.\nTheo dõi vùng hỗ trợ." };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ run_id: "ready-run", group,
      items: group === "OVERALL" ? [enriched, item("HPG"), item("MBB"), item("SSI"), item("VNM")] : [item("BAD1")] }) });
  });
  await page.goto("/screener"); await page.getByRole("button", { name: "Kích hoạt kết quả" }).click();
  const best = page.getByRole("region", { name: "5 mã tốt nhất", exact: true });
  const row = best.locator("tbody tr").first();
  expect((await row.boundingBox())!.height).toBeLessThan(100);
  const key = (name: string) => row.locator(`[data-sheet-key="${name}"]`);
  await expect(key("gate_pass")).toHaveText("Chưa đạt");
  await expect(key("gate_reasons")).toContainText("Chưa đủ điều kiện thời điểm vào lệnh.");
  await expect(key("sector_correlation")).toHaveText("0,75");
  await expect(key("up_day_ratio_pct")).toHaveText("60%");
  await expect(key("net_forecast_pct")).toHaveText("5,4%");
  await expect(key("adv20_value_vnd")).toHaveText("10");
  await expect(key("entry_vnd")).toHaveText("58.000");
  await expect(key("mc_volatility_source")).toHaveText("recursive GARCH-t");
  await expect(key("risk_pct_nav")).toHaveText("—");
  // Basic screening eligibility/scores must never be reinterpreted as Quant data.
  await expect(best.locator("tbody tr").nth(1).locator('[data-sheet-key="gate_pass"]')).toHaveText("—");
  await expect(best.locator("tbody tr").nth(1).locator('[data-sheet-key="score"]')).toHaveText("—");
  await row.getByRole("link", { name: "Kích hoạt phân tích quant chi tiết FPT" }).focus();
  await expect(row.getByRole("link")).toHaveAttribute("href", "/analysis?symbol=FPT");
  const identityX = (await row.locator("th").boundingBox())!.x;
  await best.getByRole("button", { name: "Win Rate (%)" }).click();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("Không phải tỷ lệ lệnh thắng");
  await expect(tooltip.locator(".katex-error")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await best.getByRole("button", { name: "07 Kế hoạch giao dịch" }).click();
  await expect.poll(async () => best.getByRole("region").evaluate(el => el.scrollLeft)).toBeGreaterThan(4000);
  // Wait for the horizontal smooth scroll before asking the page to scroll vertically.
  await expect.poll(async () => {
    const frame = (await best.getByRole("region").boundingBox())!;
    const value = (await key("entry_vnd").boundingBox())!;
    return value.x >= frame.x && value.x + value.width <= frame.x + frame.width;
  }).toBeTruthy();
  await row.locator("th").scrollIntoViewIfNeeded();
  await expect(key("entry_vnd")).toBeInViewport();
  expect(Math.abs((await row.locator("th").boundingBox())!.x - identityX)).toBeLessThan(2);
  await best.getByRole("button", { name: "08 Nhận xét" }).click();
  await row.getByText("Đọc nhận xét", { exact: false }).click();
  await expect(row.locator("details[open]")).toContainText("Theo dõi vùng hỗ trợ.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await best.getByRole("button", { name: "01 Tổng quan" }).click();
  await expect.poll(async () => best.getByRole("region").evaluate(el => el.scrollLeft)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("screening-sheet.png"), fullPage: true });
  expect(state.mutations).toEqual([]);
  expect(state.calls.some(path => path.startsWith("analyses"))).toBeFalsy();
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


test("Screening: bảng dữ liệu hiện có giữ giá và điểm nguồn khi chưa có Quant", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/screener");
  await page.getByRole("button", { name: "Kích hoạt kết quả" }).click();
  const best = page.getByRole("region", { name: "5 mã tốt nhất", exact: true });
  await expect(best.getByRole("status")).toContainText("chưa có các chỉ số Quant");
  await best.getByRole("button", { name: "Dữ liệu quét hiện có", exact: true }).click();
  const row = best.locator("tbody tr").first();
  await expect(row.locator("td").nth(1)).toHaveText("58.000");
  await expect(row.locator("td").nth(2)).toHaveText("2%");
  await expect(row.locator("td").nth(5)).toHaveText("71,4");
  await best.getByRole("button", { name: "Theo mẫu Google Sheet · 42 cột", exact: true }).click();
  await expect(best.locator("thead th")).toHaveCount(42);
  await expect(best.locator('[data-sheet-column="score"]').first()).toHaveText("—");
  expect(state.calls.some(path => path.startsWith("analyses"))).toBeFalsy();
  expect(state.mutations).toEqual([]);
});

test("Watchlist: giữ đúng các nhóm và vị trí mã của file tham chiếu", async ({ page }, testInfo) => {
  const state = await fixture(page);
  await page.goto("/screener");
  await page.getByRole("button", { name: "Watchlist theo ngành", exact: true }).click();
  const table = page.getByRole("region", { name: "Watchlist theo ngành", exact: true });
  await expect(table.locator("thead th")).toHaveCount(24); // 23 source groups + row number.
  await expect(table.locator("thead th").nth(1)).toHaveText("Ngân hàng (BANK)");
  await expect(table.locator("tbody tr").first().locator("td").nth(0)).toHaveText("LPB");
  await expect(table.locator("tbody tr").first().locator("td").nth(1)).toHaveText("DPG");
  await expect(table.getByRole("link", { name: "LPB", exact: true })).toHaveAttribute("href", "/analysis?symbol=LPB");
  expect(state.calls.filter(path => path.startsWith("screenings/") || path.startsWith("analyses"))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath("industry-watchlist.png"), fullPage: true });
});
