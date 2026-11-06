import type { AnalysisReport, QuantResearch } from './api/analysis';

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export type RadarValue = { value: number | null; score: number | null; status: string; formula: string };
const missing = (status: string): RadarValue => ({ value: null, score: null, status, formula: status });
const result = (value: number, score: number, formula: string): RadarValue => ({ value, score, status: 'Có dữ liệu', formula });

// Reject stale output at every ancestor, including nested disabled/error objects.
function read(report: AnalysisReport | undefined, section: string, path: string): unknown {
  const source = report?.sections[section];
  if (source?.status !== 'AVAILABLE') return undefined;
  let value: unknown = source.metrics;
  for (const key of path.split('.')) {
    const parent = object(value);
    if (parent.error || parent.disabled === true || parent.available === false) return undefined;
    value = parent[key];
  }
  const leaf = object(value);
  return leaf.error || leaf.disabled === true || leaf.available === false ? undefined : value;
}
function numeric(report: AnalysisReport | undefined, section: string, path: string): number | null {
  const value = read(report, section, path);
  return finite(value) ? value : null;
}

// Preserve the agreed category when rounding an otherwise continuous display curve.
function categoryRound(score: number, raw: number, low: number, high: number): number {
  return raw < low ? Math.min(49, Math.round(score)) : raw > high ? Math.max(71, Math.round(score)) : Math.max(50, Math.min(70, Math.round(score)));
}
export function sharpeScore(raw: number): number | null {
  if (!finite(raw)) return null;
  // Tail scale = the agreed 0..2 normal band, not a new trading threshold.
  const score = raw < 0 ? 50 / (1 - raw / 2) : raw <= 2 ? 50 + 10 * raw : 70 + 30 * (1 - 2 / raw);
  return categoryRound(score, raw, 0, 2);
}
export function cmfScore(raw: number): number | null {
  if (!finite(raw) || raw < -1 || raw > 1) return null;
  const score = raw < 0 ? 50 * (raw + 1) : raw <= .1 ? 50 + 200 * raw : 70 + 30 * (raw - .1) / .9;
  return categoryRound(score, raw, 0, .1);
}
export function trendScore(raw: number): number | null {
  if (!finite(raw) || raw < 0 || raw > 1) return null;
  const score = raw < .3 ? raw / .3 * 50 : raw <= .6 ? 50 + (raw - .3) / .3 * 20 : 70 + (raw - .6) / .4 * 30;
  return categoryRound(score, raw, .3, .6);
}
export function filteredHmmScore(report?: AnalysisReport): RadarValue {
  const method = read(report, 'hmm', 'hmm.method');
  if (method === 'fallback' || typeof method !== 'string' || !/hmm/i.test(method)) return missing('Chưa có HMM đã fit thành công');
  const kind = read(report, 'hmm', 'hmm.probability_kind');
  if (kind != null && kind !== 'filtered') return missing('Cần xác suất filtered, không dùng smoothed/predicted');
  // Existing API state_probs is predict_proba(features)[-1]: the last observation
  // has no future evidence. Never use historical smoothed probabilities here.
  const values = ['BULL', 'SIDEWAY', 'BEAR'].map(state => numeric(report, 'hmm', `hmm.state_probs.${state}`));
  if (!values.every((v): v is number => v != null && v >= 0 && v <= 100) || Math.abs(values.reduce<number>((s,v) => s + (v ?? 0), 0) - 100) > .2) return missing('Thiếu hoặc sai đơn vị xác suất HMM (%)');
  const score = values[0] + .5 * values[1];
  if (score < 0 || score > 100) return missing('Xác suất HMM không hợp lệ');
  return result(score, score, 'P từ API theo %: điểm = P(BULL) + 0,5 × P(SIDEWAY). <30: bear rõ; >70: bull rõ; 50: trung tính.');
}

function scoringInputs(report?: AnalysisReport) {
  const research = report?.research;
  const inputs = research?.radar_scoring;
  const session = report?.target_session || research?.end || report?.data_as_of.slice(0,10);
  return research?.schema_version === 1 && research.symbol === report?.symbol && research.units.price === 'VND' && research.units.return === 'pct' && inputs?.schema_version === 1 && inputs.as_of === session ? inputs : undefined;
}
export function percentileRank(value: number, population: readonly number[]): number | null {
  if (!finite(value) || population.length < 2 || !population.every(finite) || !population.includes(value)) return null;
  const less = population.filter(v => v < value).length, tied = population.filter(v => v === value).length;
  return 100 * (less + (tied - 1) / 2) / (population.length - 1);
}
export function liquidityScore(report?: AnalysisReport): RadarValue {
  if (!read(report, 'liquidity', 'liquidity')) return missing('Module thanh khoản chưa khả dụng');
  const universe = scoringInputs(report)?.liquidity_universe;
  if (!universe?.universe_id?.trim() || !Array.isArray(universe.members) || universe.members.length < 2) return missing('Thiếu rổ ADV20 và Amihud20 cùng phiên');
  const members = universe.members;
  if (members.some(p => !p || typeof p.symbol !== 'string' || !p.symbol.trim() || !finite(p.adv20_value_vnd) || p.adv20_value_vnd <= 0 || !finite(p.amihud20) || p.amihud20 < 0) || new Set(members.map(p => p.symbol.toUpperCase())).size !== members.length) return missing('Rổ thanh khoản không hợp lệ');
  const current = members.find(p => p.symbol.toUpperCase() === report?.symbol.toUpperCase());
  if (!current) return missing('Mã không có trong rổ thanh khoản');
  const adv = percentileRank(Math.log(current.adv20_value_vnd), members.map(p => Math.log(p.adv20_value_vnd)))!;
  const amihud = percentileRank(current.amihud20, members.map(p => p.amihud20))!;
  const score = .5 * adv + .5 * (100 - amihud);
  return result(score, score, `50% × phân vị log(ADV20) (${adv.toFixed(1)}) + 50% × phân vị Amihud20 đảo chiều (${(100-amihud).toFixed(1)}). Rổ ${universe.universe_id}: ${members.length} mã; ${scoringInputs(report)!.as_of}.`);
}

export function legacyFactor(data: QuantResearch['factors'], id: string): RadarValue {
  const input = data.find(p => p.id === id);
  if (!input || !finite(input.value) || !finite(input.min) || !finite(input.max) || input.max <= input.min || input.value < input.min || input.value > input.max) return missing('Thiếu điểm nguồn hoặc phạm vi hợp lệ');
  return result(input.value, Math.round((input.value - input.min) / (input.max - input.min) * 100), `Giữ cách tính nguồn: (giá trị − ${input.min}) / (${input.max} − ${input.min}) × 100. Đây là điểm tương đối, không phải chỉ số gốc.`);
}
export const alphaModuleIds = ['data_quality','liquidity','distribution','statistics','arima','garch','hmm','technical','context','directional_alpha','agreement','simulation_risk','costs','trade_plan'] as const;
export type ModuleScore = { id: string; score: number | null; method: string };
export function radarScores(data: QuantResearch['factors'], report?: AnalysisReport) {
  const raw = (section: string, path: string, convert: (v: number) => number | null, formula: string) => {
    const value = numeric(report, section, path), score = value == null ? null : convert(value);
    return value == null || score == null ? missing('Thiếu hoặc không hợp lệ chỉ số gốc') : result(value, score, formula);
  };
  const scores: Record<string, RadarValue> = {
    sharpe: raw('statistics','stats.sharpe',sharpeScore,'Sharpe <0: <50 điểm; 0–2: 50–70; >2: >70. Dùng Sharpe gốc, không dùng z-score.'),
    cmf: raw('technical','flow.cmf',cmfScore,'CMF <0: <50 điểm; 0–0,1: 50–70; >0,1: >70.'),
    trend_quality: raw('technical','trend.er',trendScore,'ER <0,3: nhiễu; 0,3–0,6: vừa; >0,6: sạch; >0,8: rất hiếm. Độ sạch không xác định hướng tăng/giảm.'),
    hmm_regime: filteredHmmScore(report), liquidity: liquidityScore(report),
    forecast_ret: legacyFactor(data,'forecast_ret'), forecast_conf: legacyFactor(data,'forecast_conf'), vol_regime: legacyFactor(data,'vol_regime'),
  };
  // Keep the original three factor formulas, but reject stale module output.
  for (const [id, section, path] of [['forecast_ret','costs','costs'],['forecast_conf','agreement','fcast']] as const) {
    if (report && !read(report, section, path)) scores[id] = missing('Module nguồn chưa khả dụng');
  }
  if (report && !read(report,'statistics','stats')) scores.vol_regime = missing('Module nguồn chưa khả dụng');
  const mean = (ids: string[]) => ids.every(id => scores[id].score != null) ? ids.reduce((sum,id) => sum + scores[id].score!,0) / ids.length : null;
  const derived: Record<string, number | null> = {
    statistics:scores.sharpe.score, technical:mean(['cmf','trend_quality']), hmm:scores.hmm_regime.score,
    liquidity:scores.liquidity.score, costs:scores.forecast_ret.score, agreement:scores.forecast_conf.score,
    data_quality:numeric(report,'data_quality','data_quality.score'),
  };
  const supplied = scoringInputs(report)?.module_scores ?? [];
  const roots: Record<string,string[]> = {data_quality:['data_quality'],liquidity:['liquidity'],distribution:['dist'],statistics:['stats'],arima:['arima'],garch:['garch'],hmm:['hmm'],technical:['flow','trend'],context:['sector','cross_corr'],directional_alpha:['momentum_alpha','hurst','lightgbm_cross_sectional','conditional_mr'],agreement:['fcast'],simulation_risk:['simulation_risk'],costs:['costs'],trade_plan:['sl','pos']};
  const hasValues = (value:unknown):boolean => {
    if (value == null) return false;
    if (typeof value === 'number') return finite(value);
    if (typeof value !== 'object') return typeof value === 'string' || typeof value === 'boolean';
    const data=object(value);
    if(data.error||data.disabled===true||data.available===false)return false;
    return Object.entries(data).some(([key,v])=>!['reason','reason_codes','available','disabled','error'].includes(key)&&hasValues(v));
  };
  const modules: ModuleScore[] = alphaModuleIds.map(id => {
    const section = report?.sections[id];
    const clean = section?.status === 'AVAILABLE' && roots[id].some(key => hasValues(read(report,id,key)));
    const entries = supplied.filter(p => p.id === id);
    // Fixed user rules win; explicit source scores extend modules without a rule.
    const score = clean ? Object.hasOwn(derived,id) ? derived[id] : entries.length === 1 && typeof entries[0].method === 'string' && entries[0].method.trim() ? entries[0].score : null : null;
    return {id, score:finite(score) && score >= 0 && score <= 100 ? score : null, method:Object.hasOwn(derived,id) ? 'Quy tắc radar đã thống nhất' : entries[0]?.method || 'Chưa có quy tắc chấm 0–100'};
  });
  const valid = modules.filter((p): p is ModuleScore & {score:number} => p.score != null);
  const alpha = valid.length ? valid.reduce((sum,p) => sum + p.score,0) / valid.length : null;
  scores.alpha_composite = alpha == null ? missing('Chưa có module được chấm điểm hợp lệ') : result(alpha,alpha,`Trung bình cộng ${valid.length}/${modules.length} module có điểm. Mỗi module một phiếu; loại phần thiếu khỏi mẫu số, không tính Alpha, quyết định hoặc nhận định vào chính nó.`);
  return {scores, modules, coverage:{available:valid.length,total:modules.length}};
}
