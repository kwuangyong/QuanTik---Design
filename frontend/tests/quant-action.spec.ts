import { test, expect, type Page } from "@playwright/test";
import { analysisFixture } from "./fixtures/analysis";

async function actionReport(page: Page) {
  const state = await analysisFixture(page);
  state.status = "SUCCEEDED";
  state.jobs.push({ id: "job-1", symbol: "FPT", target_session: "2026-10-16", status: "SUCCEEDED", created_at: 1792224000, deadline: 1792310400, attempt: 1, report_id: "report-1", reason: null, quota_effect: "CONSUMED" });
  state.report.sections.agreement.metrics = { fcast: { ensemble_ret_pct: 4.1, agreement_pct: 75, horizon: 10 } };
  state.report.sections.costs.metrics = { costs: { gross_forecast_pct: 4.1, roundtrip_cost_pct: 0.6, net_forecast_pct: 3.5 } };
  state.report.sections.trade_plan.metrics = {
    sl: { entry: 100000, sl_swing: 97000, tp1: 105000, tp2: 110000, rr2: 3.33, rr_net_cost: 1.92, lock_risk_flag: false },
    pos: { shares: 1000, pct_acct: 33.33, risk_pct_nav: 1 }, sizing_mode: "REFERENCE",
    kelly: { disabled: true, full_pct: 25, half_pct: 12.5 },
  };
  state.report.sections.simulation_risk.metrics = { simulation_risk: { lock_risk: { max_dd_lock_pct: -4, prob_loss_gt_3pct: 8, lock_sessions: 2 } } };
  state.report.sections.data_quality.metrics = { data_quality: { status: "PASS", score: 95 } };
  state.report.sections.liquidity.metrics = { liquidity: { pass: true } };
  const open = () => page.goto("/analysis?symbol=FPT&job=job-1");
  const card = page.getByRole("region", { name: "Hành động thực thi", exact: true });
  const value = (id: string) => card.locator(`[data-action-metric="${id}"] dd`);
  return { state, open, card, value };
}

test("Quant action: ưu tiên kế hoạch, giữ nguyên quyết định và Kelly đang tắt", async ({ page }) => {
  const { state, open, card, value } = await actionReport(page);
  await open();
  await expect(card).toBeVisible();
  await expect(page.locator(".quant-report > :first-child")).toHaveAttribute("aria-label", "Hành động thực thi");
  await expect(card.getByRole("heading", { name: "HÀNH ĐỘNG · Theo dõi", exact: true })).toBeVisible();
  await expect(card.getByText("Chưa đủ điều kiện thời điểm vào lệnh.", { exact: true })).toBeVisible();
  for (const [id, text] of Object.entries({ entry: "100.000", sl: "97.000", tp1: "105.000", tp2: "110.000", forecast: "4,1%", "forecast-net": "3,5%", agreement: "75%", "rr-net": "1,92x", "risk-nav": "1%", "lock-drawdown": "-4%", "lock-loss": "8%", shares: "1.000", allocation: "33,33%", "kelly-full": "—", "kelly-half": "—" })) {
    await expect(value(id)).toHaveText(text);
  }
  await expect(card.getByText("Kelly đang tắt", { exact: true })).toBeVisible();
  expect(state.created).toBe(0);
  expect(state.unknown).toEqual([]);
});

test("Quant action: mọi chỉ số có popup, công thức và thao tác đóng bằng chuột hoặc bàn phím", async ({ page }) => {
  const { open, card } = await actionReport(page);
  await open();
  await expect(card).toBeVisible();
  const metrics = card.locator("[data-action-metric] dt");
  await expect(metrics).toHaveCount(20);
  for (const metric of await metrics.all()) await expect(metric.getByRole("button")).toHaveCount(1);
  const triggers = card.locator(".term-trigger");
  for (const trigger of await triggers.all()) {
    await trigger.click();
    const popup = page.getByRole("tooltip");
    await expect(popup).toBeVisible();
    await expect(popup.getByRole("heading")).toHaveCount(5);
    await expect(popup.locator(".katex")).toHaveCount(1);
    await expect(popup.locator(".katex-error")).toHaveCount(0);
    const bounds = await popup.boundingBox();
    const viewport = page.viewportSize()!;
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
  }
  const loss = card.getByRole("button", { name: "P(lỗ trên 3% trong T+2)", exact: true });
  await loss.click();
  await expect(page.getByRole("tooltip")).toContainText("không tự động là lỗ 3% NAV");
  await page.getByRole("tooltip").getByRole("button", {name:"Đóng giải thích thuật ngữ", exact:true}).click();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  const kelly = card.getByRole("button", { name: "Kelly Criterion", exact: true });
  await kelly.focus();
  await expect(page.getByRole("tooltip")).toContainText("không phải % đồng thuận mô hình");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
});

test("Quant action: thiếu một phần không lấp mẫu, số 0 khác dữ liệu thiếu", async ({ page }) => {
  const { state, open, card, value } = await actionReport(page);
  state.report.sections.trade_plan.status = "AVAILABLE";
  state.report.sections.trade_plan.metrics = { sl: { entry: 100000, sl_swing: 97000, tp1: 105000, tp2: 110000 }, pos: { shares: 0, pct_acct: 0, risk_pct_nav: 0 }, sizing_mode: "REFERENCE" };
  state.report.sections.agreement.status = "DISABLED";
  state.report.sections.simulation_risk.metrics = { simulation_risk: { error: "not available", lock_risk: { prob_loss_gt_3pct: 80 } } };
  state.report.sections.costs.metrics = { costs: { net_forecast_pct: 0 } };
  await open();
  await expect(card).toBeVisible();
  await expect(value("entry")).toHaveText("100.000");
  await expect(value("forecast")).toHaveText("—");
  await expect(value("forecast-net")).toHaveText("0%");
  await expect(value("shares")).toHaveText("0");
  await expect(value("risk-nav")).toHaveText("0%");
  await expect(value("lock-loss")).toHaveText("—");
  await expect(value("rr-net")).toHaveText("—");
  await expect(card.getByText("Chưa có dữ liệu Kelly", { exact: true })).toBeVisible();
  expect(state.created).toBe(0);
});

test("Quant action: chỉ đọc Kelly đã công bố, cờ tương thích DISABLED được ưu tiên", async ({ page }) => {
  const { state, open, card, value } = await actionReport(page);
  state.report.sections.trade_plan.metrics.kelly = { full_pct: 25, half_pct: 12.5 };
  await open();
  await expect(value("kelly-full")).toHaveText("25%");
  await expect(value("kelly-half")).toHaveText("12,5%");
  state.report.sections.commentary.metrics = { compatibility: { kelly: "DISABLED" } };
  await page.reload();
  await expect(card.getByText("Kelly đang tắt", { exact: true })).toBeVisible();
  await expect(value("kelly-full")).toHaveText("—");
  await expect(value("kelly-half")).toHaveText("—");
});
