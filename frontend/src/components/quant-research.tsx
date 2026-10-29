"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AnalysisReport, QuantResearch } from "@/lib/api/analysis";
import { at, number, record, researchFor } from "@/lib/quant-reader";
import { readableMetrics } from "@/lib/quant-presentation";
import TermHint from "./term-hint";
import { presentFactors } from "@/lib/quant-factors";
import {FactorRadar} from "./quant-factor-radar";
import {QuantFactorProfile} from "./quant-factor-profile";
import { QuantScenarioView } from "./quant-scenario-3d";
import { HmmPhaseTriangle } from "./hmm-phase-triangle";
import { QuantGarchView } from "./quant-report-views";

const H = 250, L = 65, T = 30, B = 210;
const accent = "var(--accent)", positive = "var(--positive)", negative = "var(--negative)", muted = "var(--muted)";
type Point = { x: number; value: number; low?: number; high?: number; innerLow?: number; innerHigh?: number; state?: string; label?: string };
const stateColor = (state = "") => state.toUpperCase() === "BULL" ? positive : state.toUpperCase() === "BEAR" ? negative : "var(--neutral)";
const finiteArray = (value: unknown): value is number[] => Array.isArray(value) && value.every(v => typeof v === "number" && Number.isFinite(v));
function Empty() { return <p className="flex min-h-48 items-center justify-center px-4 text-center text-sm text-[var(--muted)]">Báo cáo này chưa có dữ liệu cho biểu đồ. Dữ liệu mẫu không được dùng để thay thế.</p>; }
function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null), [width, setWidth] = useState(560);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(Math.max(240, element.clientWidth)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function Panel({ title, term, children, note, table }: { title: string; term?: string; children?: ReactNode; note: string; table?: ReactNode }) {
  return <article className="min-w-0 rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
    <h4 className="mb-3 text-base font-medium">{term ? <TermHint id={term}>{title}</TermHint> : title}</h4>
    {children || <Empty/>}<p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">{note}</p>
    {table && <details className="mt-3 text-[13px]"><summary className="cursor-pointer text-[var(--accent)]">Xem dữ liệu biểu đồ</summary><div className="mt-3 max-h-64 overflow-auto">{table}</div></details>}
  </article>;
}

export function LinePlot({ title, rows, unit, band = false, regime = false, drawdown = false }: { title: string; rows: Point[]; unit: string; band?: boolean; regime?: boolean; drawdown?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const { ref, width: W } = useChartWidth(), R = W - 20;
  if (rows.length < 2) return <div ref={ref}><Empty/></div>;
  const min = Math.min(...rows.map(p => p.low ?? p.value)), max = Math.max(...rows.map(p => p.high ?? p.value), ...(drawdown ? [0] : []));
  const pad = Math.max((max - min) * .08, Math.abs(max) * .001, .01);
  const x = (i: number) => L + i / (rows.length - 1) * (R - L), y = (v: number) => B - (v - min + pad) / (max - min + 2 * pad) * (B - T);
  const line = (key: "value" | "low" | "high" | "innerLow" | "innerHigh") => rows.map((p, i) => `${x(i)},${y(p[key] ?? p.value)}`).join(" ");
  const area = (lo: "low" | "innerLow", hi: "high" | "innerHigh") => `${line(hi)} ${rows.map((p, i) => `${x(i)},${y(p[lo] ?? p.value)}`).reverse().join(" ")}`;
  const index = Math.min(hover ?? rows.length - 1, rows.length - 1), current = rows[index];
  return <div ref={ref}>
    <div aria-live="polite" className="mb-2 flex min-h-10 flex-wrap gap-x-3 text-[13px] text-[var(--muted)]"><span>{current.label || `Phiên +${current.x}`}</span><strong className="text-[var(--text)]">{number(current.value)} {unit}</strong>{regime && <span>{current.state}</span>}{band && <span>P05–P95: {number(current.low)}–{number(current.high)}</span>}</div>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="block h-auto w-full" onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(rows.length - 1, Math.round(((event.clientX - box.left) / box.width * W - L) / (R - L) * (rows.length - 1))))); }} onPointerLeave={() => setHover(null)}>
      <title>{`${title} · ${unit}`}</title><text x={L} y="15" fill={muted} fontSize="13">{unit}</text>
      {[0, 1, 2, 3].map(i => { const v = min + (max - min) * i / 3; return <g key={i}><line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="var(--border)"/><text x={L - 8} y={y(v) + 4} fill={muted} fontSize="13" textAnchor="end">{unit === "VND" ? number(Math.round(v)) : number(Math.round(v * 100) / 100)}</text></g>; })}
      {regime && rows.map((p, i) => <rect key={i} x={Math.max(L, x(i) - (R - L) / (rows.length - 1) / 2)} y={T} width={Math.min((R - L) / (rows.length - 1), R - Math.max(L, x(i) - (R - L) / (rows.length - 1) / 2))} height={B - T} fill={stateColor(p.state)} opacity=".16"><title>{`${p.label}: ${p.state}`}</title></rect>)}
      {band && <><polygon points={area("low", "high")} fill={positive} opacity=".12"/><polygon points={area("innerLow", "innerHigh")} fill={positive} opacity=".25"/></>}
      {drawdown && <polygon points={`${L},${y(0)} ${line("value")} ${R},${y(0)}`} fill={negative} opacity=".15"/>}
      <polyline points={line("value")} fill="none" stroke={drawdown ? negative : regime ? "var(--text)" : accent} strokeWidth="2"/>
      {hover !== null && <><line x1={x(index)} x2={x(index)} y1={T} y2={B} stroke={muted} strokeDasharray="3 3"/><circle cx={x(index)} cy={y(current.value)} r="4" fill={accent}/></>}
      <text x={L} y="237" fill={muted} fontSize="13">{rows[0].label || `+${rows[0].x} phiên`}</text><text x={R} y="237" textAnchor="end" fill={muted} fontSize="13">{rows.at(-1)?.label || `+${rows.at(-1)?.x} phiên`}</text>
    </svg>
    {band && <div className="flex gap-4 text-[13px] text-[var(--muted)]"><span>P05–P95</span><span>P25–P75</span><span className="text-[var(--accent)]">Trung vị P50</span></div>}
    {regime && <div className="flex gap-4 text-[13px]"><span style={{ color: positive }}>BULL</span><span className="text-[var(--neutral)]">SIDEWAY</span><span style={{ color: negative }}>BEAR</span></div>}
  </div>;
}

export function Histogram({ data, title="Phân phối lợi suất cuối kỳ", observation="kịch bản" }: { data: QuantResearch["distribution"]; title?:string; observation?:string }) {
  const { ref, width: W } = useChartWidth(), R = W - 20;
  if (!data.length) return <div ref={ref}><Empty/></div>;
  const max = Math.max(...data.map(p => p.probabilityPct), 1), width = (R - L) / data.length;
  return <div ref={ref}><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="block h-auto w-full">
    <title>{`${title} · tần suất (%)`}</title>
    {[0, .5, 1].map(p => <g key={p}><line x1={L} x2={R} y1={B - p * (B - T)} y2={B - p * (B - T)} stroke="var(--border)"/><text x={L - 8} y={B - p * (B - T) + 4} fill={muted} fontSize="13" textAnchor="end">{number(max * p)}%</text></g>)}
    {data.map((p, i) => <rect key={i} x={L + i * width + 1} y={B - p.probabilityPct / max * (B - T)} width={Math.max(1, width - 2)} height={p.probabilityPct / max * (B - T)} fill={p.returnPct < 0 ? negative : positive} opacity=".8"><title>{`${number(p.lowerPct ?? p.returnPct)} đến ${number(p.upperPct ?? p.returnPct)}%: ${number(p.probabilityPct)}% ${observation}`}</title></rect>)}
    <text x={L} y="237" fill={muted} fontSize="13">{number(data[0].lowerPct ?? data[0].returnPct)}%</text><text x={R} y="237" fill={muted} fontSize="13" textAnchor="end">{number(data.at(-1)?.upperPct ?? data.at(-1)?.returnPct)}%</text>
  </svg></div>;
}

export function Radar({data,title="Hồ sơ nhân tố chuẩn hóa"}:{data:QuantResearch["factors"];title?:string}) {
  return <FactorRadar factors={presentFactors(data)} title={title}/>;
}

function DataTable({ columns, rows }: { columns: string[]; rows: (string | number | undefined)[][] }) {
  return <table className="w-full text-left"><thead><tr>{columns.map(c => <th key={c} className="whitespace-nowrap border-b border-[var(--border)] p-2 font-medium">{c}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className="whitespace-nowrap border-b border-[var(--border)] p-2 font-mono">{typeof v === "number" ? number(v) : v ?? "—"}</td>)}</tr>)}</tbody></table>;
}

export function QuantResearchVisuals({ report }: { report: AnalysisReport }) {
  const [recent, setRecent] = useState(false), source = researchFor(report);
  const usable = (name: string, key: string) => {
    const section = report.sections[name], output = record(section?.metrics[key]);
    return section?.status === "AVAILABLE" && !output.error && output.disabled !== true && output.available !== false;
  };
  const simulationReady = usable("simulation_risk", "simulation_risk");
  const research = { ...source,
    cone: simulationReady ? source.cone : [], distribution: simulationReady ? source.distribution : [],
    risk_metrics: simulationReady ? source.risk_metrics : [],
    regime: usable("hmm", "hmm") ? source.regime : [],
    drawdown: usable("statistics", "stats") ? source.drawdown : [],
  };
  const history = <T,>(rows: T[]) => recent ? rows.slice(-10) : rows;
  const stop = readableMetrics(report.sections.trade_plan), entry = at(stop, "sl.entry"), sl = at(stop, "sl.sl_swing"), tp = at(stop, "sl.tp2");
  const validTrade = typeof entry === "number" && typeof sl === "number" && typeof tp === "number" && [entry, sl, tp].every(Number.isFinite) && 0 < sl && sl < entry && entry < tp;
  const forecast = at(readableMetrics(report.sections.garch), "garch.garch.forecast_vol");
  const statistics = readableMetrics(report.sections.statistics);
  const price = statistics._price_close, dates = statistics._price_dates;
  return <section aria-label={`Visual Quant ${report.symbol}`} className="grid min-w-0 gap-4">
    <div><p className="text-[13px] tracking-widest text-[var(--accent)]">BẰNG CHỨNG / RỦI RO / KỊCH BẢN</p><h3 className="mt-2 text-xl font-medium">Góc nhìn định lượng</h3><p className="mt-2 text-sm leading-7 text-[var(--muted)]">Dữ liệu từ báo cáo {report.symbol}{research.horizon_sessions ? ` · Horizon ${research.horizon_sessions} phiên` : ""}{research.simulation_count ? ` · ${research.simulation_count.toLocaleString("vi-VN")} kịch bản` : ""}. Giá theo VND.</p></div>
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Panel title="Dải giá dự báo" term="monte_carlo" note="P05–P95 và P25–P75; đường giữa P50. Các phân vị được tổng hợp từ đúng lần mô phỏng của báo cáo." table={!!research.cone.length && <DataTable columns={["Phiên +", "P05 (VND)", "P25", "P50", "P75", "P95"]} rows={research.cone.map(p => [p.session, p.p05, p.p25, p.p50, p.p75, p.p95])}/> }>
        <QuantScenarioView report={report} kind="monte">{!!research.cone.length && <LinePlot title={`Dải giá Monte Carlo ${report.symbol}`} unit="VND" band rows={research.cone.map(p => ({ x: p.session, value: p.p50, low: p.p05, innerLow: p.p25, innerHigh: p.p75, high: p.p95 }))}/>}</QuantScenarioView>
      </Panel>
      <Panel title="Phân phối lợi suất" term="mc_volatility" note="Phân phối cuối kỳ của cùng horizon. Không phải xác suất TP chạm trước SL." table={!!research.distribution.length && <DataTable columns={["Biên dưới (%)", "Biên trên (%)", "Tần suất (%)"]} rows={research.distribution.map(p => [p.lowerPct ?? p.returnPct, p.upperPct ?? p.returnPct, p.probabilityPct])}/> }><Histogram data={research.distribution}/></Panel>
      <Panel title="Trạng thái HMM" term="hmm" note="Hiển thị nhãn trạng thái lịch sử do mô hình trả về; không tự tạo xác suất lịch sử." table={!!research.regime.length && <DataTable columns={["Phiên", "Giá (VND)", "Trạng thái"]} rows={research.regime.map(p => [p.date, p.price, p.state])}/> }>
        <label className="mb-3 flex items-center gap-2 text-[13px] text-[var(--muted)]"><input type="checkbox" checked={recent} onChange={e => setRecent(e.target.checked)}/>Chỉ xem 10 quan sát cuối</label>
        <LinePlot title={`Lịch sử trạng thái HMM ${report.symbol}`} unit="VND" regime rows={history(research.regime).map((p, i) => ({ x: i, value: p.price, label: p.date, state: p.state }))}/>
        <HmmPhaseTriangle report={report}/>
      </Panel>
      <Panel title="Sụt giảm từ đỉnh" term="max_drawdown" note="Drawdown được tính từ chuỗi giá đóng cửa của đúng cửa sổ phân tích. Số âm phản ánh mức giảm so với đỉnh trước đó." table={!!research.drawdown.length && <DataTable columns={["Phiên", "Drawdown (%)"]} rows={research.drawdown.map(p => [p.date, p.valuePct])}/> }><LinePlot title={`Sụt giảm từ đỉnh ${report.symbol}`} unit="%" drawdown rows={history(research.drawdown).map((p, i) => ({ x: i, value: p.valuePct, label: p.date }))}/></Panel>
      <QuantFactorProfile data={research.factors}/>
      <Panel title="Rủi ro và phương án" term="risk_reward" note="R:R gộp chỉ tính khi SL < Entry < TP2; không thay thế dự báo ròng hay quyết định từ BE.">
        <dl className="grid grid-cols-2 gap-5 py-3">{research.risk_metrics.map(p => <div key={p.id}><dt className="text-[13px] text-[var(--muted)]">{p.label}</dt><dd className="mt-2 font-mono text-lg">{number(p.value, p.unit)}</dd></div>)}
          {[["Upside TP2", validTrade ? (tp / entry - 1) * 100 : undefined, "%"], ["Downside SL", validTrade ? (sl / entry - 1) * 100 : undefined, "%"], ["R:R gộp TP2", validTrade ? (tp - entry) / (entry - sl) : undefined, "x"]].map(([label, value, unit]) => <div key={String(label)}><dt className="text-[13px] text-[var(--muted)]">{label}</dt><dd className="mt-2 font-mono text-lg">{number(value, String(unit))}</dd></div>)}
        </dl>
      </Panel>
      <Panel title="Biến động dự báo GARCH" term="garch" note="Biến động lợi suất theo phiên (%); không biểu thị hướng giá."><QuantGarchView report={report}><LinePlot title="Biến động dự báo GARCH" unit="% / phiên" rows={finiteArray(forecast) ? forecast.map((value, i) => ({ x: i + 1, value })) : []}/></QuantGarchView></Panel>
      <Panel title="Lịch sử giá đóng cửa" note="Chuỗi giá dùng trong báo cáo, giữ nguyên đơn vị VND."><LinePlot title={`Lịch sử giá đóng cửa ${report.symbol}`} unit="VND" rows={finiteArray(price) ? price.map((value, i) => ({ x: i, value, label: Array.isArray(dates) ? String(dates[i]).slice(0, 10) : undefined })) : []}/></Panel>
    </div>
  </section>;
}

