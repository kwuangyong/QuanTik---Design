import { test, expect, type Page } from "@playwright/test";
import { analysisFixture } from "./fixtures/analysis";

// Build-time flag: run with a build made with NEXT_PUBLIC_QUANT_READER_V2=1 to exercise V2; the default build must keep the legacy reader.
const v2 = /^(1|true|on)$/i.test(process.env.NEXT_PUBLIC_QUANT_READER_V2 ?? "");

async function openReport(page: Page) {
  const state = await analysisFixture(page);
  state.status = "SUCCEEDED";
  state.jobs.push({ id: "job-1", symbol: "FPT", target_session: "2026-10-16", status: "SUCCEEDED", created_at: 1792224000, deadline: 1792310400, attempt: 1, report_id: "report-1", reason: null, quota_effect: "CONSUMED" });
  state.report.sections.simulation_risk.metrics = { simulation_risk: { lock_risk: { max_dd_lock_pct: -4, prob_loss_gt_3pct: 8, lock_sessions: 2 } } };
  state.report.sections.data_quality.metrics = { data_quality: { status: "PASS", score: 95 } };
  state.report.sections.agreement.metrics = { fcast: { ensemble_ret_pct: 4.1, agreement_pct: 75, coverage_pct: 80, horizon: 3 } };
  state.report.sections.decision.metrics = { rec: { score: 72 }, action: { action: "WATCH", executable: false, gate_pass: false } };
  await page.goto("/analysis?symbol=FPT&job=job-1");
  return state;
}

test(v2 ? "Quant V2: lớp Tóm tắt, chuyển lớp, nhớ lựa chọn và tooltip thuật ngữ" : "Quant V2 tắt: giữ nguyên báo cáo cũ", async ({ page }) => {
  await openReport(page);
  const action = page.getByRole("region", { name: "Hành động thực thi", exact: true });
  if (!v2) {
    await expect(action).toBeVisible();
    await expect(page.locator("[data-quant-glance]")).toHaveCount(0);
    await expect(page.locator("[data-quant-levels]")).toHaveCount(0);
    return;
  }
  const glance = page.locator("[data-quant-glance]");
  await expect(glance).toBeVisible();
  await expect(glance.getByRole("heading", { name: "Mô hình: theo dõi" })).toBeVisible();
  await expect(glance.locator("[data-glance-risk]")).toContainText("khoảng 8 trong mỗi 100 lần (từ 1.000 lần mô phỏng) lỗ hơn 3% khi chờ cổ phiếu về");
  await expect(glance.locator("[data-glance-risk]")).toContainText("[chờ Haiku xác minh]");
  await expect(glance.locator('dl[aria-label="Các số chính"] [data-glance-number]')).toHaveCount(3);
  await expect(glance.locator('[data-glance-number="score"] dd')).toHaveText("72/100");
  await expect(glance.locator('[data-trust="coverage"]')).toContainText("80%");
  await expect(glance.locator("[data-glance-group]")).toHaveText([/Rủi ro/, /Hiện trạng/, /Triển vọng/, /Mua bán/]);
  await expect(glance).not.toContainText(/tín hiệu/i);
  await expect(action).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const term = glance.getByRole("button", { name: "Điểm Quant", exact: true });
  await term.click();
  await expect(page.getByRole("tooltip")).toContainText("Không phải xác suất lãi");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);

  await page.getByRole("button", { name: "Hiểu vì sao", exact: true }).click();
  await expect(page.locator("[data-quant-why-placeholder]")).toBeVisible();
  await page.getByRole("button", { name: "Chuyên sâu", exact: true }).click();
  await expect(action).toBeVisible();
  await expect(page.locator("details[data-quant-module]")).toHaveCount(16);
  await page.reload();
  await expect(page.getByRole("button", { name: "Chuyên sâu", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(action).toBeVisible();
  await page.getByRole("button", { name: "Tóm tắt", exact: true }).click();
  await expect(glance).toBeVisible();
  await glance.getByRole("button", { name: "Xem kế hoạch có điều kiện" }).click();
  await expect(action).toBeVisible();
});
