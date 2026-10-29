import type { AnalysisReport } from "../../src/lib/api/analysis";
import { reportFixture } from "./analysis";

// Synthetic presentation data only. No production route imports this module;
// failed/missing production output must never fall back to this fixture.
export type QuantSampleCase = "complete" | "partial" | "unavailable" | "disabled" | "failed";
export const quantSampleCases: QuantSampleCase[] = ["complete", "partial", "unavailable", "disabled", "failed"];
export function completeQuantReport(): AnalysisReport {
  const report = reportFixture();
report.research!.factors = [
  { id: "sharpe", label: "Sharpe", value: .6, min: -1, max: 1 },
  { id: "forecast_ret", label: "Dự báo sau phí", value: .55, min: -1, max: 1 },
  { id: "forecast_conf", label: "Độ tin cậy dự báo", value: .3, min: -1, max: 1 },
  { id: "cmf", label: "Dòng tiền", value: .3, min: -1, max: 1 },
  { id: "trend_quality", label: "Chất lượng xu hướng", value: .42, min: -1, max: 1 },
  { id: "alpha_composite", label: "Alpha tổng hợp", value: .25, min: -1, max: 1 },
  { id: "hmm_regime", label: "Trạng thái HMM", value: .67, min: -1, max: 1 },
  { id: "lock_safety", label: "An toàn T+2", value: .7, min: -1, max: 1 },
  { id: "vol_regime", label: "Trạng thái biến động", value: -.2, min: -1, max: 1 },
  { id: "distribution_quality", label: "Chất lượng phân phối", value: -.5, min: -1, max: 1 },
  { id: "liquidity", label: "Thanh khoản", value: .8, min: -1, max: 1 },
  { id: "data_quality", label: "Chất lượng dữ liệu", value: .9, min: -1, max: 1 },
];
report.commentary = { summary: "Bản xem thử giao diện bằng dữ liệu mẫu. Tín hiệu đang theo dõi và chưa đủ điều kiện thực thi.", detailed: "Lợi suất lịch sử cần được đối chiếu với mức sụt giảm. Bối cảnh pha tăng của ví dụ này không ghi đè điều kiện thời điểm còn thiếu. Theo dõi mức dự báo sau chi phí và các rủi ro trong thời gian chờ thanh toán." };
report.sections.statistics.metrics.stats = { ann_return_pct: 24.5, sharpe: 1.2, sortino: 1.7, max_dd_pct: -12, ann_vol_pct: 25 };
report.sections.distribution.metrics = { dist: { verdict: { is_gaussian: false }, skewness: -.49, excess_kurtosis: 2.44 } };
report.sections.agreement.metrics = { fcast: { horizon: 10, ensemble_ret_pct: 4.1, agreement_pct: 75, coverage_pct: 80, support_pct: 65 } };
report.sections.costs.metrics = { costs: { gross_forecast_pct: 4.1, roundtrip_cost_pct: .6, net_forecast_pct: 3.5 } };
report.sections.garch.metrics = { garch: { garch: { current_vol_pct: 2, alpha: .09, beta: .87, persistence: .96, half_life: 17, forecast_vol: [2,2.05,2.1], simulation_params: { omega_pct2: .1, alpha: .09, beta: .87 } }, egarch: { gamma: -.12 } } };
report.sections.hmm.metrics = { hmm: { current: "BULL", method: "multivariate_hmm", prob_pct: 67, state_probs: { BULL: 67, SIDEWAY: 24, BEAR: 9 } } };
report.sections.technical.metrics = { flow: { cmf: .21 }, trend: { er: .58, r2: .72 }, alpha: { cross_sectional: { rs_20d_pct: 4.2 } } };
report.sections.context.metrics = { sector: { name: "Công nghệ", trend: { trend_label: "Tăng", ret_20D_pct: 3.1 } }, cross_corr: { avg_pairwise_corr: .64 } };
report.sections.directional_alpha.metrics = { momentum_alpha: { score: .4, active: true, components: { ret_5d_pct: 1, ret_10d_pct: 2, ret_20d_pct: 3, ret_60d_pct: 4 } }, hurst: { hurst: .61, regime: "PERSISTENT", confidence: .75, windows: [{ window: 64, hurst: .61 }] }, lightgbm_cross_sectional: { available: true, active: true, proj_pct: 2, rank_pct: 80, predicted_alpha_pct: 1 }, conditional_mr: { active: false, reason: "regime_or_extreme_not_confirmed" } };
report.sections.trade_plan.metrics = { sl: { entry: 100000, sl_swing: 97000, tp1: 105000, tp2: 110000, rr2: 3.33, rr_net_cost: 1.92, lock_risk_flag: false }, pos: { shares: 1000, pct_acct: 33.33, risk_pct_nav: 1 }, sizing_mode: "REFERENCE", kelly: { disabled: true } };
report.sections.simulation_risk.metrics = { simulation_risk: { horizon: 10, mc: { vol_source: "GARCH-t", prob_up: 62 }, lock_risk: { max_dd_lock_pct: -4, prob_loss_gt_3pct: 8, lock_sessions: 2 } } };
report.sections.liquidity.metrics = { liquidity: { pass: true, adv20_value_vnd: 120000000000, value_ratio_5_20: 1.2, capacity_shares: 20000 } };
report.sections.data_quality.metrics = { data_quality: { status: "PASS", score: 95 } };
report.sections.decision.metrics = { rec: { score: 72 }, action: { action: "WATCH", executable: false, gate_pass: false } };

  // Keep the historical price/date series required by the historical histogram.
  Object.assign(report.sections.statistics.metrics, {
    n: 252,
    _price_close: [100000, 101000, 99500, 102000, 100500, 103000, 102000],
    _price_dates: ["2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"],
  });
  report.sections.arima = { status: "AVAILABLE", reason_codes: [], units: { price: "VND" }, metrics: {
    arima: { best: { order: [1, 0, 1], aic: 412.6, bic: 423.1 },
      stationarity: { adf_p: .012, stationary: true },
      forecast: { prices: [102200, 102450, 102600] } },
  } };
  Object.assign(report.sections.technical.metrics.trend as object, { slope_pct: .18 });
  Object.assign((report.sections.technical.metrics.alpha as { cross_sectional: object }).cross_sectional, { beta: 1.05 });
  Object.assign(report.sections.trade_plan.metrics.pos as object, { value: 100000000, max_loss: 3000000 });
  report.sections.trade_plan.metrics.kelly = { available: true, full_pct: 12, half_pct: 6 };
  report.sections.directional_alpha.metrics.lightgbm_cross_sectional = {
    available: true, active: true, proj_pct: 2, rank_pct: 80, predicted_alpha_pct: 1,
    horizon_sessions: 3, as_of: "2026-10-16",
  };
  // Forecast paths and all published horizon labels describe the same three sessions.
  (report.sections.agreement.metrics.fcast as Record<string, unknown>).horizon = 3;
  (report.sections.simulation_risk.metrics.simulation_risk as Record<string, unknown>).horizon = 3;
  report.sections.commentary.metrics = {};
  return report;
}

export function quantReportSample(scenario: QuantSampleCase = "complete"): AnalysisReport {
  const report = completeQuantReport();
  if (scenario === "partial") {
    delete (report.sections.arima.metrics.arima as Record<string, unknown>).forecast;
    delete (report.sections.garch.metrics.garch as Record<string, unknown>).egarch;
    delete report.sections.trade_plan.metrics.kelly;
    delete (report.sections.statistics.metrics.stats as Record<string, unknown>).sortino;
    report.research!.factors = report.research!.factors.filter(p => !["forecast_conf", "liquidity"].includes(p.id));
  } else if (scenario !== "complete") {
    // Retain deliberately stale numbers: guards must reject them, rather than
    // hiding a bug by removing all the old values from these test cases.
    for (const section of Object.values(report.sections)) {
      if (scenario === "failed") {
        section.metrics = Object.fromEntries(Object.entries(section.metrics).map(([key, value]) => [key,
          value && typeof value === "object" && !Array.isArray(value) ? { ...value, error: "fixture_fit_failed" } : value,
        ]));
      } else section.status = scenario === "disabled" ? "DISABLED" : "UNAVAILABLE";
      section.reason_codes = ["COMPONENT_UNAVAILABLE"];
    }
    if (scenario === "failed") delete report.sections.statistics.metrics.n;
    report.research!.factors = [];
  }
  return report;
}
