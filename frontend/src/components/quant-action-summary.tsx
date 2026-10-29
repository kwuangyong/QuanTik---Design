"use client";
import { useId } from "react";
import type { AnalysisReport } from "@/lib/api/analysis";
import { analysisReason } from "@/lib/api/analysis";
import { stamp } from "@/lib/api/contracts";
import { actionNames, at, metricText, number, record } from "@/lib/quant-reader";
import TermHint from "./term-hint";
import { readableMetrics } from "@/lib/quant-presentation";

// Read published values only: do not derive a new decision, forecast or Kelly.
function metrics(report: AnalysisReport, section: string) {
  return readableMetrics(report.sections[section]);
}
function output(value: unknown) {
  const result = record(value);
  return result.error || result.available === false || result.disabled === true ? {} : result;
}
const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const price = (value: unknown) => numeric(value) != null && Number(value) > 0 ? number(value) : "—";
const percentage = (value: unknown) => number(value, "%");
const card = "min-w-0 rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6";

function Metric({ label, value, id, term }: { label: string; value: string; id: string; term: string }) {
  return <div className="min-w-0" data-action-metric={id}><dt className="text-[13px] leading-5 text-[var(--muted)]"><TermHint id={term}>{label}</TermHint></dt><dd className={`mt-2 break-words font-mono text-2xl leading-9 ${id === "sl" ? "text-[var(--negative)]" : id === "tp1" || id === "tp2" ? "text-[var(--positive)]" : id === "entry" ? "text-[var(--accent)]" : ""}`}>{value}</dd></div>;
}

export function QuantActionSummary({ report, compact, showAction }: { report: AnalysisReport; compact: boolean; showAction: boolean }) {
  const uid = useId();
  const trade = metrics(report, "trade_plan"), sl = output(trade.sl), pos = output(trade.pos);
  const forecast = output(metrics(report, "agreement").fcast), costs = output(metrics(report, "costs").costs);
  const simulation = output(metrics(report, "simulation_risk").simulation_risk), lock = output(simulation.lock_risk);
  const quality = output(metrics(report, "data_quality").data_quality), liquidity = output(metrics(report, "liquidity").liquidity);
  const kelly = record(trade.kelly);
  const kellyDisabled = report.sections.trade_plan?.status === "DISABLED" || kelly.disabled === true || at(report.commentary, "compatibility.kelly") === "DISABLED" || at(report.sections.commentary?.metrics, "compatibility.kelly") === "DISABLED";
  const kellyAvailable = !kellyDisabled && !kelly.error && kelly.available !== false && (numeric(kelly.full_pct) != null || numeric(kelly.half_pct) != null);
  const action = typeof report.decision.action === "string" ? report.decision.action : "";
  const executable = report.decision.executable;
  const reasons = Array.isArray(report.decision.reason_codes) ? report.decision.reason_codes.map(code => analysisReason(String(code))) : [];
  const horizon = numeric(forecast.horizon);
  const riskFlag = sl.lock_risk_flag;
  const sizing = trade.sizing_mode === "PERSONALIZED" ? "Theo vốn cá nhân" : trade.sizing_mode === "REFERENCE" ? "Theo vốn tham chiếu" : "Chưa có thông tin vốn";
  return <section aria-label={showAction ? "Hành động thực thi" : "Kế hoạch giao dịch"} className={card}>
    <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-medium">{showAction ? "Hành động thực thi" : "Kế hoạch giao dịch"}</h3><span className="text-[13px] text-[var(--muted)]">{report.symbol} · Phiên {report.target_session || report.data_as_of.slice(0, 10)}</span></div>
    <p className="mb-4 text-[13px] leading-6 text-[var(--muted)]">Di chuột hoặc chạm vào tên chỉ số để xem giải thích và công thức.</p>
    {showAction && <div aria-label="Hành động" className="mb-6 border-l-2 border-[var(--accent)] bg-[var(--raised)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-xl font-medium"><TermHint id="action_decision">HÀNH ĐỘNG</TermHint> · {actionNames[action] || action || "Chưa có quyết định"}</h4><span className="text-[13px] text-[var(--muted)]"><TermHint id="action_executable">{executable === true ? "Đủ điều kiện thực thi" : executable === false ? "Chưa đủ điều kiện thực thi" : "Chưa xác nhận thực thi"}</TermHint></span></div>
      {!!reasons.length && <ul aria-label="Điều kiện thực thi" className="mt-3 list-inside list-disc text-[13px] leading-7 text-[var(--muted)]">{reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
    </div>}
    <div className="grid min-w-0 gap-6">
      <dl aria-label="Entry, dừng lỗ và mục tiêu" className={`grid min-w-0 grid-cols-2 gap-x-4 gap-y-6 ${compact ? "" : "lg:grid-cols-4"}`}>
        {[["entry", "Entry", "entry", sl.entry], ["sl", "SL", "stop_loss", sl.sl_swing], ["tp1", "TP1", "take_profit", sl.tp1], ["tp2", "TP2", "take_profit", sl.tp2]].map(([id, label, term, value]) => <Metric key={String(id)} id={String(id)} label={`${label} (VND)`} term={String(term)} value={price(value)}/>)}
      </dl>
      <div className={`grid min-w-0 gap-6 border-t border-[var(--border)] pt-5 ${compact ? "" : "xl:grid-cols-3"}`}>
        <section className="min-w-0" aria-labelledby={`${uid}-forecast`}>
          <h4 id={`${uid}-forecast`} className="mb-4 text-base font-medium">Dự báo & chi phí</h4>
          <dl className="grid min-w-0 grid-cols-2 gap-4">
            <Metric id="forecast" label="Dự báo tổng hợp" term="action_forecast" value={percentage(forecast.ensemble_ret_pct)}/>
            <Metric id="horizon" label="Thời gian nắm giữ" term="action_horizon" value={horizon != null ? number(horizon, " phiên") : "—"}/>
            <Metric id="forecast-net" label="Dự báo sau chi phí" term="action_net" value={percentage(costs.net_forecast_pct)}/>
            <Metric id="agreement" label="Đồng thuận mô hình" term="action_agreement" value={percentage(forecast.agreement_pct)}/>
            <Metric id="forecast-gross" label="Dự báo gộp" term="action_gross" value={percentage(costs.gross_forecast_pct)}/>
            <Metric id="cost" label="Chi phí khứ hồi" term="action_cost" value={percentage(costs.roundtrip_cost_pct)}/>
          </dl>
        </section>
        <section className="min-w-0" aria-labelledby={`${uid}-risk`}>
          <h4 id={`${uid}-risk`} className="mb-4 text-base font-medium">Chất lượng rủi ro</h4>
          <dl className="grid min-w-0 grid-cols-2 gap-4">
            <Metric id="rr-net" label="R:R sau chi phí" term="action_rr_net" value={number(sl.rr_net_cost, "x")}/>
            <Metric id="risk-nav" label="Rủi ro / NAV" term="action_risk_nav" value={percentage(pos.risk_pct_nav)}/>
            <Metric id="rr-tp2" label="R:R TP2 (gộp)" term="action_rr_tp2" value={number(sl.rr2, "x")}/>
            <Metric id="lock-drawdown" label="Sụt giảm T+2" term="action_lock_drawdown" value={percentage(lock.max_dd_lock_pct)}/>
            <Metric id="lock-loss" label="P(lỗ trên 3% trong T+2)" term="action_lock_loss" value={percentage(lock.prob_loss_gt_3pct)}/>
            <Metric id="lock-sessions" label="Cửa sổ khóa thanh toán" term="action_lock_sessions" value={number(lock.lock_sessions, " phiên")}/>
          </dl>
          <p className={`mt-4 border-t border-[var(--border)] pt-3 text-[13px] leading-6 ${riskFlag === true ? "text-[var(--negative)]" : "text-[var(--muted)]"}`}><TermHint id="action_lock_flag">Cờ rủi ro T+2</TermHint>: {riskFlag === true ? "Có cảnh báo rủi ro trước khi cổ phiếu về tài khoản." : riskFlag === false ? "Báo cáo không bật cờ cảnh báo T+2; vẫn cần đối chiếu mức lỗ mô phỏng." : "Chưa có kết luận về cờ rủi ro T+2."}</p>
        </section>
        <section className="min-w-0" aria-labelledby={`${uid}-kelly`}>
          <h4 id={`${uid}-kelly`} className="mb-4 text-base font-medium"><TermHint id="action_kelly">Kelly Criterion</TermHint> & quy mô vốn</h4>
          <p data-action-metric="kelly-status" className="mb-3 text-[13px] text-[var(--muted)]">{kellyDisabled ? "Kelly đang tắt" : kellyAvailable ? "Kelly do báo cáo công bố" : "Chưa có dữ liệu Kelly"}</p>
          <dl className="grid min-w-0 grid-cols-2 gap-4">
            <Metric id="kelly-full" label="Full Kelly" term="action_kelly_full" value={kellyAvailable ? percentage(kelly.full_pct) : "—"}/>
            <Metric id="kelly-half" label="Half Kelly" term="action_kelly_half" value={kellyAvailable ? percentage(kelly.half_pct) : "—"}/>
            <Metric id="shares" label="Số cổ phiếu" term="action_shares" value={number(pos.shares)}/>
            <Metric id="allocation" label="Tỷ trọng / NAV" term="action_allocation" value={percentage(pos.pct_acct)}/>
          </dl>
          <p className="mt-4 border-t border-[var(--border)] pt-3 text-[13px] leading-6 text-[var(--muted)]"><TermHint id="action_sizing">{sizing}</TermHint>. {kellyDisabled ? "Chưa công bố tỷ lệ Kelly; cần thống kê lệnh đã hiệu chuẩn." : kellyAvailable ? "Đọc Kelly cùng giới hạn rủi ro và thanh khoản của vị thế." : "Không dùng tỷ lệ phiên tăng để thay cho tỷ lệ lệnh thắng."}</p>
        </section>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] leading-6 text-[var(--muted)]">
        <span><TermHint id="action_quality">Dữ liệu</TermHint>: {metricText(quality.status)} · {number(quality.score, "/100")}</span>
        <span><TermHint id="action_liquidity">Thanh khoản</TermHint>: {liquidity.pass === true ? "Đạt điều kiện" : liquidity.pass === false ? "Chưa đạt điều kiện" : "Chưa có kết quả"}</span>
        <span>Các mức giá là kế hoạch có điều kiện; dự báo % không phải xác suất thắng.</span>
      </div>
      {showAction && report.commentary.summary && <p className="whitespace-pre-line border-t border-[var(--border)] pt-4 text-sm leading-7 text-[var(--muted)]">{report.commentary.summary}</p>}
      <p className="text-[13px] leading-6 text-[var(--muted)]">Phân tích lúc {stamp(report.evaluated_at)}{report.data_observed_at && ` · Thu thập dữ liệu lúc ${stamp(report.data_observed_at)}`}</p>
    </div>
  </section>;
}
