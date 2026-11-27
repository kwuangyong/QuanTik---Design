import { analysisReason, type AnalysisReport } from './api/analysis';
import { readDecision } from './quant-decision';
import { moduleAvailability, readableMetrics } from './quant-presentation';
import { actionNames, at, number, record, researchFor } from './quant-reader';

// Pure view-model for the "Tóm tắt" (30 second) layer of the V2 reader (G2-ux-spec 1.2, 3, 10 batch 2).
// Every figure is read from the published report; a missing, disabled or errored output becomes "—" and an explicit
// "no data" state, never 0 or "neutral". Nothing here recomputes a forecast, decision or threshold.
export type GlanceTone = 'ok' | 'neutral' | 'caution' | 'risk' | 'nodata';
export type GlanceNumber = { id: string; label: string; term: string; value: string; note: string; available: boolean };
export type GlanceRisk = {
  /** Natural frequency from the Monte Carlo lock risk, when published. */
  frequency: { perHundred: number; perHundredText: string; simulations: number | null } | null;
  /** Historical max drawdown (positive percent), when published. */
  history: number | null;
};
export type GlanceTrustItem = { id: string; label: string; term: string; value: string; chip: string; tone: GlanceTone };
export type GlanceGroup = { id: 'C' | 'A' | 'B' | 'D'; title: string; question: string; chip: string; tone: GlanceTone; coverage: string; figure: GlanceNumber };
export type Glance = {
  symbol: string; session: string; asOf: string;
  verdict: { available: boolean; title: string; chip: string; tone: GlanceTone; lead: string };
  risk: GlanceRisk;
  numbers: GlanceNumber[];
  trust: GlanceTrustItem[];
  groups: GlanceGroup[];
  /** Real values for glossary example templates; absent keys drop the example line. */
  slots: Record<string, Record<string, string | number | null>>;
};

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const signed = (v: number, suffix = '%') => `${v > 0 ? '+' : ''}${number(v)}${suffix}`;
const groupModules: Record<GlanceGroup['id'], { title: string; question: string; modules: string[] }> = {
  C: { title: 'Rủi ro', question: 'Có thể mất bao nhiêu?', modules: ['garch', 'simulation_risk', 'distribution', 'liquidity'] },
  A: { title: 'Hiện trạng', question: 'Cổ phiếu đang thế nào?', modules: ['statistics', 'technical', 'hmm', 'context'] },
  B: { title: 'Triển vọng', question: 'Giá có thể đi đâu?', modules: ['arima', 'directional_alpha', 'agreement'] },
  D: { title: 'Mua bán', question: 'Nếu hành động thì thế nào?', modules: ['trade_plan', 'costs', 'decision'] },
};

export function buildGlance(report: AnalysisReport): Glance {
  const m = (section: string) => readableMetrics(report.sections[section]);
  const val = (section: string, path: string) => at(m(section), path);
  const numAt = (section: string, path: string) => { const v = val(section, path); return finite(v) ? v : null; };
  const research = researchFor(report);
  const session = report.target_session || report.data_as_of.slice(0, 10);
  const asOf = report.data_as_of.slice(0, 10);

  // Verdict: the backend decision, shown only when the decision section itself is usable.
  const decisionSection = report.sections.decision;
  const decisionOutput = record(record(decisionSection?.metrics).action);
  const decisionBroken = !!decisionSection && (decisionSection.status !== 'AVAILABLE' || !!decisionOutput.error || decisionOutput.disabled === true || decisionOutput.available === false);
  const decision = readDecision(report);
  const action = decisionBroken ? '' : decision.action;
  let verdict: Glance['verdict'];
  if (!action) {
    verdict = { available: false, title: 'Chưa có kết luận', chip: 'Chưa đủ dữ liệu', tone: 'nodata', lead: 'Báo cáo chưa công bố kết luận của mô hình cho phiên này. Không có nghĩa là không có rủi ro.' };
  } else {
    const executable = decision.executable;
    const reasons = decision.reasonCodes.map(code => analysisReason(code));
    const tone: GlanceTone = action === 'AVOID' ? 'risk' : action === 'BUY_NOW' && executable === true ? 'ok' : action === 'WATCH' || action === 'BUY_SETUP' ? 'caution' : 'neutral';
    const state = executable === true ? 'Báo cáo xác nhận các điều kiện thực thi đã đạt.' : reasons.length ? reasons.join(' ') : executable === false ? 'Chưa đủ điều kiện thực thi.' : 'Chưa xác nhận điều kiện thực thi.';
    verdict = { available: true, title: actionNames[action] || action, chip: executable === true ? 'Đủ điều kiện thực thi' : executable === false ? 'Chưa đủ điều kiện thực thi' : 'Chưa xác nhận thực thi', tone, lead: `${state} Đây là nhãn của mô hình, không phải lệnh mua hay bán.` };
  }

  // Risk: natural frequency out of 100, from the published probability only.
  const lock = numAt('simulation_risk', 'simulation_risk.lock_risk.prob_loss_gt_3pct');
  const dd = numAt('statistics', 'stats.max_dd_pct');
  const count = research.simulation_count;
  const risk: GlanceRisk = {
    frequency: lock != null && lock >= 0 && lock <= 100 ? { perHundred: Math.round(lock), perHundredText: lock > 0 && Math.round(lock) === 0 ? 'ít hơn 1' : String(Math.round(lock)), simulations: finite(count) && count > 0 && Number.isInteger(count) ? count : null } : null,
    history: dd != null && dd < 0 ? Math.abs(dd) : null,
  };

  // At most three headline numbers, each with its reference point.
  const score = numAt('decision', 'rec.score');
  const pos = (key: string) => numAt('trade_plan', `pos.${key}`);
  const riskPct = pos('risk_pct_nav'), maxLoss = pos('max_loss');
  const closes = val('statistics', '_price_close'), dates = val('statistics', '_price_dates');
  const statsUsable = moduleAvailability('statistics', report.sections.statistics) !== 'Thiếu dữ liệu' && moduleAvailability('statistics', report.sections.statistics) !== 'Đã tắt';
  const lastClose = statsUsable && Array.isArray(closes) ? closes[closes.length - 1] : undefined;
  const lastDate = statsUsable && Array.isArray(dates) ? dates[dates.length - 1] : undefined;
  const hasClose = finite(lastClose) && lastClose > 0;
  const numbers: GlanceNumber[] = [
    { id: 'score', label: 'Điểm Quant', term: 'quant_score', value: score != null ? `${number(score)}/100` : '—', note: score != null ? 'Thang 0 đến 100. Điểm xếp hạng, không phải xác suất lãi.' : 'Chưa công bố', available: score != null },
    { id: 'loss', label: 'Lỗ ước tính nếu kế hoạch sai', term: 'stop_target', value: riskPct != null ? `${number(riskPct)}% tài sản` : maxLoss != null ? `${number(maxLoss)} VND` : '—', note: riskPct != null && maxLoss != null ? `${number(maxLoss)} VND, theo mức cắt lỗ của kế hoạch` : riskPct != null || maxLoss != null ? 'Theo mức cắt lỗ của kế hoạch' : 'Chưa công bố', available: riskPct != null || maxLoss != null },
    { id: 'close', label: 'Giá đóng cửa gần nhất', term: '', value: hasClose ? number(lastClose) : '—', note: hasClose ? `VND${typeof lastDate === 'string' ? `, phiên ${lastDate}` : ''}` : 'Chưa công bố', available: hasClose },
  ];

  // Trust strip.
  const quality = val('data_quality', 'data_quality.status'), qualityScore = numAt('data_quality', 'data_quality.score');
  const coverage = numAt('agreement', 'fcast.coverage_pct');
  const qualityText = typeof quality === 'string' ? quality : '';
  const trust: GlanceTrustItem[] = [
    { id: 'quality', label: 'Chất lượng dữ liệu', term: 'data_quality', value: qualityText && qualityScore != null ? `${number(qualityScore)}/100` : '—',
      chip: qualityText === 'PASS' ? 'Đạt' : qualityText === 'FAIL' ? 'Chưa đạt' : qualityText ? qualityText : 'Chưa đủ dữ liệu',
      tone: qualityText === 'PASS' ? 'ok' : qualityText === 'FAIL' ? 'risk' : qualityText ? 'caution' : 'nodata' },
    { id: 'coverage', label: 'Mô hình tham gia dự báo', term: 'coverage', value: coverage != null ? `${number(coverage)}%` : '—',
      chip: coverage == null ? 'Chưa đủ dữ liệu' : coverage >= 100 ? 'Đủ' : 'Thận trọng', tone: coverage == null ? 'nodata' : coverage >= 100 ? 'ok' : 'caution' },
    { id: 'warnings', label: 'Cảnh báo của báo cáo', term: '', value: String(report.warnings.length), chip: report.warnings.length ? 'Cần đọc' : 'Không có', tone: report.warnings.length ? 'caution' : 'neutral' },
    { id: 'asof', label: 'Dữ liệu đến', term: '', value: asOf, chip: 'Ngày', tone: 'neutral' },
  ];

  // Groups: C, A, B, D. Status describes data availability only; no tone is invented without a published threshold.
  const wave = (id: GlanceGroup['id']): GlanceNumber => {
    if (id === 'C') { const v = numAt('garch', 'garch.garch.current_vol_pct'); return { id, label: 'Dao động hôm nay', term: 'garch', value: v != null ? `${number(v)}%` : '—', note: v != null ? 'Mỗi phiên, theo mô hình GARCH' : 'Chưa công bố', available: v != null }; }
    if (id === 'A') { const v = numAt('statistics', 'stats.ann_return_pct'); return { id, label: 'Lợi suất quy đổi năm', term: 'ann_return', value: v != null ? signed(v) : '—', note: v != null ? 'Từ giai đoạn quan sát, không phải cam kết' : 'Chưa công bố', available: v != null }; }
    if (id === 'B') {
      const v = numAt('agreement', 'fcast.ensemble_ret_pct'), h = numAt('agreement', 'fcast.horizon');
      return { id, label: h != null ? `Dự báo tổng hợp ${number(h)} phiên` : 'Dự báo tổng hợp', term: 'agreement', value: v != null ? signed(v) : '—', note: v != null ? 'Trước chi phí; chưa kiểm chứng ngoài mẫu' : 'Chưa công bố', available: v != null };
    }
    const v = numAt('trade_plan', 'sl.rr2');
    return { id, label: 'Lãi/lỗ trước chi phí', term: 'rr', value: v != null && v > 0 ? number(v) : '—', note: v != null && v > 0 ? 'Mốc 1 là hòa; chưa tính chi phí' : 'Chưa công bố', available: v != null && v > 0 };
  };
  const groups = (Object.keys(groupModules) as GlanceGroup['id'][]).map((id): GlanceGroup => {
    const def = groupModules[id];
    const states = def.modules.map(name => moduleAvailability(name, report.sections[name]));
    const disabled = states.filter(s => s === 'Đã tắt').length, total = states.length - disabled;
    const full = states.filter(s => s === 'Có dữ liệu').length, missing = states.filter(s => s === 'Thiếu dữ liệu').length;
    const nodata = total === 0 || missing * 2 > total;
    const partial = !nodata && full < total;
    return { id, title: def.title, question: def.question, tone: nodata ? 'nodata' : 'neutral',
      chip: nodata ? 'Chưa đủ dữ liệu' : partial ? 'Một phần' : 'Có dữ liệu',
      coverage: total === 0 ? 'Mọi module của nhóm đã tắt' : `${full}/${total} module đủ dữ liệu${disabled ? `, ${disabled} đã tắt` : ''}`, figure: wave(id) };
  });
  const text = (v: number | null) => v == null ? null : number(v);
  const slots: Glance['slots'] = {
    quant_score: { score: text(score) },
    data_quality: { status: qualityText || null, score: text(qualityScore) },
    coverage: { coverage_pct: text(coverage) },
    garch: { current_vol_pct: text(numAt('garch', 'garch.garch.current_vol_pct')) },
    ann_return: { ann_return_pct: text(numAt('statistics', 'stats.ann_return_pct')) },
    agreement: { agreement_pct: text(numAt('agreement', 'fcast.agreement_pct')) },
    rr: { rr2: text(numAt('trade_plan', 'sl.rr2')) },
    stop_target: { sl_swing: text(numAt('trade_plan', 'sl.sl_swing')), tp1: text(numAt('trade_plan', 'sl.tp1')) },
    monte_carlo: { prob_up: text(numAt('simulation_risk', 'simulation_risk.mc.prob_up')) },
    max_drawdown: { max_dd_pct: text(dd) },
  };
  return { symbol: report.symbol, session, asOf, verdict, risk, numbers, trust, groups, slots };
}
