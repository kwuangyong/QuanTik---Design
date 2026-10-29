import type { Page } from "@playwright/test";
import type { AnalysisReport, AnalysisJob } from "../../src/lib/api/analysis";

export function reportFixture(): AnalysisReport {
  const names = ["data_quality", "liquidity", "distribution", "statistics", "arima", "garch", "hmm", "technical", "context", "directional_alpha", "agreement", "simulation_risk", "costs", "trade_plan", "decision", "commentary"];
  const report: AnalysisReport = { report_id: "report-1", schema_version: "1.0", job_id: "job-1", symbol: "FPT", target_session: "2026-10-16",
    evaluated_at: "2026-10-17T08:00:00Z", data_as_of: "2026-10-16T00:00:00Z", data_observed_at: "2026-10-17T07:00:00Z", input_mode: "COMPLETED_DAILY",
    versions: { data_manifest: "fixture-manifest", model: "fixture-model" }, decision: { action: "WATCH", executable: false, reason_codes: ["TIMING_NOT_READY"] },
    commentary: { summary: "Báo cáo kiểm thử theo hợp đồng API.", detailed: "Nhận định chi tiết lấy từ báo cáo." }, warnings: [],
    sections: Object.fromEntries(names.map(name => [name, { status: "AVAILABLE", reason_codes: [], units: { price: "VND" }, metrics: { status: "PASS" } }])) };
  report.sections.statistics.metrics = { stats: { sharpe: 1.2, max_dd_pct: -12, ann_vol_pct: 25 }, _price_close: [100000, 101000, 102000], _price_dates: ["2026-10-14", "2026-10-15", "2026-10-16"] };
  report.sections.costs.metrics = { costs: { net_forecast_pct: 2.5 } };
  report.sections.hmm.metrics = { hmm: { current: "BULL", method: "hmm", state_probs: { BULL: 70, SIDEWAY: 20, BEAR: 10 } } };
  report.sections.trade_plan.metrics = { sl: { entry: 100000, sl_swing: 97000, tp1: 105000, tp2: 110000 }, sizing_mode: "REFERENCE" };
  report.sections.simulation_risk.metrics = { simulation_risk: { mc_path: { median: [102000, 103000, 104000], lower: [101000, 99000, 97000], upper: [103000, 107000, 111000] } } };
  report.sections.garch.metrics = { garch: { garch: { forecast_vol: [1.2, 1.3, 1.4] } } };
  report.research = { schema_version: 1, symbol: "FPT", units: { price: "VND", return: "pct" }, observations: 252,
    start: "2025-10-30", end: "2026-10-16", horizon_sessions: 3, simulation_count: 1000,
    cone: [1, 2, 3].map(session => ({ session, p05: 100000-session*1000, p25: 101000-session*500, p50: 102000+session*1000, p75: 103000+session*1500, p95: 104000+session*2000 })),
    distribution: [{ returnPct: -3, lowerPct: -5, upperPct: -1, probabilityPct: 20 }, { returnPct: 1, lowerPct: -1, upperPct: 3, probabilityPct: 50 }, { returnPct: 5, lowerPct: 3, upperPct: 7, probabilityPct: 30 }],
    regime: [{ date: "2026-10-14", price: 100000, state: "BEAR" }, { date: "2026-10-15", price: 101000, state: "SIDEWAY" }, { date: "2026-10-16", price: 102000, state: "BULL" }],
    drawdown: [{ date: "2026-10-14", valuePct: -3 }, { date: "2026-10-15", valuePct: -2 }, { date: "2026-10-16", valuePct: -1 }],
    factors: [{ id: "cmf", label: "cmf", value: .3, min: -1, max: 1 }, { id: "sharpe", label: "sharpe", value: .6, min: -1, max: 1 }, { id: "hmm_regime", label: "hmm_regime", value: -.1, min: -1, max: 1 }],
    risk_metrics: [{ id: "var", label: "VaR95 mô phỏng", value: -4.5, unit: "%" }, { id: "cvar", label: "CVaR95 mô phỏng", value: -5.5, unit: "%" }] };
  report.sections.arima = { status: "UNAVAILABLE", reason_codes: ["COMPONENT_UNAVAILABLE"], metrics: { arima: null }, units: {} };
  return report;
}

export async function analysisFixture(page: Page) {
  const state = { user: true, active: true, limit: 20, created: 0, ready: true, reason: "UNIVERSE_NOT_VALIDATED", failSubmitOnce: false,
    status: "QUEUED" as AnalysisJob["status"], keys: [] as string[], payloads: [] as unknown[], jobs: [] as AnalysisJob[], denyReport: false, unknown: [] as string[], report: reportFixture() };
  const ids = new Map<string, AnalysisJob>();
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.slice(8), method = request.method();
    const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (path === "auth/refresh") return json(state.user ? { access_token: "analysis-fixture", expires_in: 900 } : { code: "UNAUTHENTICATED" }, state.user ? 200 : 401);
    if (path === "admin/auth/refresh") return json({ code: "UNAUTHENTICATED" }, 401);
    if (!state.user) return json({ code: "UNAUTHENTICATED" }, 401);
    if (path === "me") return json({ id: "analysis-customer", role: "user", display_name: "Khách kiểm thử", email: "analysis@example.test" });
    if (path === "me/entitlements") return json({ active: state.active, remaining: state.limit-state.created, active_jobs: state.jobs.filter(job => !["SUCCEEDED", "FAILED"].includes(state.status)).length, active_limit: 2, daily_limit: state.limit, daily_reset_at: 1792256400 });
    if (path === "analyses/options") return json({ sessions: ["2026-10-16", "2026-10-15"], selected_session: url.searchParams.get("target_session") || "2026-10-16", symbols: state.ready ? ["FPT", "HPG", "VNM"] : [], ready: state.ready, reason: state.ready ? null : state.reason });
    if (path === "analyses" && method === "POST") {
      const key = request.headers()["idempotency-key"], body = request.postDataJSON();
      state.keys.push(key); state.payloads.push(body);
      let job = ids.get(key);
      if (!job) {
        state.created++;
        job = { id: "job-"+state.created, symbol: body.symbol, target_session: body.target_session, status: state.status, reason: null, attempt: 0, created_at: 1792224000, deadline: 1792310400, report_id: null, quota_effect: "RESERVED" };
        state.jobs.unshift(job); ids.set(key, job);
      }
      if (state.failSubmitOnce && state.keys.length === 1) return json({ code: "BACKEND_UNAVAILABLE" }, 502);
      return json(job, 202);
    }
    if (path === "analyses") {
      const jobs = state.jobs.filter(job => !url.searchParams.get("symbol") || job.symbol === url.searchParams.get("symbol"));
      const start = url.searchParams.has("cursor") ? 20 : 0;
      return json({ items: jobs.slice(start, start+20).map(job => ({ ...job, status: state.status })), next_cursor: jobs.length > start+20 ? "older-page" : null });
    }
    if (path.startsWith("analyses/")) {
      const job = state.jobs.find(job => job.id === path.split("/")[1]);
      return json(job ? { ...job, status: state.status, attempt: state.status === "QUEUED" ? 0 : 1, report_id: state.status === "SUCCEEDED" ? "report-1" : null, reason: state.status === "WAITING_DATA" ? "SNAPSHOT_NOT_READY" : state.status === "FAILED" ? "DEPENDENCY_DEADLINE" : null } : { code: "NOT_FOUND" }, job ? 200 : 404);
    }
    if (path === "reports/report-1") return json(state.denyReport ? { code: "NOT_FOUND" } : state.report, state.denyReport ? 404 : 200);
    state.unknown.push(`${method} ${path}`); return json({ code: "UNHANDLED_FIXTURE" }, 500);
  });
  return state;
}
