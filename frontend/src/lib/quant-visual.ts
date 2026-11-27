import type { AnalysisReport } from './api/analysis';
import { readDecision } from './quant-decision';
import { HMM_PROB_SUM_TOLERANCE, interpretationThresholds as limits } from './quant-interpretation-thresholds';
import { readableMetrics } from './quant-presentation';
import { actionNames, at, number, record, researchFor } from './quant-reader';
import { analysisReason } from './api/analysis';
import { hmmPhaseData, scenarioScenes } from './quant-scenario-data';

// Pure view-models for the V2 chart layer (G2-quant-spec 3, 4; G3 batch 4): a small figure for each "Hiểu vì sao" card
// and the main figures of the "Chuyên sâu" modules. Every number is read from the published report. A missing, disabled
// or failed output yields no figure (never 0, never a placeholder series). What the API does not publish is listed in
// `needs` (G2-quant-spec 0.3 and 9.5) and rendered as "Cần dữ liệu từ backend: <field>"; the field names are proposals.
export type Table = { columns: string[]; rows: string[][] };
export type Mark = { at: number; label: string; full: string };
export type ScaleRow = { id: string; label: string; value: number; text: string; min: number; max: number; marks: Mark[]; fillFrom: number | null; over: 'low' | 'high' | null };
export type Fact = { label: string; text: string };
export type LineSeries = { id: string; label: string; values: number[]; dashed?: boolean };
export type Visual =
  | { kind: 'scales'; rows: ScaleRow[] }
  | { kind: 'dots'; filled: number; total: number }
  | { kind: 'ribbon'; segments: { id: string; label: string; value: number; text: string }[]; basis: string }
  | { kind: 'ladder'; levels: { id: string; label: string; price: number; text: string }[]; loss: string; gain: string }
  | { kind: 'waterfall'; bars: { id: string; label: string; from: number; to: number; text: string; tone: 'up' | 'down' | 'ref' }[] }
  | { kind: 'line'; unit: string; labels: string[]; series: LineSeries[]; bands: { id: string; label: string; lo: number[]; hi: number[]; strong: boolean }[]; zero: boolean; ref: { value: number; label: string } | null; regime: string[] | null; anchor: number | null }
  | { kind: 'bars'; unit: string; bars: { lo: number; hi: number; pct: number }[] }
  | { kind: 'facts'; rows: Fact[] };
export type Figure = { id: string; title: string; aria: string; caption: string; table: Table | null; visual: Visual };
export type Need = { field: string; what: string };
export type DeepVisual = { figures: Figure[]; needs: Need[]; empty: string | null; notes: string[] };

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const numeric = (v: unknown): number[] => Array.isArray(v) && v.length > 0 && v.every(finite) ? v : [];
const has = (v: unknown) => Object.keys(record(v)).length > 0;
const present = (v: unknown) => v !== undefined && v !== null;
const vnd = (v: number) => number(Math.round(v));
const plus = (v: number, unit = '%') => `${v > 0 ? '+' : ''}${number(v)}${unit}`;
const ABSENT = 'chưa có';

function ctx(report: AnalysisReport, name: string) {
  const m = readableMetrics(report.sections[name]), get = (p: string) => at(m, p);
  return {
    m, get,
    n: (p: string) => (finite(get(p)) ? (get(p) as number) : null),
    s: (p: string) => (typeof get(p) === 'string' && (get(p) as string).trim() ? (get(p) as string) : null),
    b: (p: string) => (typeof get(p) === 'boolean' ? (get(p) as boolean) : null),
  };
}

const mark = (value: number, label: string, full = label): Mark => ({ at: value, label, full });
function scaleRow(id: string, label: string, value: number, text: string, min: number, max: number, marks: Mark[], fillFrom: number | null = min): ScaleRow {
  const over = value < min ? 'low' : value > max ? 'high' : null;
  return { id, label, value: Math.min(max, Math.max(min, value)), text: over ? `${text} (ngoài thang)` : text, min, max, marks, fillFrom, over };
}
function scalesFigure(id: string, title: string, rows: ScaleRow[], caption: string, aria = title): Figure | null {
  if (!rows.length) return null;
  return { id, title, aria: `${aria}: ${rows.map(r => `${r.label} ${r.text}`).join('; ')}`, caption,
    table: { columns: ['Chỉ số', 'Giá trị', 'Mốc tham chiếu'], rows: rows.map(r => [r.label, r.text, r.marks.map(k => k.full).join('; ') || '—']) },
    visual: { kind: 'scales', rows } };
}
function factsFigure(id: string, title: string, rows: Fact[], caption = ''): Figure | null {
  return rows.length ? { id, title, aria: `${title}: ${rows.map(r => `${r.label} ${r.text}`).join('; ')}`, caption, table: null, visual: { kind: 'facts', rows } } : null;
}
const fact = (label: string, v: number | null | undefined, unit = ''): Fact => ({ label, text: finite(v) ? number(v, unit) : ABSENT });

type LineInput = { id: string; title: string; caption: string; unit: string; xName: string; labels: string[]; series: LineSeries[]; bands?: { id: string; label: string; lo: number[]; hi: number[]; strong: boolean }[]; zero?: boolean; ref?: { value: number; label: string } | null; regime?: string[] | null; anchor?: number | null };
function lineFigure(i: LineInput): Figure | null {
  const n = i.labels.length, bands = i.bands ?? [];
  if (n < 2 || !i.series.length) return null;
  const arrays = [...i.series.map(s => s.values), ...bands.flatMap(b => [b.lo, b.hi])];
  if (arrays.some(a => a.length !== n || !a.every(finite)) || (i.regime && i.regime.length !== n) || (i.ref && !finite(i.ref.value))) return null;
  const fmt = (v: number) => (i.unit === 'VND' ? vnd(v) : number(v));
  const columns = [i.xName, ...i.series.map(s => s.label), ...bands.flatMap(b => [`${b.label} thấp`, `${b.label} cao`]), ...(i.regime ? ['Trạng thái'] : [])];
  const rows = i.labels.map((label, k) => [label, ...i.series.map(s => fmt(s.values[k])), ...bands.flatMap(b => [fmt(b.lo[k]), fmt(b.hi[k])]), ...(i.regime ? [i.regime[k]] : [])]);
  const first = i.series[0];
  return { id: i.id, title: i.title, aria: `${i.title}: ${first.label} từ ${fmt(first.values[0])} đến ${fmt(first.values[n - 1])} ${i.unit}, ${n} điểm`, caption: i.caption,
    table: { columns, rows }, visual: { kind: 'line', unit: i.unit, labels: i.labels, series: i.series, bands, zero: !!i.zero, ref: i.ref ?? null, regime: i.regime ?? null, anchor: i.anchor ?? null } };
}

/** Historical return histogram from the published close series (display only). */
function historicalBars(prices: number[]): { lo: number; hi: number; pct: number }[] {
  const returns = prices.slice(1).flatMap((p, i) => (p > 0 && prices[i] > 0 ? [(p / prices[i] - 1) * 100] : []));
  if (returns.length < 2) return [];
  const low = Math.min(...returns), high = Math.max(...returns), span = Math.max(high - low, 0.01);
  const bins = Math.min(12, Math.max(2, Math.ceil(Math.sqrt(returns.length)))), counts = Array.from({ length: bins }, () => 0);
  for (const v of returns) counts[Math.min(bins - 1, Math.floor((v - low) / span * bins))]++;
  return counts.map((count, i) => ({ lo: low + i * span / bins, hi: low + (i + 1) * span / bins, pct: count / returns.length * 100 }));
}
function barsFigure(id: string, title: string, bars: { lo: number; hi: number; pct: number }[], caption: string): Figure | null {
  if (bars.length < 2 || bars.some(b => ![b.lo, b.hi, b.pct].every(finite) || b.pct < 0 || b.hi < b.lo)) return null;
  return { id, title, aria: `${title}: ${bars.length} khoảng, từ ${number(bars[0].lo)}% đến ${number(bars[bars.length - 1].hi)}%`, caption,
    table: { columns: ['Từ (%)', 'Đến (%)', 'Tần suất (%)'], rows: bars.map(b => [number(b.lo), number(b.hi), number(b.pct)]) }, visual: { kind: 'bars', unit: '%', bars } };
}

// --- shared builders -------------------------------------------------------------------------------------------
function ladder(report: AnalysisReport): Figure | null {
  const c = ctx(report, 'trade_plan'), entry = c.n('sl.entry'), sl = c.n('sl.sl_swing'), tp1 = c.n('sl.tp1'), tp2 = c.n('sl.tp2');
  if (entry == null || sl == null || tp1 == null || tp2 == null) return null;
  // Same order check as the card and the published R:R: 0 < SL < Entry < TP1 <= TP2.
  if (!(sl > limits.trade_plan.minPrice && sl < entry && entry < tp1 && tp1 <= tp2)) return null;
  const levels = [['sl', 'Cắt lỗ', sl], ['entry', 'Giá vào', entry], ['tp1', 'Mục tiêu 1', tp1], ['tp2', 'Mục tiêu 2', tp2]] as const;
  const loss = (sl / entry - 1) * 100, gain = (tp2 / entry - 1) * 100;
  return { id: 'trade_plan', title: 'Thang giá của kế hoạch có điều kiện', aria: `Thang giá VND: cắt lỗ ${vnd(sl)}, giá vào ${vnd(entry)}, mục tiêu 1 ${vnd(tp1)}, mục tiêu 2 ${vnd(tp2)}`,
    caption: 'Chiều rộng đoạn theo giá thật. Đoạn trái là phần lỗ nếu chạm cắt lỗ, đoạn phải là phần lãi tới mục tiêu 2.',
    table: { columns: ['Mức giá', 'Giá (VND)', 'So với giá vào'], rows: levels.map(([, label, p]) => [label, vnd(p), p === entry ? '—' : plus((p / entry - 1) * 100)]) },
    visual: { kind: 'ladder', levels: levels.map(([id, label, price]) => ({ id, label, price, text: vnd(price) })), loss: plus(loss), gain: plus(gain) } };
}
function costWaterfall(report: AnalysisReport): Figure | null {
  const c = ctx(report, 'costs'), gross = c.n('costs.gross_forecast_pct'), rt = c.n('costs.roundtrip_cost_pct'), net = c.n('costs.net_forecast_pct');
  if (gross == null || rt == null || net == null) return null;
  const mismatch = Math.abs(gross - rt - net) > 0.05;
  return { id: 'costs', title: 'Từ dự báo gộp đến sau chi phí', aria: `Dự báo gộp ${number(gross)}%, trừ chi phí hai chiều ${number(rt)}%, còn ${number(net)}%`,
    caption: `Chi phí hai chiều là một giả định gộp của báo cáo; chưa tách phí, thuế, trượt giá.${mismatch ? ' Số công bố không khớp phép trừ; giữ nguyên số công bố.' : ''}`,
    table: { columns: ['Bước', 'Giá trị (%)'], rows: [['Dự báo gộp', plus(gross, '')], ['Chi phí hai chiều', `-${number(Math.abs(rt))}`], ['Sau chi phí', plus(net, '')]] },
    visual: { kind: 'waterfall', bars: [
      { id: 'gross', label: 'Trước phí', from: 0, to: gross, text: plus(gross), tone: gross >= 0 ? 'up' : 'down' },
      { id: 'cost', label: 'Chi phí', from: gross, to: net, text: `-${number(Math.abs(rt))}%`, tone: 'ref' },
      { id: 'net', label: 'Sau phí', from: 0, to: net, text: plus(net), tone: net >= 0 ? 'up' : 'down' }] } };
}
function stateRibbon(report: AnalysisReport): Figure | null {
  const c = ctx(report, 'hmm');
  if (c.s('hmm.method') === 'fallback') return null;
  const keys = [['BULL', 'Pha tăng'], ['SIDEWAY', 'Đi ngang'], ['BEAR', 'Pha giảm']] as const;
  const values = keys.map(([k]) => c.n(`hmm.state_probs.${k}`));
  if (!values.every((v): v is number => v != null && v >= 0 && v <= 100)) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  if (!(sum > 0) || Math.abs(sum - 100) > HMM_PROB_SUM_TOLERANCE) return null;
  const kind = c.s('hmm.probability_kind');
  const basis = kind === 'filtered' ? 'Xác suất lọc' : kind === 'smoothed' ? 'Xác suất làm mượt' : 'Chưa rõ loại xác suất';
  const segments = keys.map(([id, label], i) => ({ id, label, value: values[i], text: `${number(values[i])}%` }));
  return { id: 'hmm', title: 'Xác suất ba trạng thái hiện tại', aria: `${basis}: ${segments.map(s => `${s.label} ${s.text}`).join(', ')}`,
    caption: kind === 'filtered' || kind === 'smoothed' ? `${basis}. Đây là độ chắc của việc gọi tên trạng thái hiện tại, không phải xác suất lãi.` : 'Báo cáo chưa nêu loại xác suất (lọc hay làm mượt), nên chưa xác nhận được cách đọc. Không phải xác suất lãi.',
    table: { columns: ['Trạng thái', 'Xác suất (%)', 'Loại xác suất'], rows: segments.map(s => [s.label, number(s.value), basis]) }, visual: { kind: 'ribbon', segments, basis } };
}
function fanChart(report: AnalysisReport): Figure | null {
  // scenarioScenes validates the cone (finite, ascending sessions, P05 <= P25 <= P50 <= P75 <= P95) and that the module did not fail.
  if (!scenarioScenes(report, 'monte').history) return null;
  const cone = researchFor(report).cone;
  const col = (k: 'p05' | 'p25' | 'p50' | 'p75' | 'p95') => cone.map(p => p[k]);
  return lineFigure({ id: 'simulation-fan', title: 'Dải giá mô phỏng theo phiên', unit: 'VND', xName: 'Phiên', labels: cone.map(p => `+${p.session}`),
    caption: 'Phân vị theo từng phiên, không phải các đường kịch bản. Vùng rộng là P05 đến P95, vùng đậm là P25 đến P75, nét liền là trung vị.',
    series: [{ id: 'p50', label: 'Trung vị P50', values: col('p50') }],
    bands: [{ id: 'wide', label: 'P05-P95', lo: col('p05'), hi: col('p95'), strong: false }, { id: 'core', label: 'P25-P75', lo: col('p25'), hi: col('p75'), strong: true }] });
}
function dots(report: AnalysisReport): Figure | null {
  const up = ctx(report, 'simulation_risk').n('simulation_risk.mc.prob_up');
  if (up == null || up < 0 || up > 100) return null;
  const r = Math.round(up);
  return { id: 'simulation-dots', title: 'Lưới 100 lần mô phỏng', aria: `${r} chấm đậm trên 100 chấm: ${r} trong 100 lần mô phỏng, giá cuối kỳ cao hơn hôm nay`,
    caption: `${r} trong 100 lần mô phỏng, giá cuối kỳ cao hơn hôm nay (làm tròn đến 1%). Chấm đậm là các lần cao hơn; ${100 - r} lần còn lại thấp hơn hoặc bằng.`,
    table: { columns: ['Kết quả', 'Số lần trong 100'], rows: [['Cao hơn hôm nay', String(r)], ['Thấp hơn hoặc bằng', String(100 - r)]] }, visual: { kind: 'dots', filled: r, total: 100 } };
}
function liquidityBar(report: AnalysisReport): Figure | null {
  const c = ctx(report, 'liquidity'), cap = c.n('liquidity.capacity_shares'), shares = ctx(report, 'trade_plan').n('pos.shares');
  if (cap != null && cap > 0 && shares != null && shares >= 0) {
    return scalesFigure('liquidity', 'Quy mô vị thế so với sức chứa', [scaleRow('size', 'Vị thế mẫu', shares, `${number(shares)} cổ phiếu`, 0, Math.max(cap, shares) * 1.15, [mark(cap, 'sức chứa', `Sức chứa tham chiếu ${number(cap)} cổ phiếu`)])],
      'Cơ sở tính sức chứa chưa được báo cáo công bố, nên không suy ra số phiên cần để thoát lệnh.');
  }
  const ratio = c.n('liquidity.value_ratio_5_20');
  if (ratio == null || ratio < 0) return null;
  return scalesFigure('liquidity', 'Nhịp giao dịch gần đây so với nền', [scaleRow('ratio', 'Tỷ lệ 5/20 phiên', ratio, `${number(ratio)}x`, 0, Math.max(2, ratio * 1.1), [mark(limits.liquidity.unchangedVolumeRatio, '1x', 'Bằng nền (1x)')])],
    'Giao dịch nhiều không có nghĩa tiền đang vào ròng.');
}

// --- mini figures ("Hiểu vì sao" cards) ------------------------------------------------------------------------
const minis: Record<string, (r: AnalysisReport) => Figure | null> = {
  garch(r) {
    const p = ctx(r, 'garch').n('garch.garch.persistence');
    if (p == null) return null;
    return scalesFigure('garch', 'Thang dai dẳng α+β', [scaleRow('persistence', 'Dai dẳng α+β', p, number(p), 0, 1.2, [mark(limits.garch.persistent, '0,9', `Mốc dai dẳng ${number(limits.garch.persistent)}`), mark(limits.garch.stationaryLimit, '1', `Mốc không hội tụ ${number(limits.garch.stationaryLimit)}`)])],
      p >= limits.garch.stationaryLimit ? 'Từ 1 trở lên: không có mức dao động dài hạn ổn định.' : 'Càng gần 1, cú sốc dao động càng kéo dài. Không cho biết giá lên hay xuống.');
  },
  simulation_risk: dots,
  distribution(r) {
    const c = ctx(r, 'distribution'), k = c.n('dist.excess_kurtosis'), sk = c.n('dist.skewness');
    const rows = [...(k != null ? [scaleRow('kurt', 'Độ nhọn dư', k, number(k), -2, 8, [mark(limits.distribution.normalExcessKurtosis, '0', 'Phân phối chuẩn: 0')], null)] : []),
      ...(sk != null ? [scaleRow('skew', 'Độ lệch', sk, number(sk), -2, 2, [mark(limits.distribution.symmetric, '0', 'Cân xứng: 0')], null)] : [])];
    return scalesFigure('distribution', 'Hình dạng lợi suất so với phân phối chuẩn', rows, 'Độ nhọn dư lớn hơn 0 nghĩa là đuôi dày hơn phân phối chuẩn.');
  },
  liquidity: liquidityBar,
  statistics(r) {
    const sh = ctx(r, 'statistics').n('stats.sharpe');
    if (sh == null) return null;
    return scalesFigure('statistics', 'Sharpe so với mốc đọc', [scaleRow('sharpe', 'Sharpe', sh, number(sh), -1, 3, [mark(limits.statistics.sharpeFair, '1', `Mốc khá ${limits.statistics.sharpeFair}`), mark(limits.statistics.sharpeStrong, '2', `Mốc rất tốt ${limits.statistics.sharpeStrong}`)], 0)], 'Quá khứ, không đảm bảo năm tới.');
  },
  technical(r) {
    const c = ctx(r, 'technical'), cmf = c.n('flow.cmf'), er = c.n('trend.er');
    const rows = [...(cmf != null ? [scaleRow('cmf', 'Dòng tiền CMF', cmf, number(cmf), -1, 1, [mark(limits.technical.neutralFlow, '0', 'Mốc 0')], null)] : []),
      ...(er != null ? [scaleRow('er', 'Hiệu quả xu hướng ER', er, number(er), 0, 1, [mark(limits.technical.noisyER, '0,3', `Từ ${number(limits.technical.noisyER)} trở xuống là nhiều nhiễu`)])] : [])];
    return scalesFigure('technical', 'Dòng tiền và chất lượng xu hướng', rows, 'Chỉ mô tả, chưa chứng minh dự báo được ngoài mẫu. Màu trung tính.');
  },
  hmm: stateRibbon,
  context(r) {
    const k = ctx(r, 'context').n('cross_corr.avg_pairwise_corr');
    if (k == null) return null;
    return scalesFigure('context', 'Tương quan trung bình giữa các mã', [scaleRow('corr', 'Tương quan TB', k, number(k), -1, 1, [mark(limits.context.independentCorrelation, '0', 'Không cùng chiều: 0')], null)], 'Tương quan cao nghĩa là các mã lên xuống cùng nhau.');
  },
  arima(r) {
    const p = ctx(r, 'arima').n('arima.stationarity.adf_p');
    if (p == null) return null;
    return scalesFigure('arima', 'ADF p-value so với mốc', [scaleRow('adf', 'ADF p-value', p, number(p), 0, 0.2, [mark(limits.arima.adfSignificance, '0,05', `Mốc ${number(limits.arima.adfSignificance)}`)], 0)], 'Chẩn đoán tính ổn định của chuỗi, không phải dự báo giá.');
  },
  directional_alpha(r) {
    const c = ctx(r, 'directional_alpha'), h = c.n('hurst.hurst'), mo = c.n('momentum_alpha.score');
    const rows = [...(mo != null ? [scaleRow('momentum', 'Điểm động lượng', mo, number(mo), -1, 1, [mark(limits.directional_alpha.neutralMomentum, '0', 'Mốc 0')], null)] : []),
      ...(h != null ? [scaleRow('hurst', 'Hurst', h, number(h), 0, 1, [mark(limits.directional_alpha.randomHurst, '0,5', `Gần ngẫu nhiên: ${number(limits.directional_alpha.randomHurst)}`)], null)] : [])];
    return scalesFigure('directional_alpha', 'Động lượng và cấu trúc chuỗi', rows, 'Mô tả, chưa kiểm chứng ngoài mẫu.');
  },
  agreement(r) {
    const c = ctx(r, 'agreement'), cov = c.n('fcast.coverage_pct'), ag = c.n('fcast.agreement_pct');
    const rows = [...(ag != null && ag >= 0 && ag <= 100 ? [scaleRow('agree', 'Đồng thuận', ag, `${number(ag)}%`, 0, 100, [])] : []),
      ...(cov != null && cov >= 0 && cov <= 100 ? [scaleRow('coverage', 'Độ phủ', cov, `${number(cov)}%`, 0, 100, [mark(limits.agreement.fullCoveragePct, '100', 'Đủ mô hình: 100%')])] : [])];
    return scalesFigure('agreement', 'Đồng thuận và độ phủ', rows, 'Các mô hình dùng chung dữ liệu, nên đồng thuận không phải xác suất lãi.');
  },
  trade_plan: ladder,
  costs: costWaterfall,
  decision(r) {
    const s = ctx(r, 'decision').n('rec.score');
    if (s == null || s < limits.decision.minScore || s > limits.decision.maxScore) return null;
    return scalesFigure('decision', 'Điểm Quant', [scaleRow('score', 'Điểm Quant', s, `${number(s)}/100`, 0, 100, [])], 'Điểm xếp hạng của mô hình, không phải xác suất lãi.');
  },
  data_quality(r) {
    const s = ctx(r, 'data_quality').n('data_quality.score');
    if (s == null || s < limits.data_quality.minScore || s > limits.data_quality.maxScore) return null;
    return scalesFigure('data_quality', 'Điểm chất lượng dữ liệu', [scaleRow('score', 'Điểm dữ liệu', s, `${number(s)}/100`, 0, 100, [])], 'Điểm chấm dữ liệu đầu vào, không chấm chất lượng cổ phiếu.');
  },
  commentary: () => null,
};
export const miniFigure = (report: AnalysisReport, module: string): Figure | null => (minis[module] ? minis[module](report) : null);

// --- deep figures ("Chuyên sâu") --------------------------------------------------------------------------------
const NEEDS = {
  arimaInterval: { field: 'arima.forecast.interval', what: 'Khoảng dự báo ARIMA (phân vị theo phiên) để vẽ fan chart; hiện chỉ có các giá dự báo điểm.' },
  volCone: { field: 'garch.vol_cone', what: 'Phân vị lịch sử của biến động theo horizon để vẽ volatility cone.' },
  mcPaths: { field: 'research.mc_paths', what: 'Một số đường mô phỏng mẫu; hiện chỉ có 5 phân vị theo phiên.' },
  vnindex: { field: 'context.vnindex_series', what: 'Chuỗi VN-Index để chuẩn hóa về 100 và so với giá cổ phiếu.' },
  returns: { field: 'research.returns', what: 'Chuỗi lợi suất đầy đủ để vẽ Q-Q plot.' },
  ic: { field: 'directional_alpha.ic, directional_alpha.t_stat, directional_alpha.tier', what: 'IC, t và tầng kiểm chứng của từng thành phần alpha.' },
  agreementModels: { field: 'agreement.models[]', what: 'Kết quả từng mô hình và từng horizon để dựng ma trận đồng thuận.' },
  costParts: { field: 'costs.components[]', what: 'Phí môi giới, thuế và trượt giá tách riêng.' },
  exchange: { field: 'exchange, price_band_pct', what: 'Sàn giao dịch và biên độ giá để kiểm tra mức cắt lỗ trong biên độ.' },
  quality: { field: 'data_quality.checks[]', what: 'Danh sách từng mục kiểm tra dữ liệu (đạt, cảnh báo, lỗi).' },
  hmmKind: { field: 'hmm.probability_kind', what: 'Loại xác suất HMM (lọc hay làm mượt) để xác nhận cách đọc.' },
} as const;
/** Fields the deep layer needs from the backend and the API does not publish yet (shown on "Cách đọc" and in the docs). */
export const backendNeeds: readonly { field: string; what: string }[] = Object.values(NEEDS);
const priceSeries = (report: AnalysisReport) => {
  const m = readableMetrics(report.sections.statistics), close = numeric(m._price_close), dates = Array.isArray(m._price_dates) && m._price_dates.length === close.length && m._price_dates.every(d => typeof d === 'string') ? (m._price_dates as string[]) : close.map((_, i) => `#${i + 1}`);
  return { close, dates, usable: has(m.stats) };
};
const yesNo = (v: boolean | null, y: string, n: string) => (v == null ? ABSENT : v ? y : n);
const sub = (figs: (Figure | null)[]): Figure[] => figs.filter((f): f is Figure => !!f);

const deeps: Record<string, (r: AnalysisReport) => { figures: (Figure | null)[]; needs?: Need[]; notes?: string[] }> = {
  statistics(r) {
    const c = ctx(r, 'statistics'), px = priceSeries(r), stats = has(c.get('stats'));
    const dd = stats ? researchFor(r).drawdown.filter(p => finite(p.valuePct) && typeof p.date === 'string') : [];
    const n = c.n('n') ?? (stats ? researchFor(r).observations ?? null : null);
    return { figures: stats ? [
      lineFigure({ id: 'statistics-drawdown', title: 'Mức giảm so với đỉnh trước đó', unit: '%', xName: 'Ngày', labels: dd.map(p => p.date), series: [{ id: 'dd', label: 'Mức giảm (%)', values: dd.map(p => p.valuePct) }], zero: true, caption: 'Số âm là mức giảm so với đỉnh gần nhất. Quá khứ, không đảm bảo tương lai.' }),
      px.usable ? lineFigure({ id: 'statistics-price', title: 'Giá đóng cửa trong cửa sổ phân tích', unit: 'VND', xName: 'Ngày', labels: px.dates, series: [{ id: 'close', label: 'Giá đóng cửa', values: px.close }], caption: 'Giá theo VND, đúng chuỗi báo cáo dùng để tính các chỉ số.' }) : null,
      factsFigure('statistics-facts', 'Sáu chỉ số hiệu suất', [fact('Sharpe', c.n('stats.sharpe')), fact('Sortino', c.n('stats.sortino')), fact('Lợi suất quy đổi năm', c.n('stats.ann_return_pct'), '%'), fact('Sụt giảm tối đa', c.n('stats.max_dd_pct'), '%'), fact('Biến động quy đổi năm', c.n('stats.ann_vol_pct'), '%'), fact('Số quan sát', n)], 'Sharpe luôn đi kèm số quan sát. Chỉ số trống hiện là chưa có, không phải 0.'),
    ] : [] };
  },
  distribution(r) {
    const c = ctx(r, 'distribution'), ok = has(c.get('dist')), px = numeric(readableMetrics(r.sections.statistics)._price_close);
    const gauss = c.b('dist.verdict.is_gaussian');
    return { figures: ok ? [
      barsFigure('distribution-hist', 'Phân phối lợi suất ngày trong quá khứ', historicalBars(px), 'Dựng từ chuỗi giá đóng cửa đã công bố; khác với phân phối mô phỏng của Monte Carlo. Cột không tô theo dấu.'),
      factsFigure('distribution-facts', 'Hình dạng lợi suất', [fact('Độ lệch', c.n('dist.skewness')), fact('Độ nhọn dư', c.n('dist.excess_kurtosis')), { label: 'Giống phân phối chuẩn', text: yesNo(gauss, 'Có', 'Không') }]),
    ] : [], needs: [NEEDS.returns] };
  },
  arima(r) {
    const c = ctx(r, 'arima'), ok = has(c.get('arima')), prices = numeric(c.get('arima.forecast.prices')), px = priceSeries(r), anchor = ok && px.usable && px.close.length ? px.close[px.close.length - 1] : null;
    const order = c.get('arima.best.order');
    const labels = [...(anchor != null ? ['Đóng cửa gần nhất'] : []), ...prices.map((_, i) => `Dự báo ${i + 1}`)];
    const values = [...(anchor != null ? [anchor] : []), ...prices];
    return { figures: ok ? [
      prices.length ? lineFigure({ id: 'arima-forecast', title: 'Dự báo điểm của ARIMA', unit: 'VND', xName: 'Điểm', labels, series: [{ id: 'f', label: 'Giá dự báo điểm', values, dashed: true }], anchor: anchor != null ? 0 : null,
        caption: 'Dự báo điểm; trong kiểm định nội bộ, dự báo ARIMA ngoài mẫu gần bằng dự báo ngẫu nhiên. Báo cáo chưa nêu mỗi điểm ứng với phiên nào. Không có khoảng dự báo từ mô hình.' }) : null,
      factsFigure('arima-facts', 'Cấu hình và kiểm tra ổn định', [{ label: 'Cấu hình (p, d, q)', text: Array.isArray(order) && order.length && order.every(finite) ? `(${order.join(', ')})` : ABSENT }, fact('AIC', c.n('arima.best.aic')), fact('BIC', c.n('arima.best.bic')), fact('ADF p-value', c.n('arima.stationarity.adf_p')), { label: 'Chuỗi ổn định', text: yesNo(c.b('arima.stationarity.stationary'), 'Có', 'Không') }], 'ADF thấp không có nghĩa xác suất 99% là ổn định; kiểm tra trên lợi suất.'),
    ] : [], needs: present(c.get('arima.forecast.interval')) ? [] : [NEEDS.arimaInterval] };
  },
  garch(r) {
    const c = ctx(r, 'garch'), ok = has(c.get('garch.garch')), fv = numeric(c.get('garch.garch.forecast_vol')), vol = c.n('garch.garch.current_vol_pct'), p = c.n('garch.garch.persistence'), half = c.n('garch.garch.half_life'), gamma = c.n('garch.egarch.gamma');
    const conv = p != null && p > 0 && p < limits.garch.stationaryLimit;
    return { figures: ok ? [
      lineFigure({ id: 'garch-forecast', title: 'Biến động dự báo theo phiên', unit: '% / phiên', xName: 'Phiên', labels: fv.map((_, i) => `+${i + 1}`), series: [{ id: 'vol', label: 'Biến động dự báo (%/phiên)', values: fv }], ref: vol != null ? { value: vol, label: `hiện tại ${number(vol)}%` } : null, caption: 'Biến động theo phiên, không biểu thị hướng giá. Nét đứt là biến động hiện tại.' }),
      miniFigure(r, 'garch'),
      factsFigure('garch-facts', 'Tham số và độ dai dẳng', [fact('α', c.n('garch.garch.alpha')), fact('β', c.n('garch.garch.beta')), fact('α+β', p), { label: 'Chu kỳ bán rã', text: conv && half != null ? `${number(half)} phiên` : 'không hội tụ hoặc chưa có' }, ...(gamma != null ? [{ label: 'EGARCH γ (bất đối xứng)', text: number(gamma) }] : [])], gamma != null ? 'γ khác 0 nghĩa là cú sốc giảm và tăng tác động khác nhau lên biến động.' : ''),
    ] : [], needs: present(c.get('garch.vol_cone')) ? [] : [NEEDS.volCone], notes: ['Chế độ 3D là mặt phản ứng dựng từ tham số mô hình, không phải dự báo theo thời gian.'] };
  },
  hmm(r) {
    const c = ctx(r, 'hmm'), kind = c.s('hmm.probability_kind'), fallback = c.s('hmm.method') === 'fallback', h = hmmPhaseData(r).history;
    const ok = has(c.get('hmm')) && !fallback;
    return { figures: ok ? [
      lineFigure({ id: 'hmm-history', title: 'Nhãn trạng thái lịch sử trên đường giá', unit: 'VND', xName: 'Ngày', labels: h.map(p => p.date), series: [{ id: 'price', label: 'Giá (VND)', values: h.map(p => p.price) }], regime: h.map(p => ({ BULL: 'Pha tăng', SIDEWAY: 'Đi ngang', BEAR: 'Pha giảm' }[p.state])), caption: 'Nhãn lịch sử là nhãn cứng do mô hình gán; không suy xác suất lịch sử từ xác suất hiện tại.' }),
      stateRibbon(r),
    ] : [], needs: kind === 'filtered' || kind === 'smoothed' ? [] : [NEEDS.hmmKind], notes: fallback ? ['Báo cáo dùng phương pháp thay thế, không phải HMM đã khớp; không có xác suất trạng thái.'] : [] };
  },
  technical(r) {
    const c = ctx(r, 'technical'), cmf = c.n('flow.cmf'), er = c.n('trend.er'), r2 = c.n('trend.r2');
    const rows = [...(cmf != null ? [scaleRow('cmf', 'Dòng tiền CMF', cmf, number(cmf), -1, 1, [mark(0, '0', 'Mốc 0')], null)] : []), ...(er != null ? [scaleRow('er', 'Hiệu quả xu hướng ER', er, number(er), 0, 1, [mark(limits.technical.noisyER, '0,3', 'Từ 0,3 trở xuống là nhiều nhiễu')])] : []), ...(r2 != null ? [scaleRow('r2', 'R² của xu hướng', r2, number(r2), 0, 1, [])] : [])];
    return { figures: [scalesFigure('technical', 'Dòng tiền và chất lượng xu hướng', rows, 'Các chỉ báo này chỉ mô tả; nghiên cứu nội bộ ghi chúng không vượt kiểm định ngoài mẫu ở thị trường VN. Màu trung tính, không dùng để gợi ý mua hay bán.'),
      rows.length ? factsFigure('technical-facts', 'Giá trị thô, chưa có phân vị lịch sử', [fact('Độ dốc xu hướng', c.n('trend.slope_pct'), '%'), fact('Sức mạnh 20 phiên so VN-Index', c.n('alpha.cross_sectional.rs_20d_pct'), '%'), fact('Beta', c.n('alpha.cross_sectional.beta'))], 'Báo cáo không có phân vị lịch sử của từng chỉ báo.') : null] };
  },
  directional_alpha(r) {
    const c = ctx(r, 'directional_alpha'), lg = c.b('lightgbm_cross_sectional.available') === true;
    const rows: Fact[] = [];
    if (c.n('momentum_alpha.score') != null || c.b('momentum_alpha.active') != null) rows.push({ label: 'Động lượng', text: `${c.n('momentum_alpha.score') != null ? `điểm ${number(c.n('momentum_alpha.score'))}` : ABSENT}; ${yesNo(c.b('momentum_alpha.active'), 'đang tham gia', 'chưa tham gia')}` });
    if (c.n('hurst.hurst') != null) rows.push({ label: 'Hurst', text: `${number(c.n('hurst.hurst'))}; ${c.s('hurst.regime') ?? 'chưa rõ cấu trúc'}; độ tin cậy ${number(c.n('hurst.confidence'))}` });
    if (c.get('lightgbm_cross_sectional') !== undefined && has(c.get('lightgbm_cross_sectional'))) rows.push({ label: 'LightGBM', text: lg ? `dự báo ${c.n('lightgbm_cross_sectional.proj_pct') != null ? plus(c.n('lightgbm_cross_sectional.proj_pct') as number) : ABSENT}; hạng ${number(c.n('lightgbm_cross_sectional.rank_pct'))}/100; alpha ${number(c.n('lightgbm_cross_sectional.predicted_alpha_pct'), '%')}${c.n('lightgbm_cross_sectional.horizon_sessions') != null ? `; ${number(c.n('lightgbm_cross_sectional.horizon_sessions'))} phiên` : ''}` : 'chưa khả dụng' });
    if (has(c.get('conditional_mr'))) rows.push({ label: 'Hồi quy phần dư', text: yesNo(c.b('conditional_mr.active'), 'đang hoạt động', 'chưa kích hoạt') });
    if (rows.length) rows.push({ label: 'Tầng kiểm chứng', text: 'Mô tả (báo cáo chưa công bố IC, t hay DSR)' });
    return { figures: [factsFigure('alpha-status', 'Trạng thái từng thành phần', rows, 'Mô tả, không nhân quả. Momentum kiểu Mỹ không đạt kiểm định ngoài mẫu ở VN theo nghiên cứu nội bộ. Hurst ước lượng sai lệch khi mẫu ngắn.')], needs: present(c.get('ic')) ? [] : [NEEDS.ic] };
  },
  context(r) {
    const c = ctx(r, 'context'), name = c.s('sector.name'), label = c.s('sector.trend.trend_label'), corr = c.n('cross_corr.avg_pairwise_corr');
    return { figures: [
      factsFigure('context-facts', 'Ngành và xu hướng', name || label || c.n('sector.trend.ret_20D_pct') != null ? [{ label: 'Ngành', text: name ?? ABSENT }, { label: 'Xu hướng ngành', text: label ?? ABSENT }, fact('Ngành 20 phiên', c.n('sector.trend.ret_20D_pct'), '%')] : [], 'Tương quan cao lúc thị trường giảm mạnh còn tăng thêm; tương quan không đảm bảo bảo vệ danh mục.'),
      corr != null ? scalesFigure('context-corr', 'Tương quan trung bình giữa các mã', [scaleRow('corr', 'Tương quan TB', corr, number(corr), -1, 1, [mark(0, '0', 'Không cùng chiều: 0')], null)], 'Thang từ -1 đến 1.') : null] , needs: [NEEDS.vnindex] };
  },
  agreement(r) {
    const c = ctx(r, 'agreement'), h = c.n('fcast.horizon'), ret = c.n('fcast.ensemble_ret_pct');
    const pctRow = (id: string, label: string, v: number | null, marks: Mark[] = []) => (v != null && v >= 0 && v <= 100 ? [scaleRow(id, label, v, `${number(v)}%`, 0, 100, marks)] : []);
    return { figures: [
      scalesFigure('agreement', 'Đồng thuận, độ phủ và mức ủng hộ', [...pctRow('agree', 'Đồng thuận', c.n('fcast.agreement_pct')), ...pctRow('coverage', 'Độ phủ', c.n('fcast.coverage_pct'), [mark(100, '100', 'Đủ mô hình: 100%')]), ...pctRow('support', 'Mức ủng hộ', c.n('fcast.support_pct'))], 'Các mô hình dùng chung dữ liệu, không độc lập; đồng thuận không phải xác suất.'),
      ret != null ? factsFigure('agreement-facts', 'Dự báo tổng hợp', [{ label: h != null ? `Dự báo tổng hợp ${number(h)} phiên` : 'Dự báo tổng hợp', text: `${plus(ret)} trước chi phí` }]) : null], needs: [NEEDS.agreementModels] };
  },
  simulation_risk(r) {
    const c = ctx(r, 'simulation_risk'), ok = has(c.get('simulation_risk')), d = researchFor(r).distribution;
    const bars = ok ? d.filter(p => finite(p.probabilityPct)).map(p => ({ lo: finite(p.lowerPct) ? p.lowerPct : p.returnPct, hi: finite(p.upperPct) ? p.upperPct : p.returnPct, pct: p.probabilityPct })) : [];
    return { figures: ok ? [fanChart(r), dots(r), barsFigure('simulation-dist', 'Phân phối lợi suất cuối kỳ', bars, 'Phân phối cuối kỳ của cùng horizon, không phải xác suất chạm mục tiêu hay cắt lỗ.')] : [], needs: present((r.research as unknown as Record<string, unknown> | null | undefined)?.mc_paths) ? [] : [NEEDS.mcPaths] };
  },
  costs(r) {
    const c = ctx(r, 'costs');
    return { figures: [costWaterfall(r), has(c.get('costs')) ? factsFigure('costs-facts', 'Điểm hòa vốn theo giả định của báo cáo', [fact('Chi phí khứ hồi cần vượt', c.n('costs.roundtrip_cost_pct'), '%')], 'Là chi phí hai chiều theo giả định của báo cáo; giá khớp thực tế có thể khác.') : null], needs: [NEEDS.costParts] };
  },
  trade_plan(r) {
    const c = ctx(r, 'trade_plan'), ok = has(c.get('sl')), kelly = c.get('kelly') as Record<string, unknown> | undefined;
    const lock = c.b('sl.lock_risk_flag');
    return { figures: ok ? [ladder(r),
      factsFigure('trade-facts', 'Tỷ lệ lời/lỗ, quy mô và cảnh báo', [fact('R:R gộp tới mục tiêu 2', c.n('sl.rr2'), 'x'), fact('R:R sau chi phí', c.n('sl.rr_net_cost'), 'x'), fact('Số cổ phiếu mẫu', c.n('pos.shares')), fact('Lỗ tại cắt lỗ (VND)', c.n('pos.max_loss')), fact('Rủi ro trên tài sản', c.n('pos.risk_pct_nav'), '%'),
        { label: 'Kelly', text: kelly?.available === true ? `đầy đủ ${number(finite(kelly.full_pct) ? kelly.full_pct : NaN, '%')}, nửa ${number(finite(kelly.half_pct) ? kelly.half_pct : NaN, '%')} (không phải khuyến nghị)` : kelly?.disabled === true ? 'không áp dụng' : ABSENT },
        { label: 'Cảnh báo thời gian chờ', text: lock === true ? 'Có cảnh báo rủi ro khi chờ cổ phiếu về' : lock === false ? 'Không có cảnh báo' : ABSENT }], 'R:R không phải xác suất. Vốn mẫu do báo cáo giả định, không phải vốn của bạn.')] : [], needs: [NEEDS.exchange] };
  },
  liquidity(r) {
    const c = ctx(r, 'liquidity');
    return { figures: has(c.get('liquidity')) ? [liquidityBar(r), factsFigure('liquidity-facts', 'Kết quả kiểm tra thanh khoản', [{ label: 'Đạt điều kiện', text: yesNo(c.b('liquidity.pass'), 'Đạt', 'Chưa đạt') }, fact('Giao dịch TB 20 phiên (VND)', c.n('liquidity.adv20_value_vnd')), fact('Tỷ lệ 5/20 phiên', c.n('liquidity.value_ratio_5_20'), 'x')], 'Trung bình 20 phiên không phản ánh phiên không khớp.')] : [] };
  },
  data_quality(r) {
    const c = ctx(r, 'data_quality'), ok = has(c.get('data_quality'));
    return { figures: ok ? [miniFigure(r, 'data_quality'), factsFigure('quality-facts', 'Trạng thái và thời điểm dữ liệu', [{ label: 'Trạng thái', text: c.s('data_quality.status') === 'PASS' ? 'Đạt' : c.s('data_quality.status') === 'FAIL' ? 'Chưa đạt' : c.s('data_quality.status') ?? ABSENT }, { label: 'Dữ liệu đến', text: (r.data_observed_at ?? r.data_as_of ?? '').slice(0, 19) || ABSENT }, { label: 'Thời điểm đánh giá', text: (r.evaluated_at ?? '').slice(0, 19) || ABSENT }])] : [], needs: [NEEDS.quality] };
  },
  decision(r) {
    const c = ctx(r, 'decision'), d = readDecision(r);
    const has_ = has(c.get('rec')) || has(c.get('action'));
    const yn = (v: boolean | null) => (v == null ? ABSENT : v ? 'Có' : 'Không');
    return { figures: has_ ? [miniFigure(r, 'decision'), factsFigure('decision-facts', 'Kết luận nguyên văn của mô hình', [{ label: 'Nhãn', text: d.action ? (d.action === 'BUY_NOW' && d.executable !== true ? 'Mô hình: chờ đủ điều kiện' : actionNames[d.action] ?? ABSENT) : ABSENT }, { label: 'Đủ điều kiện thực thi', text: yn(d.executable) }, { label: 'Cổng điều kiện', text: yn(d.gatePass) }, { label: 'Lý do', text: d.reasonCodes.length ? d.reasonCodes.map(x => analysisReason(x)).join(' ') : ABSENT }])] : [] };
  },
};

const emptyText = 'Module chưa có kết quả khả dụng để dựng biểu đồ; không hiện số cũ hay số thay thế.';
/** Figures for a deep module, or null when the module keeps its own visual (commentary). */
export function deepVisual(report: AnalysisReport, module: string): DeepVisual | null {
  const build = deeps[module];
  if (!build) return null;
  const out = build(report), figures = sub(out.figures);
  return { figures, needs: out.needs ?? [], empty: figures.length ? null : emptyText, notes: figures.length ? out.notes ?? [] : [] };
}
export const needsText = (n: Need) => `Cần dữ liệu từ backend: ${n.field}`;
