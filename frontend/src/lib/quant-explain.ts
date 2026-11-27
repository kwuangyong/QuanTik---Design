import { analysisReason, type AnalysisReport } from './api/analysis';
import { readDecision } from './quant-decision';
import { LEGAL_PLACEHOLDER } from './quant-glossary';
import { interpretationThresholds as limits } from './quant-interpretation-thresholds';
import { moduleAvailability, readableMetrics } from './quant-presentation';
import { actionNames, at, number, record, researchFor } from './quant-reader';
import type { GlanceTone } from './quant-glance';

// Pure view-model for the "Hiểu vì sao" (3 minute) layer of the V2 reader (G2-ux-spec 4.2, 5, 10 batch 3).
// One card per module in the 4-part frame: Kết luận / Vì sao / at most 3 figures with a reference / Lưu ý.
// Every figure is read from the published report. A tone other than "Mô tả" (neutral) or "Chưa đủ dữ liệu" (nodata)
// is only assigned where quant-interpretation-thresholds.ts (or a backend-published boolean) defines the cut-off.
// Nothing here recomputes a forecast, score or decision.
export type ExplainState = 'ready' | 'partial' | 'missing' | 'disabled';
export type ExplainNumber = { label: string; value: string; ref: string; term?: string };
export type ExplainCard = {
  module: string; no: string; title: string; tech: string; group: ExplainGroupId;
  state: ExplainState; tone: GlanceTone; chip: string; badge: string;
  verdict: string; why: string; numbers: ExplainNumber[]; caution: string;
};
export type ExplainGroupId = 'C' | 'A' | 'B' | 'D' | 'T';
export type ExplainGroup = { id: ExplainGroupId; title: string; question: string; cards: ExplainCard[] };

type Meta = { no: string; title: string; tech: string };
const meta: Record<string, Meta> = {
  garch: { no: '04', title: 'Dự báo độ rung lắc giá', tech: 'GARCH' },
  simulation_risk: { no: '10', title: 'Mô phỏng nhiều kịch bản giá', tech: 'Monte Carlo' },
  distribution: { no: '02', title: 'Hình dạng lợi suất lịch sử', tech: 'Phân phối' },
  liquidity: { no: '13', title: 'Dễ mua bán nhanh', tech: 'Thanh khoản' },
  statistics: { no: '01', title: 'Lợi nhuận trên mỗi đơn vị rủi ro', tech: 'Hiệu suất' },
  technical: { no: '06', title: 'Dòng tiền và chất lượng xu hướng', tech: 'Kỹ thuật' },
  hmm: { no: '05', title: 'Trạng thái thị trường đang là gì', tech: 'HMM' },
  context: { no: '08', title: 'So với ngành và thị trường', tech: 'Thị trường & ngành' },
  arima: { no: '03', title: 'Kiểm tra giá có ổn định hay không', tech: 'ARIMA' },
  directional_alpha: { no: '07', title: 'Đà giá và so sánh trong rổ', tech: 'Alpha có hướng' },
  agreement: { no: '09', title: 'Các mô hình có nhất trí không', tech: 'Đồng thuận' },
  trade_plan: { no: '12', title: 'Các mức giá của kế hoạch có điều kiện', tech: 'Kế hoạch vị thế' },
  costs: { no: '11', title: 'Còn lại bao nhiêu sau phí', tech: 'Chi phí' },
  decision: { no: '15', title: 'Điều kiện để hành động', tech: 'Quyết định' },
  data_quality: { no: '14', title: 'Chất lượng dữ liệu đầu vào', tech: 'Dữ liệu' },
  commentary: { no: '16', title: 'Tóm tắt bằng lời của báo cáo', tech: 'Nhận định' },
};
export const explainGroupDefs: { id: ExplainGroupId; title: string; question: string; modules: string[] }[] = [
  { id: 'C', title: 'Rủi ro', question: 'Có thể mất bao nhiêu?', modules: ['garch', 'simulation_risk', 'distribution', 'liquidity'] },
  { id: 'A', title: 'Hiện trạng', question: 'Cổ phiếu đang thế nào?', modules: ['statistics', 'technical', 'hmm', 'context'] },
  { id: 'B', title: 'Triển vọng', question: 'Giá có thể đi đâu?', modules: ['arima', 'directional_alpha', 'agreement'] },
  { id: 'D', title: 'Mua bán', question: 'Nếu hành động thì thế nào?', modules: ['trade_plan', 'costs', 'decision'] },
  { id: 'T', title: 'Có tin được báo cáo không?', question: 'Dữ liệu và tóm tắt bằng lời', modules: ['data_quality', 'commentary'] },
];
/** Tones a module may ever take, from the thresholds file (G2-ux-spec 4.1). Used by the tests as the contract. */
export const explainToneContract: Record<string, readonly GlanceTone[]> = {
  garch: ['risk', 'caution', 'neutral', 'nodata'], distribution: ['caution', 'neutral', 'nodata'], liquidity: ['ok', 'risk', 'nodata'],
  arima: ['ok', 'caution', 'neutral', 'nodata'], agreement: ['caution', 'neutral', 'nodata'], data_quality: ['ok', 'risk', 'neutral', 'nodata'],
  decision: ['ok', 'caution', 'nodata'], trade_plan: ['neutral', 'caution', 'nodata'],
  statistics: ['neutral', 'nodata'], technical: ['neutral', 'nodata'], hmm: ['neutral', 'nodata'], context: ['neutral', 'nodata'],
  directional_alpha: ['neutral', 'nodata'], simulation_risk: ['neutral', 'nodata'], costs: ['neutral', 'nodata'], commentary: ['neutral', 'nodata'],
};

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const pct = (v: number | null) => v == null ? '—' : number(v, '%');
const signedPct = (v: number | null) => v == null ? '—' : `${v > 0 ? '+' : ''}${number(v)}%`;
const vnd = (v: number | null) => v == null ? '—' : Math.abs(v) >= 1e9 ? `${number(Math.round(v / 1e8) / 10)} tỷ` : number(v);
const vs = (v: number, ref: number) => v > ref ? 'trên' : v < ref ? 'dưới' : 'bằng';
const row = (label: string, value: string, ref = '', term?: string): ExplainNumber => ({ label, value, ref, ...(term ? { term } : {}) });
const NOT_PROVEN = 'Chưa chứng minh dự báo được ngoài mẫu.';

type Built = { tone: GlanceTone; chip: string; badge?: string; verdict: string; why: string; numbers: ExplainNumber[]; caution: string };
type Ctx = { report: AnalysisReport; get: (path: string) => unknown; n: (path: string) => number | null; s: (path: string) => string | null; b: (path: string) => boolean | null };
const chips: Record<GlanceTone, string> = { ok: 'Ổn theo mốc', neutral: 'Mô tả', caution: 'Thận trọng', risk: 'Rủi ro cao', nodata: 'Chưa đủ dữ liệu' };
const NEED = 'Chưa đủ số liệu để nêu kết luận cho module này.';
const needMore = (numbers: ExplainNumber[], caution: string): Built => ({ tone: 'nodata', chip: chips.nodata, verdict: NEED, why: 'Báo cáo chưa công bố đủ các số cần thiết cho module này.', numbers, caution });

const builders: Record<string, (c: Ctx) => Built> = {
  garch(c) {
    const p = c.n('garch.garch.persistence'), vol = c.n('garch.garch.current_vol_pct'), half = c.n('garch.garch.half_life');
    const numbers = [row('Biến động hiện tại', vol == null ? '—' : `${number(vol)} %/phiên`, '', 'garch'), row('Dai dẳng α+β', number(p), `mốc ${number(limits.garch.persistent)} và ${number(limits.garch.stationaryLimit)}`, 'persistence'), row('Chu kỳ bán rã', p != null && p > 0 && p < limits.garch.stationaryLimit && half != null ? `${number(half)} phiên` : 'không xác định', 'của dao động', 'half_life')];
    const caution = 'Đây là độ lớn dao động, không cho biết giá lên hay xuống.';
    if (p == null) return needMore(numbers, caution);
    const level = vol == null ? 'Giá dao động' : `Giá đang dao động khoảng ${number(vol)}% mỗi phiên`;
    if (p >= limits.garch.stationaryLimit) return { tone: 'risk', chip: chips.risk, verdict: 'Mô hình không cho kết luận ổn định về độ rung lắc dài hạn.', why: `Chỉ số dai dẳng α+β là ${number(p)}, từ mốc ${number(limits.garch.stationaryLimit)} trở lên: không có mức dao động dài hạn ổn định.`, numbers, caution };
    if (p >= limits.garch.persistent) return { tone: 'caution', chip: chips.caution, verdict: `${level} và cú sốc có thể kéo dài.`, why: `Chỉ số dai dẳng α+β là ${number(p)}, trên mốc tham khảo ${number(limits.garch.persistent)}. Nghĩa là cú sốc dao động hôm nay còn ảnh hưởng vài phiên sau.`, numbers, caution };
    if (p > 0) return { tone: 'neutral', chip: chips.neutral, verdict: `${level} và cú sốc thường lắng nhanh hơn.`, why: `Chỉ số dai dẳng α+β là ${number(p)}, dưới mốc tham khảo ${number(limits.garch.persistent)}. Nghĩa là cú sốc dao động hôm nay ít kéo dài.`, numbers, caution };
    return { tone: 'neutral', chip: chips.neutral, verdict: `${level}; chưa đủ căn cứ để nói cú sốc kéo dài bao lâu.`, why: `Chỉ số dai dẳng α+β là ${number(p)}, không dương nên chưa đọc được thời gian lắng của cú sốc.`, numbers, caution };
  },
  simulation_risk(c) {
    const up = c.n('simulation_risk.mc.prob_up'), h = c.n('simulation_risk.horizon'), lock = c.n('simulation_risk.lock_risk.prob_loss_gt_3pct'), dd = c.n('simulation_risk.lock_risk.max_dd_lock_pct');
    const sims = researchFor(c.report).simulation_count, hasSims = finite(sims) && sims > 0 && Number.isInteger(sims);
    const upOk = up != null && up >= 0 && up <= 100, lockOk = lock != null && lock >= 0 && lock <= 100;
    const numbers = [row('Giá cuối kỳ cao hơn', upOk ? `${Math.round(up)}/100` : '—', `mốc ${limits.simulation_risk.balancedUpPct}`, 'monte_carlo'), row('Sụt giảm khi chờ (mô phỏng)', pct(dd), '', 'settlement'), row('Lỗ trên 3% khi chờ', lockOk ? `${Math.round(lock)}/100` : '—', hasSims ? `từ ${sims.toLocaleString('vi-VN')} lần mô phỏng` : '')];
    const caution = 'Mô phỏng dựa trên giả định về dao động quá khứ, không phải lời hứa; giá thật có thể ra ngoài dải.';
    if (!upOk) return needMore(numbers, caution);
    const r = Math.round(up);
    const lockText = lockOk ? ` Khoảng ${Math.round(lock) === 0 && lock > 0 ? 'ít hơn 1' : Math.round(lock)} trong mỗi 100 lần${hasSims ? ` (khoảng ${Math.round(lock * sims / 100).toLocaleString('vi-VN')} trên ${sims.toLocaleString('vi-VN')} lần mô phỏng)` : ''} lỗ hơn 3% khi chờ cổ phiếu về tài khoản (${LEGAL_PLACEHOLDER}).` : '';
    const vol = c.s('simulation_risk.mc.vol_source');
    return { tone: 'neutral', chip: chips.neutral,
      verdict: `Khoảng ${r} trong mỗi 100 lần${hasSims ? ` (từ ${sims.toLocaleString('vi-VN')} lần mô phỏng)` : ''}, giá${h != null ? ` sau ${number(h)} phiên` : ' cuối kỳ'} cao hơn hôm nay; khoảng ${100 - r} lần thấp hơn hoặc bằng.`,
      why: `${vol ? `Mô phỏng dùng biến động ${vol}.` : 'Mô phỏng dùng giả định biến động của báo cáo.'}${lockText}`, numbers, caution };
  },
  distribution(c) {
    const kurt = c.n('dist.excess_kurtosis'), skew = c.n('dist.skewness'), gauss = c.b('dist.verdict.is_gaussian');
    const numbers = [row('Độ nhọn dư', number(kurt), `mốc ${number(limits.distribution.normalExcessKurtosis)}`, 'excess_kurtosis'), row('Độ lệch', number(skew), `mốc ${number(limits.distribution.symmetric)}`, 'skewness'), row('Giống phân phối chuẩn?', gauss == null ? '—' : gauss ? 'Có' : 'Không', '', 'gaussian')];
    const caution = 'Báo cáo chưa có VaR/CVaR lịch sử, nên chưa đo được mức lỗ ở đuôi.';
    if (kurt == null && skew == null && gauss == null) return needMore(numbers, caution);
    const fat = kurt != null && kurt > limits.distribution.normalExcessKurtosis;
    const whyParts = [kurt == null ? '' : `Độ nhọn dư ${number(kurt)}, ${vs(kurt, limits.distribution.normalExcessKurtosis)} mốc ${number(limits.distribution.normalExcessKurtosis)} của phân phối chuẩn.`,
      skew == null ? '' : skew < limits.distribution.symmetric ? `Độ lệch ${number(skew)} nghĩa là phía giảm có đuôi dài hơn.` : skew > limits.distribution.symmetric ? `Độ lệch ${number(skew)} nghĩa là phía tăng có đuôi dài hơn.` : `Độ lệch ${number(skew)} nghĩa là hai phía cân xứng.`].filter(Boolean).join(' ');
    if (fat) return { tone: 'caution', chip: chips.caution, verdict: 'Lợi suất quá khứ có đuôi dày: các cú tăng giảm lớn xảy ra nhiều hơn mức bình thường.', why: whyParts, numbers, caution };
    if (gauss === false) return { tone: 'caution', chip: chips.caution, verdict: 'Lợi suất quá khứ không giống phân phối chuẩn theo kiểm tra của báo cáo.', why: whyParts || 'Kiểm tra của báo cáo cho thấy hình dạng khác phân phối chuẩn.', numbers, caution };
    return { tone: 'neutral', chip: chips.neutral, verdict: 'Lợi suất quá khứ không lệch rõ khỏi phân phối chuẩn theo các chỉ số của báo cáo.', why: whyParts || 'Báo cáo chưa công bố đủ chỉ số hình dạng.', numbers, caution };
  },
  liquidity(c) {
    const pass = c.b('liquidity.pass'), adv = c.n('liquidity.adv20_value_vnd'), ratio = c.n('liquidity.value_ratio_5_20'), cap = c.n('liquidity.capacity_shares');
    const numbers = [row('Giao dịch TB 20 phiên', vnd(adv), 'VND', 'adv20'), row('Tỷ lệ 5/20 phiên', ratio == null ? '—' : `${number(ratio)}x`, `mốc ${limits.liquidity.unchangedVolumeRatio}`), row('Sức chứa tham chiếu', number(cap), 'cổ phiếu, cơ sở theo báo cáo', 'capacity')];
    const caution = 'Giao dịch nhiều không có nghĩa tiền đang vào ròng; lệnh lớn vẫn có thể trượt giá.';
    if (pass == null) return needMore(numbers, caution);
    const why = [adv == null ? '' : `Giá trị giao dịch trung bình 20 phiên khoảng ${vnd(adv)} đồng.`, ratio == null ? '' : ratio === limits.liquidity.unchangedVolumeRatio ? `Nhịp gần đây bằng nền (mốc ${limits.liquidity.unchangedVolumeRatio}).` : `Nhịp gần đây ${ratio > 1 ? 'cao' : 'thấp'} hơn nền ${number(ratio)} lần (mốc ${limits.liquidity.unchangedVolumeRatio}).`].filter(Boolean).join(' ') || 'Báo cáo chưa công bố giá trị giao dịch.';
    return pass ? { tone: 'ok', chip: 'Đạt thanh khoản', verdict: 'Cổ phiếu đạt điều kiện thanh khoản của báo cáo.', why, numbers, caution }
      : { tone: 'risk', chip: 'Chưa đạt thanh khoản', verdict: 'Cổ phiếu chưa đạt điều kiện thanh khoản; vào ra lệnh lớn có thể khó.', why, numbers, caution };
  },
  statistics(c) {
    const sh = c.n('stats.sharpe'), ret = c.n('stats.ann_return_pct'), dd = c.n('stats.max_dd_pct');
    const numbers = [row('Lợi suất quy đổi năm', pct(ret), '', 'ann_return'), row('Sụt giảm tối đa', pct(dd), '', 'max_drawdown'), row('Sharpe', number(sh), `mốc ${limits.statistics.sharpeFair} và ${limits.statistics.sharpeStrong}`, 'sharpe')];
    const caution = 'Đây là quá khứ, không đảm bảo năm tới.';
    if (sh == null) return needMore(numbers, caution);
    const verdict = sh >= limits.statistics.sharpeStrong ? 'Giai đoạn quan sát cho lợi nhuận rất tốt theo mốc đọc so với mức dao động đã chịu.' : sh >= limits.statistics.sharpeFair ? 'Giai đoạn quan sát cho lợi nhuận khá so với mức dao động đã chịu.' : sh > 0 ? 'Lợi nhuận so với mức dao động đã chịu còn hạn chế.' : 'Lợi nhuận không vượt mức tham chiếu sau khi tính dao động.';
    const band = sh >= limits.statistics.sharpeStrong ? `từ mốc rất tốt (${limits.statistics.sharpeStrong}) trở lên` : sh >= limits.statistics.sharpeFair ? `giữa mốc khá (${limits.statistics.sharpeFair}) và rất tốt (${limits.statistics.sharpeStrong})` : sh > 0 ? `dưới mốc khá (${limits.statistics.sharpeFair})` : 'không dương';
    const ddText = dd != null && dd <= 0 && dd >= -100 ? ` Sụt giảm sâu nhất là ${number(dd)}%: mỗi 100 đồng ở đỉnh từng còn khoảng ${number(Math.round((100 + dd) * 10) / 10)} đồng ở đáy.` : '';
    return { tone: 'neutral', chip: chips.neutral, verdict, why: `Sharpe ${number(sh)}, ${band}.${ddText}`, numbers, caution };
  },
  technical(c) {
    const cmf = c.n('flow.cmf'), er = c.n('trend.er'), rs = c.n('alpha.cross_sectional.rs_20d_pct');
    const numbers = [row('Dòng tiền CMF', number(cmf), `mốc ${limits.technical.neutralFlow}`, 'cmf'), row('Hiệu quả xu hướng ER', number(er), `mốc ${number(limits.technical.noisyER)}`, 'er'), row('Sức mạnh 20 phiên so VN-Index', signedPct(rs), '', 'rs20')];
    const caution = `CMF ước lượng từ giá và khối lượng, không phải tiền nạp rút thật. ${NOT_PROVEN}`;
    const badge = 'Mô tả, chưa kiểm chứng ngoài mẫu';
    if (cmf == null && er == null) return { ...needMore(numbers, caution), badge };
    const noisy = er != null && er <= limits.technical.noisyER;
    const parts = [cmf == null ? '' : cmf > limits.technical.neutralFlow ? 'CMF dương' : cmf < limits.technical.neutralFlow ? 'CMF âm' : 'CMF bằng 0', er == null ? '' : noisy ? 'đường giá còn nhiều nhiễu' : 'đường giá khá rõ hướng'].filter(Boolean);
    const why = [cmf == null ? '' : `CMF ${number(cmf)}, ${vs(cmf, limits.technical.neutralFlow)} ${limits.technical.neutralFlow}: giá đóng cửa ${cmf > 0 ? 'gần đỉnh' : cmf < 0 ? 'gần đáy' : 'ở giữa'} phiên hơn.`, er == null ? '' : `ER ${number(er)} ${noisy ? 'từ' : 'trên'} mốc nhiễu ${number(limits.technical.noisyER)}${noisy ? ' trở xuống' : ''}.`, 'Chỉ mô tả quá khứ.'].filter(Boolean).join(' ');
    return { tone: 'neutral', chip: chips.neutral, badge, verdict: `Trong giai đoạn quan sát, ${parts.join(' và ')}. Chỉ mô tả, ${NOT_PROVEN.charAt(0).toLowerCase()}${NOT_PROVEN.slice(1)}`, why, numbers, caution };
  },
  hmm(c) {
    const fallback = c.s('hmm.method') === 'fallback', cur = c.s('hmm.current'), p = c.n('hmm.prob_pct');
    const kind = c.s('hmm.probability_kind');
    const badge = kind === 'filtered' ? 'Xác suất lọc' : kind === 'smoothed' ? 'Xác suất làm mượt' : 'Chưa rõ loại xác suất (lọc/làm mượt)';
    const prob = (key: string) => fallback ? null : c.n(`hmm.state_probs.${key}`);
    const numbers = [row('Pha tăng', pct(prob('BULL')), '', 'state_prob'), row('Đi ngang', pct(prob('SIDEWAY'))), row('Pha giảm', pct(prob('BEAR')))];
    const caution = `Đây là độ chắc của việc gọi tên trạng thái, không phải xác suất lãi, và không dùng để ra lệnh. ${NOT_PROVEN}`;
    if (fallback) return { tone: 'nodata', chip: 'Đang dùng phương pháp thay thế', badge, verdict: 'Mô hình HMM chưa chạy được nên báo cáo dùng phương pháp thay thế; không có xác suất trạng thái.', why: 'Các xác suất còn sót lại không được coi là kết quả của mô hình đã khớp.', numbers, caution };
    const label = ({ BULL: 'pha tăng', BEAR: 'pha giảm', SIDEWAY: 'pha đi ngang' } as Record<string, string>)[cur ?? ''];
    if (!label || p == null) return { ...needMore(numbers, caution), badge };
    const others = [['đi ngang', prob('SIDEWAY')], ['giảm', prob('BEAR')]] as const;
    return { tone: 'neutral', chip: chips.neutral, badge, verdict: `Mô hình gọi trạng thái hiện tại là ${label}, độ chắc ${number(p)}%. Chỉ mô tả.`,
      why: `${kind === 'filtered' || kind === 'smoothed' ? '' : 'Chưa rõ loại xác suất (lọc/làm mượt). '}${number(p)}% ${p > limits.hmm.majorityPct ? 'vượt' : 'chưa vượt'} một nửa (mốc ${limits.hmm.majorityPct}%)${others.filter(([, v]) => v != null).map(([t, v]) => `; ${t} ${number(v)}%`).join('')}.`, numbers, caution };
  },
  context(c) {
    const name = c.s('sector.name'), label = c.s('sector.trend.trend_label'), corr = c.n('cross_corr.avg_pairwise_corr'), r20 = c.n('sector.trend.ret_20D_pct');
    const numbers = [row('Ngành', name ?? '—'), row('Xu hướng ngành', label ?? '—'), row('Tương quan TB', number(corr), `mốc ${limits.context.independentCorrelation}`, 'correlation')];
    const caution = 'Tương quan cao nghĩa là các mã lên xuống cùng nhau, nên đa dạng hóa trong ngành giúp ít.';
    if (!name && !label && corr == null) return needMore(numbers, caution);
    const head = name && label ? `Ngành ${name} đang ở xu hướng ${label.toLowerCase()}` : name ? `Cổ phiếu thuộc ngành ${name}` : label ? `Ngành đang ở xu hướng ${label.toLowerCase()}` : 'Báo cáo chưa nêu ngành';
    const tail = corr == null ? '.' : corr > limits.context.independentCorrelation ? ', và các mã trong ngành khá cùng chiều.' : corr < limits.context.independentCorrelation ? ', và các mã trong ngành có xu hướng ngược chiều.' : ', và các mã trong ngành không cùng chiều rõ rệt.';
    const why = [corr == null ? '' : `Tương quan trung bình giữa các mã là ${number(corr)}, ${vs(corr, limits.context.independentCorrelation)} mốc ${limits.context.independentCorrelation}.`, r20 == null ? '' : `Ngành ${r20 >= 0 ? 'tăng' : 'giảm'} ${number(Math.abs(r20))}% trong 20 phiên.`].filter(Boolean).join(' ') || 'Báo cáo chưa công bố tương quan hoặc diễn biến ngành.';
    return { tone: 'neutral', chip: chips.neutral, verdict: head + tail, why, numbers, caution };
  },
  arima(c) {
    const p = c.n('arima.stationarity.adf_p'), stationary = c.b('arima.stationarity.stationary'), order = c.get('arima.best.order'), prices = c.get('arima.forecast.prices');
    const orderText = Array.isArray(order) && order.length > 0 && order.every(finite) ? `(${order.join(', ')})` : '—';
    const list = Array.isArray(prices) ? prices.filter(finite) : [];
    const numbers = [row('ADF p-value', number(p), `mốc ${number(limits.arima.adfSignificance)}`, 'adf_p'), row('Cấu hình', orderText), row(list.length ? `Dự báo ${list.length} phiên` : 'Dự báo', list.length ? (list.length > 1 ? `${number(list[0])} đến ${number(list[list.length - 1])}` : number(list[0])) : '—', list.length ? 'VND' : 'chưa có chuỗi dự báo')];
    const caution = 'ARIMA là chẩn đoán tham khảo; đường dự báo không phải giá sẽ đi theo, và AIC thấp không có nghĩa mô hình đúng.';
    if (p == null && stationary == null) return needMore(numbers, caution);
    const cfg = orderText === '—' ? '' : ` Mô hình chọn cấu hình ${orderText}.`;
    if (p != null && p < limits.arima.adfSignificance && stationary === true) return { tone: 'ok', chip: 'Đạt mốc ADF', verdict: `ADF p ${number(p)} bác bỏ giả thuyết chuỗi không ổn định ở mức 5%. Đây là chẩn đoán, không phải dự báo.`, why: `ADF p-value ${number(p)}, dưới mốc ${number(limits.arima.adfSignificance)}.${cfg}`, numbers, caution };
    if (stationary === false || (p != null && p >= limits.arima.adfSignificance)) return { tone: 'caution', chip: 'Chưa đạt mốc ADF', verdict: `Chuỗi chưa đạt mốc ổn định của kiểm tra ADF${p != null ? ` (p ${number(p)}, mốc ${number(limits.arima.adfSignificance)})` : ''}. Đây là chẩn đoán, không phải dự báo.`, why: `${p != null ? `ADF p-value ${number(p)}, ${p >= limits.arima.adfSignificance ? 'từ' : 'dưới'} mốc ${number(limits.arima.adfSignificance)}.` : 'Báo cáo ghi chuỗi chưa ổn định.'}${cfg}`, numbers, caution };
    return { tone: 'neutral', chip: chips.neutral, verdict: 'Kết quả kiểm tra tính ổn định chưa đầy đủ. Đây là chẩn đoán, không phải dự báo.', why: `${p != null ? `ADF p-value ${number(p)}.` : 'Chưa có ADF p-value.'}${cfg}`, numbers, caution };
  },
  directional_alpha(c) {
    const score = c.n('momentum_alpha.score'), hurst = c.n('hurst.hurst'), lgbm = c.b('lightgbm_cross_sectional.available'), rank = c.n('lightgbm_cross_sectional.rank_pct'), proj = c.n('lightgbm_cross_sectional.proj_pct');
    const numbers = [row('Điểm động lượng', number(score), `mốc ${number(limits.directional_alpha.neutralMomentum)}`, 'momentum'), row('Hurst', number(hurst), `mốc ${number(limits.directional_alpha.randomHurst)}`, 'hurst'), row('Vị trí trong rổ', lgbm === true && rank != null ? `${number(rank)}/100` : '—', 'không phải xác suất lãi', 'rank_in_basket')];
    const conflict = score != null && proj != null && score * proj < 0;
    const caution = `Thứ hạng không phải xác suất lãi, và động lượng không phải lý do mua.${conflict ? ' LightGBM trái chiều với đà gần đây.' : ''}`;
    const badge = 'Mô tả, chưa kiểm chứng ngoài mẫu';
    if (score == null && hurst == null) return { ...needMore(numbers, caution), badge };
    const mom = score == null ? '' : `Điểm động lượng ${number(score)} (${score > 0 ? 'dương' : score < 0 ? 'âm' : 'bằng 0'}), chỉ mô tả quá khứ. ${NOT_PROVEN}`;
    const hu = hurst == null ? '' : `Hurst ${number(hurst)} ${vs(hurst, limits.directional_alpha.randomHurst)} mốc ${number(limits.directional_alpha.randomHurst)}${hurst > limits.directional_alpha.randomHurst ? ', gợi ý xu hướng có tính duy trì' : hurst < limits.directional_alpha.randomHurst ? ', gợi ý giá hay quay lại mức cũ' : ', gợi ý chuỗi gần như ngẫu nhiên'}.`;
    const mw = score == null ? '' : `Điểm động lượng ${number(score)} ${vs(score, limits.directional_alpha.neutralMomentum)} mốc ${number(limits.directional_alpha.neutralMomentum)}.`;
    return { tone: 'neutral', chip: chips.neutral, badge, verdict: mom || `Hurst ${number(hurst)} chỉ mô tả cấu trúc chuỗi. ${NOT_PROVEN}`, why: [mw, hu].filter(Boolean).join(' '), numbers, caution };
  },
  agreement(c) {
    const ret = c.n('fcast.ensemble_ret_pct'), h = c.n('fcast.horizon'), agree = c.n('fcast.agreement_pct'), cov = c.n('fcast.coverage_pct');
    const numbers = [row(h != null ? `Dự báo tổng hợp ${number(h)} phiên` : 'Dự báo tổng hợp', signedPct(ret), 'trước chi phí', 'agreement'), row('Đồng thuận', pct(agree), '', 'agreement'), row('Độ phủ', pct(cov), `mốc ${limits.agreement.fullCoveragePct}`, 'coverage')];
    const caution = 'Nhất trí không phải xác suất lãi; các mô hình dùng chung dữ liệu nên bằng chứng không độc lập.';
    if (cov == null) return needMore(numbers, caution);
    const forecast = ret == null ? 'Báo cáo chưa công bố dự báo tổng hợp' : `Dự báo tổng hợp ${signedPct(ret)}${h != null ? ` trong ${number(h)} phiên` : ''}`;
    const full = cov >= limits.agreement.fullCoveragePct;
    return { tone: full ? 'neutral' : 'caution', chip: full ? chips.neutral : chips.caution, verdict: full ? `${forecast}, với đủ mô hình tham gia.` : `${forecast}, nhưng mới ${number(cov)}% mô hình tham gia.`,
      why: `${agree == null ? '' : `Mức đồng thuận ${number(agree)}%. `}Độ phủ ${number(cov)}% ${full ? 'nghĩa là đủ mô hình tham gia theo cách tính của báo cáo' : 'nghĩa là còn mô hình chưa tham gia'}.`, numbers, caution };
  },
  trade_plan(c) {
    const entry = c.n('sl.entry'), sl = c.n('sl.sl_swing'), tp1 = c.n('sl.tp1'), tp2 = c.n('sl.tp2'), rr = c.n('sl.rr2'), rrNet = c.n('sl.rr_net_cost');
    const risk = c.n('pos.risk_pct_nav'), maxLoss = c.n('pos.max_loss');
    const lossText = risk != null ? `${number(risk)}% tài sản` : maxLoss != null ? `${number(maxLoss)} VND` : '—';
    const numbers = [row('Lỗ ước tính tại cắt lỗ', lossText, risk != null && maxLoss != null ? `${number(maxLoss)} VND` : 'nếu kế hoạch sai', 'stop_target'), row('Giá vào', number(entry), 'VND'), row('Mục tiêu 1 và 2', tp1 != null && tp2 != null ? `${number(tp1)} / ${number(tp2)}` : '—', 'VND')];
    const caution = `Cắt lỗ không đảm bảo bán được đúng giá khi giá nhảy hoặc thanh khoản thấp. Biên độ giá và thời gian chờ cổ phiếu về: ${LEGAL_PLACEHOLDER}.`;
    if (entry == null || sl == null || tp1 == null || tp2 == null) return needMore(numbers, caution);
    const ordered = sl > limits.trade_plan.minPrice && sl < entry && entry < tp1 && tp1 <= tp2;
    if (!ordered) return { tone: 'caution', chip: chips.caution, verdict: 'Chưa tạo thành kế hoạch hợp lệ: các mức giá không theo thứ tự cắt lỗ, giá vào, mục tiêu.', why: `Báo cáo ghi cắt lỗ ${number(sl)}, giá vào ${number(entry)}, mục tiêu ${number(tp1)} và ${number(tp2)}.`, numbers, caution };
    const rrText = rr != null && rr > 0 ? ` Tỷ lệ lời/lỗ (R:R) tới mục tiêu 2 là ${number(rr)}, nghĩa là lời tiềm năng gấp ${number(rr)} lần lỗ tối đa, chưa tính chi phí.` : '';
    const net = rrNet != null && rrNet > 0 ? ` Báo cáo ghi ${number(rrNet)} sau chi phí; công thức chưa công bố.` : '';
    return { tone: 'neutral', chip: chips.neutral, verdict: risk != null || maxLoss != null ? `Kế hoạch có điều kiện: nếu vào ở ${number(entry)} và kế hoạch sai, lỗ ước tính khoảng ${risk != null ? `${number(risk)}% tài sản` : `${number(maxLoss)} VND`}${risk != null && maxLoss != null ? ` (${number(maxLoss)} VND)` : ''}.` : `Kế hoạch có điều kiện: vào ở ${number(entry)}, cắt lỗ ${number(sl)}, mục tiêu ${number(tp1)} và ${number(tp2)}.`,
      why: `Cắt lỗ ${number(sl)}, mục tiêu ${number(tp1)} và ${number(tp2)}.${rrText}${net}`, numbers, caution };
  },
  costs(c) {
    const gross = c.n('costs.gross_forecast_pct'), rt = c.n('costs.roundtrip_cost_pct'), net = c.n('costs.net_forecast_pct');
    const numbers = [row('Trước phí', signedPct(gross), '', 'agreement'), row('Chi phí hai chiều', pct(rt), '', 'roundtrip_cost'), row('Sau phí', signedPct(net), `mốc ${limits.costs.breakEvenPct}`)];
    const caution = `Mức phí và thuế thực tế khác theo công ty chứng khoán: ${LEGAL_PLACEHOLDER}.`;
    if (gross == null || net == null) return needMore(numbers, caution);
    return { tone: 'neutral', chip: chips.neutral, verdict: `Dự báo gộp ${number(gross)}%, trừ phí còn ${number(net)}%.`,
      why: `${rt == null ? 'Chi phí hai chiều chưa công bố. ' : `Chi phí hai chiều là ${number(rt)}% theo giả định của báo cáo. `}Sau phí là ${signedPct(net)}, ${vs(net, limits.costs.breakEvenPct)} mốc hòa vốn ${limits.costs.breakEvenPct}. Dự báo dương không bảo đảm có lãi.`, numbers, caution };
  },
  decision(c) {
    const d = readDecision(c.report), score = c.n('rec.score');
    const yn = (v: boolean | null) => v == null ? '—' : v ? 'Có' : 'Không';
    const numbers = [row('Điểm Quant', score != null ? `${number(score)}/100` : '—', 'không phải xác suất lãi', 'quant_score'), row('Cổng điều kiện', yn(d.gatePass), '', 'gate'), row('Đủ điều kiện thực thi', yn(d.executable))];
    const caution = 'Điểm cao chỉ là thứ hạng của mô hình, không phải lý do để mua.';
    if (!d.action) return needMore(numbers, caution);
    const name = d.action === 'BUY_NOW' && d.executable !== true ? 'Mô hình: chờ đủ điều kiện' : actionNames[d.action] || 'Mô hình: chưa có nhãn';
    const reasons = d.reasonCodes.map(code => analysisReason(code)).join(' ');
    const state = d.executable === true ? 'Báo cáo xác nhận các điều kiện thực thi đã đạt.' : d.executable === false ? 'Chưa đủ điều kiện thực thi.' : 'Chưa xác nhận điều kiện thực thi.';
    const why = d.executable === true ? state : reasons || 'Báo cáo chưa công bố lý do cụ thể.';
    const tone: GlanceTone = d.executable === true ? 'ok' : d.executable === false ? 'caution' : 'nodata';
    return { tone, chip: d.executable === true ? 'Đủ điều kiện thực thi' : d.executable === false ? 'Chờ hoàn tất điều kiện' : chips.nodata, verdict: `${name}. ${state}`, why, numbers, caution };
  },
  data_quality(c) {
    const status = c.s('data_quality.status'), score = c.n('data_quality.score'), warnings = c.report.warnings.length;
    const numbers = [row('Trạng thái', status === 'PASS' ? 'Đạt' : status === 'FAIL' ? 'Chưa đạt' : status ?? '—', '', 'data_quality'), row('Điểm', score != null ? `${number(score)}/100` : '—', `thang ${limits.data_quality.minScore} đến ${limits.data_quality.maxScore}`), row('Số cảnh báo', String(warnings), '')];
    const caution = 'Điểm chấm dữ liệu đầu vào, không chấm chất lượng cổ phiếu.';
    if (!status) return needMore(numbers, caution);
    const why = 'Qua kiểm tra nghĩa là đã đúng các quy tắc đã cài, không chứng minh mọi lỗi đã được bắt.';
    const badge = warnings > 0 ? `Có ${warnings} cảnh báo` : undefined;
    const sc = score != null ? `, điểm ${number(score)} trên ${limits.data_quality.maxScore}` : '';
    if (status === 'PASS') return { tone: 'ok', chip: 'Đạt', ...(badge ? { badge } : {}), verdict: `Dữ liệu qua các kiểm tra của hệ thống${sc}.`, why, numbers, caution };
    if (status === 'FAIL') return { tone: 'risk', chip: 'Chưa đạt', ...(badge ? { badge } : {}), verdict: `Dữ liệu chưa qua các kiểm tra của hệ thống${sc}; cần đọc kết quả rất thận trọng.`, why, numbers, caution };
    return { tone: 'neutral', chip: chips.neutral, ...(badge ? { badge } : {}), verdict: `Kết quả kiểm tra dữ liệu: ${status}${sc}.`, why, numbers, caution };
  },
  commentary() { return needMore([], ''); },
};

const dataBlocked = (report: AnalysisReport) => {
  const section = report.sections.decision, out = record(record(section?.metrics).action);
  return !!section && (section.status !== 'AVAILABLE' || !!out.error || out.disabled === true || out.available === false);
};

function stateCard(name: string, state: ExplainState, report: AnalysisReport, numbers: ExplainNumber[]): ExplainCard {
  const m = meta[name], group = explainGroupDefs.find(g => g.modules.includes(name))!.id;
  const disabled = state === 'disabled';
  const code = report.sections[name]?.reason_codes?.[0];
  return { module: name, ...m, group, state, tone: 'nodata', chip: disabled ? 'Đã tắt' : chips.nodata, badge: '',
    verdict: disabled ? 'Module này đã tắt trong báo cáo.' : 'Chưa đủ dữ liệu để đọc module này.',
    why: disabled ? 'Module đã tắt nên không tính vào độ phủ và không có số liệu để giải thích.' : code ? analysisReason(code) : 'Báo cáo chưa công bố kết quả cho module này.',
    numbers: numbers.map(n => ({ ...n, value: '—', ref: '' })),
    caution: disabled ? 'Phần không có số liệu không có nghĩa là trung tính hay an toàn.' : 'Kết luận của nhóm này kém chắc hơn khi thiếu module; phần thiếu không có nghĩa là trung tính.' };
}

export function buildExplain(report: AnalysisReport): ExplainGroup[] {
  const cards: Record<string, ExplainCard> = {};
  for (const name of Object.keys(builders)) {
    if (name === 'commentary') continue;
    const section = report.sections[name], availability = moduleAvailability(name, section);
    const metrics = readableMetrics(section);
    const get = (path: string) => at(metrics, path);
    const ctx: Ctx = { report, get, n: p => finite(get(p)) ? get(p) as number : null, s: p => typeof get(p) === 'string' && (get(p) as string).trim() ? get(p) as string : null, b: p => typeof get(p) === 'boolean' ? get(p) as boolean : null };
    const built = builders[name](ctx);
    if (availability === 'Đã tắt') { cards[name] = stateCard(name, 'disabled', report, built.numbers); continue; }
    if (availability === 'Thiếu dữ liệu' || built.verdict === NEED || (name === 'decision' && dataBlocked(report))) { cards[name] = stateCard(name, 'missing', report, built.numbers); continue; }
    const group = explainGroupDefs.find(g => g.modules.includes(name))!.id;
    const partial = availability === 'Dữ liệu một phần' || built.numbers.slice(0, 3).some(n => n.value === '—');
    cards[name] = { module: name, ...meta[name], group, state: partial ? 'partial' : 'ready', tone: built.tone, chip: built.chip, badge: built.badge ?? (partial ? 'Một phần' : ''), verdict: built.verdict, why: built.why, numbers: built.numbers.slice(0, 3), caution: built.caution };
    if (partial && built.badge) cards[name].badge = `${built.badge} · Một phần`;
  }
  const cAvail = moduleAvailability('commentary', report.sections.commentary);
  cards.commentary = cAvail === 'Đã tắt' ? stateCard('commentary', 'disabled', report, commentaryRows) : cAvail === 'Thiếu dữ liệu' ? stateCard('commentary', 'missing', report, commentaryRows) : commentaryCard(report, cards);
  return explainGroupDefs.map(g => ({ id: g.id, title: g.title, question: g.question, cards: g.modules.map(name => cards[name]) }));
}

// The plain-language summary only restates other cards: no new number, and no descriptive reading (CMF, momentum, HMM) as support.
const commentaryRows = [row('Nguồn câu chữ', '', ''), row('Số mới thêm', '', ''), row('Cảnh báo', '', '')];
function commentaryCard(report: AnalysisReport, cards: Record<string, ExplainCard>): ExplainCard {
  const usable = (name: string) => cards[name] && (cards[name].state === 'ready' || cards[name].state === 'partial') && cards[name].tone !== 'nodata';
  const numbersOf = (name: string) => cards[name].numbers;
  const sentences: string[] = [], refs: string[] = [];
  const decision = usable('decision') ? cards.decision : null;
  if (decision) refs.push('decision');
  const sim = usable('simulation_risk') ? numbersOf('simulation_risk')[2] : null;
  if (sim && sim.value !== '—') { sentences.push(`Rủi ro nổi bật: ${sim.value.replace('/100', ' trong 100')} lần mô phỏng lỗ trên 3% khi chờ [${cards.simulation_risk.no}]`); refs.push('simulation_risk'); }
  const dd = usable('statistics') ? numbersOf('statistics')[1] : null;
  if (dd && dd.value !== '—') { sentences.push(`Lịch sử từng giảm sâu nhất ${dd.value.replace('-', '')} từ đỉnh [${cards.statistics.no}]`); refs.push('statistics'); }
  const net = usable('costs') ? numbersOf('costs')[2] : null;
  if (net && net.value !== '—') { sentences.push(`Dự báo sau phí ${net.value} [${cards.costs.no}]`); refs.push('costs'); }
  const base = stateCard('commentary', 'missing', report, commentaryRows);
  if (!sentences.length && !decision) return { ...base, verdict: 'Chưa đủ dữ liệu để tóm tắt bằng lời.', why: 'Các module nguồn chưa có kết quả dùng được.', caution: 'Đoạn tổng hợp chỉ dùng số liệu có trong từng module.' };
  const text = sentences.map(s => s.endsWith(']') ? s.replace(/ \[(\d+)\]$/, ' [$1].') : s).join(' ');
  return { ...base, state: 'ready', tone: 'neutral', chip: chips.neutral, badge: '',
    verdict: decision ? decision.verdict : 'Báo cáo chưa có kết luận của mô hình; dưới đây là các số đã công bố.',
    why: `${decision ? `Nhãn của mô hình lấy từ module Quyết định [${decision.no}]. ` : ''}${text ? `${text} ` : ''}${NOT_PROVEN}`,
    numbers: [row('Nguồn câu chữ', `${refs.length} module`, ''), row('Số mới thêm', '0', ''), row('Cảnh báo', String(report.warnings.length), '', 'data_quality')],
    caution: 'Đoạn tổng hợp; số liệu gốc ở từng module. Không có số nào ngoài module.' };
}
