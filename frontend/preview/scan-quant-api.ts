// Only imported by the standalone preview and tests. Never a live API fallback.
import type { AnalysisJob, AnalysisReport } from "../src/lib/api/analysis";
import type { ScreeningItem } from "../src/lib/api/screening";
import { quantReportSample, type QuantSampleCase } from "../tests/fixtures/quant-report-sample";

export const sampleStocks = [
  ["FPT", "Công ty Cổ phần FPT", "Công nghệ"], ["HPG", "Hòa Phát", "Thép"],
  ["MBB", "MB", "Ngân hàng"], ["SSI", "Chứng khoán SSI", "Chứng khoán"],
  ["VNM", "Vinamilk", "Thực phẩm"], ["NVL", "Novaland", "Bất động sản"],
  ["PDR", "Phát Đạt", "Bất động sản"], ["DIG", "DIC Corp", "Bất động sản"],
  ["VIX", "Chứng khoán VIX", "Chứng khoán"], ["DXG", "Đất Xanh", "Bất động sản"],
] as const;
export type PreviewCase = QuantSampleCase | "core" | "basic" | "waiting" | "network";

export function sampleReport(symbol: string, scenario: QuantSampleCase = "complete"): AnalysisReport {
  const report = quantReportSample(scenario);
  report.symbol = symbol;
  report.research!.symbol = symbol;
  const stock = sampleStocks.find(stock => stock[0] === symbol);
  const context = report.sections.context.metrics.sector as Record<string, unknown>;
  context.name = stock?.[2] || "Chưa phân ngành";
  // All symbols deliberately share the same numerical example. These are not
  // predictions or independent model outputs for the real companies.
  report.commentary.summary = `${symbol} · Ví dụ số liệu tổng hợp, dùng chung bộ số để thử giao diện. Theo dõi, chưa đủ điều kiện thực thi.`;
  return report;
}

export function sampleScreeningItem(symbol: string, index: number, enriched: boolean): ScreeningItem {
  const score = (met: number) => ({ score: met / 7 * 100, met_count: met, total_count: 7, unavailable_count: 0 });
  const stock = sampleStocks.find(stock => stock[0] === symbol);
  const base: ScreeningItem = {
    symbol, exchange: "HOSE", name: stock?.[1], price_vnd: 100000,
    change_ratio: index < 5 ? .02 : -.03, change_5d_ratio: .01, change_20d_ratio: .04,
    volume_shares: 400000, average_volume_20_shares: 200000, volume_ratio_20: 2, price_to_high20_ratio: .98,
    groups: { STRONG: score(index < 5 ? 6 : 2), ACCUMULATION: score(4), DISTRIBUTION: score(index < 5 ? 1 : 6) },
    eligible: true, status: "ELIGIBLE",
  };
  if (!enriched) return base;
  return { ...base, action: "WATCH", gate_pass: false, gate_reasons: ["TIMING_NOT_READY"], score: 72,
    rating: "THEO DÕI", holding_sessions: 3, index_trend: "NEUTRAL", sector: stock?.[2],
    sector_trend: "Tăng", sector_return_20d_pct: 3.1, sector_correlation: .64,
    sector_lead_lag: "Chưa xác nhận dẫn dắt", sharpe: 1.2, up_day_ratio_pct: 60,
    max_drawdown_pct: -12, annual_return_pct: 24.5, hmm_regime: "BULL", volatility_regime: "NORMAL",
    forecast_direction: "TĂNG", ensemble_return_pct: 4.1, agreement_pct: 75,
    gross_forecast_pct: 4.1, roundtrip_cost_pct: .6, net_forecast_pct: 3.5,
    mc_volatility_source: "GARCH-t", lock_drawdown_pct: -4, probability_loss_gt_3pct: 8,
    data_quality_status: "PASS", data_quality_score: 95, data_quality_flags: [], liquidity_tier: "A",
    adv20_value_vnd: 120000000000, capacity_shares: 20000, gap_abs_p95_pct: 2.2,
    entry_vnd: 100000, stop_loss_vnd: 97000, take_profit_1_vnd: 105000, take_profit_2_vnd: 110000,
    trade_model_agreement_pct: 75, risk_pct_nav: 1,
    commentary: "Ví dụ tổng hợp để kiểm tra 42 cột. Nhóm screening không đồng nghĩa hành động mua/bán Quant.",
  };
}

export function createPreviewApi() {
  let scenario: PreviewCase = "core";
  const jobs: AnalysisJob[] = [], keys = new Map<string, AnalysisJob>();
  const calls: { path: string; method: string }[] = [];
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  const itemFor = (symbol: string, index: number) => {
    const item = sampleScreeningItem(symbol, index, scenario === "complete" || scenario === "core");
    if (scenario === "core") { item.sector_correlation = null; item.sector_lead_lag = null; }
    return item;
  };
  const fetcher: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request?.url || String(input), "https://preview.invalid");
    const path = url.pathname.replace(/^\/api\/v1\//, ""), method = init?.method || request?.method || "GET";
    calls.push({ path, method });
    if (!url.pathname.startsWith("/api/v1/")) return json({ code: "PREVIEW_NETWORK_BLOCKED" }, 404);
    if (path === "auth/refresh") return json({ access_token: "synthetic-preview-only", expires_in: 3600 });
    if (path === "me") return json({ id: "synthetic-preview", role: "user", display_name: "Tài khoản mẫu", email: "preview@example.test" });
    if (path === "me/entitlements") return json({ active: true, remaining: 100-jobs.length, daily_limit: 100, active_jobs: 0, active_limit: 2, daily_reset_at: 1792256400 });
    if (path === "screenings/latest") {
      if (scenario === "waiting") return json({ code: "SCREENING_NOT_READY" }, 503);
      if (scenario === "network") return json({ code: "BACKEND_UNAVAILABLE" }, 502);
      return json({ id: "sample-run", target_session: "2026-10-16", published_at: 1792123200, stale: false, refresh_after_seconds: 60 });
    }
    if (path === "screenings/sample-run/results") {
      const group = url.searchParams.get("group");
      const items = sampleStocks.map(([symbol], index) => itemFor(symbol, index));
      return json({ run_id: "sample-run", group, items: group === "OVERALL" ? items.slice(0,5) : items.slice(5) });
    }
    if (path.startsWith("screenings/sample-run/symbols/")) {
      const symbol = path.split("/").at(-1)!;
      const index = sampleStocks.findIndex(stock => stock[0] === symbol);
      if (index < 0) return json({ code: "NOT_FOUND" }, 404);
      return json({ run_id: "sample-run", target_session: "2026-10-16", published_at: 1792123200,
        input_mode: "COMPLETED_DAILY", observed_at: "2026-10-16T09:00:00Z", item: itemFor(symbol, index),
        assessment: { overall_signal: "Theo dõi", adjusted_signal: "Chọn lọc", money_flow: "Tích cực", trend: "Tăng", strength: "Mạnh", investor_note: "Ghi chú mẫu: theo dõi vùng hỗ trợ.", broker_note: "Dữ liệu tổng hợp để thử popup." },
        market: { last_close: 1600, regime_label: "SIDEWAY", combined_score: 55, risk_label: "Trung bình", change_5d_ratio: .01, change_20d_ratio: -.02, above_ma20: true, atr_pct: 1.4, investor_strategy: "Ví dụ: chọn lọc cơ hội.", broker_strategy: "Ví dụ: theo dõi thanh khoản." } });
    }
    if (path === "analyses/options") return json({ sessions: ["2026-10-16"], selected_session: "2026-10-16", symbols: sampleStocks.map(stock => stock[0]), ready: true, reason: null });
    if (path === "analyses" && method === "POST") {
      const body = JSON.parse(String(init?.body || "{}")), key = new Headers(init?.headers).get("Idempotency-Key") || "";
      if (!sampleStocks.some(stock => stock[0] === body.symbol)) return json({ code: "INVALID_REQUEST" }, 400);
      if (!keys.has(key)) {
        const job: AnalysisJob = { id: `sample-job-${jobs.length+1}`, symbol: body.symbol, target_session: "2026-10-16", status: "QUEUED", created_at: Math.floor(Date.now()/1000), deadline: Math.floor(Date.now()/1000)+60, attempt: 0, report_id: null, reason: null, quota_effect: "RESERVED" };
        jobs.unshift(job); keys.set(key, job);
      }
      return json(keys.get(key), 202);
    }
    if (path === "analyses") return json({ items: jobs.filter(job => !url.searchParams.get("symbol") || job.symbol === url.searchParams.get("symbol")), next_cursor: null });
    if (path.startsWith("analyses/")) {
      const job = jobs.find(job => job.id === path.split("/")[1]);
      if (!job) return json({ code: "NOT_FOUND" }, 404);
      const elapsed = Date.now()/1000-job.created_at;
      job.status = elapsed >= 2 ? "SUCCEEDED" : "RUNNING";
      job.attempt = 1; job.report_id = job.status === "SUCCEEDED" ? `sample-report-${job.id}` : null;
      job.quota_effect = job.status === "SUCCEEDED" ? "CONSUMED" : "RESERVED";
      return json(job);
    }
    if (path.startsWith("reports/")) {
      const job = jobs.find(job => `sample-report-${job.id}` === path.split("/")[1]);
      if (!job || job.status !== "SUCCEEDED") return json({ code: "NOT_FOUND" }, 404);
      const report = sampleReport(job.symbol, ["core", "basic", "waiting", "network"].includes(scenario) ? "complete" : scenario as QuantSampleCase);
      if (scenario === "core") {
        // Engine-shaped example after auditing quant.py. Values stay synthetic;
        // these states are intentionally missing/disabled, not UI failures.
        report.sections.trade_plan.metrics.kelly = { disabled: true, note: "Không tính Kelly từ tỷ lệ ngày tăng/giảm." };
        report.sections.context.metrics.cross_corr = { error: "Chỉ có 1 mã trong ngành — không tính được tương quan", avg_pairwise_corr: null };
        report.sections.directional_alpha.metrics.lightgbm_cross_sectional = { available: false, active: false, reason: "requires_batch_cross_section" };
        (report.sections.arima.metrics.arima as { best: { order: unknown } }).best.order = "ARIMA(1, 0, 1)";
      }
      report.job_id = job.id; report.report_id = job.report_id!;
      return json(report);
    }
    return json({ code: "PREVIEW_UNSUPPORTED" }, 404);
  };
  return { fetch: fetcher, calls, jobs, setCase(value: PreviewCase) { scenario = value; } };
}
