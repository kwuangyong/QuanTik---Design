// Single source of truth for Quant reader terminology (G2-ux-spec 7.1, with G2-math-review corrections).
// Entries marked `legal: true` are market/legal terms: their text keeps the placeholder until verified.
// `example` is a template: `{name}` slots are filled with real numbers from the open report; drop the line if a slot is missing.
export type QuantModuleName = 'statistics' | 'distribution' | 'arima' | 'garch' | 'hmm' | 'technical' | 'directional_alpha' | 'context' | 'agreement' | 'simulation_risk' | 'costs' | 'trade_plan' | 'liquidity' | 'data_quality' | 'decision' | 'commentary';
export type GlossaryEntry = {
  id: string;
  /** Technical term as it appears in the report. */
  term: string;
  /** Plain-language name. */
  plain: string;
  /** Meaning, at most two short sentences. */
  meaning: string;
  /** Example template using `{slot}` placeholders for the report's real numbers. */
  example: string;
  /** Modules where the term appears. */
  modules: readonly QuantModuleName[];
  legal?: boolean;
};

export const LEGAL_PLACEHOLDER = '[chờ Haiku xác minh]';
export const quantModuleNames: readonly QuantModuleName[] = ['statistics', 'distribution', 'arima', 'garch', 'hmm', 'technical', 'directional_alpha', 'context', 'agreement', 'simulation_risk', 'costs', 'trade_plan', 'liquidity', 'data_quality', 'decision', 'commentary'];

const e = (id: string, term: string, plain: string, meaning: string, example: string, modules: readonly QuantModuleName[], legal = false): GlossaryEntry => legal ? { id, term, plain, meaning, example, modules, legal } : { id, term, plain, meaning, example, modules };

export const quantGlossary: readonly GlossaryEntry[] = [
  e('sharpe', 'Sharpe', 'Lợi nhuận trên mỗi đơn vị rủi ro', 'Lợi suất vượt mức tham chiếu chia cho dao động. Mốc đọc: 1 là khá, 2 là rất tốt.', 'Sharpe {sharpe}: so với mốc 1 và 2 để biết lợi suất lịch sử có đáng với mức dao động hay không.', ['statistics']),
  e('sortino', 'Sortino', 'Lợi nhuận so với dao động xấu', 'Giống Sharpe nhưng chỉ tính dao động đi xuống. Mốc đọc là 1.', 'Sortino {sortino}: so với mốc 1.', ['statistics']),
  e('max_drawdown', 'Sụt giảm tối đa', 'Mức giảm sâu nhất từ đỉnh', 'Từ đỉnh cao nhất đến đáy sau đó, trong cửa sổ quan sát.', 'Sụt giảm tối đa {max_dd_pct}%: lần giảm sâu nhất từ đỉnh trong dữ liệu đã dùng.', ['statistics']),
  e('ann_return', 'Lợi suất quy đổi năm', 'Lợi nhuận tính theo năm', 'Quy đổi từ dữ liệu quá khứ, không phải cam kết cho năm tới.', 'Lợi suất quy đổi năm {ann_return_pct}%: tính từ giai đoạn đã quan sát.', ['statistics']),
  e('ann_vol', 'Biến động năm', 'Độ rung lắc theo năm', 'Mức phân tán của lợi suất, không phải mức lỗ tối đa.', 'Biến động năm {ann_vol_pct}%: giá dao động mạnh hay nhẹ, không nói hướng.', ['statistics']),
  e('skewness', 'Độ lệch', 'Đuôi nào dài hơn', 'Âm: phía giảm có đuôi dài hơn. Dương: phía tăng dài hơn.', 'Độ lệch {skewness}: cho biết các cú giảm hay cú tăng lớn xảy ra nhiều hơn.', ['distribution']),
  e('excess_kurtosis', 'Độ nhọn dư', 'Độ dày đuôi', 'Trên 0 nghĩa là cú tăng giảm lớn xảy ra nhiều hơn phân phối chuẩn.', 'Độ nhọn dư {excess_kurtosis}: so với mốc 0 của phân phối chuẩn.', ['distribution']),
  e('gaussian', 'Phân phối chuẩn (Gaussian)', 'Hình chuông chuẩn', 'Mốc so sánh quen thuộc; thị trường thường lệch khỏi nó.', 'Báo cáo kiểm tra lợi suất có giống hình chuông chuẩn không: {gaussian_verdict}.', ['distribution']),
  e('var_cvar', 'VaR / CVaR', 'Mức lỗ ở đuôi', 'VaR: mức lỗ không bị vượt với xác suất và kỳ đã chọn. CVaR: lỗ trung bình khi đã vượt VaR. Báo cáo hiện chưa công bố hai số này.', 'Nếu VaR 95% là 3%: trong 95 trong 100 kỳ, mức lỗ không vượt 3%. Đây là ví dụ minh họa, không phải số của báo cáo.', ['distribution']),
  e('arima', 'ARIMA', 'Mô hình đọc quán tính của chuỗi', 'Dùng quá khứ của chuỗi để dự báo bước kế tiếp.', 'Mô hình ARIMA {order} cho giá dự báo {forecast_price}.', ['arima']),
  e('adf_p', 'ADF p-value', 'Kiểm tra chuỗi có ổn định không', 'Dưới 0,05 thì ủng hộ chuỗi ổn định. Không phải xác suất mô hình đúng.', 'ADF p-value {adf_p}: so với mốc 0,05.', ['arima']),
  e('stationarity', 'Tính dừng', 'Chuỗi không trôi theo thời gian', 'Điều kiện để mô hình ARIMA hoạt động tốt.', 'Chuỗi {stationary_verdict} theo kiểm tra ADF của báo cáo.', ['arima']),
  e('aic_bic', 'AIC / BIC', 'Điểm so sánh mô hình', 'Thấp hơn là gọn hơn khi so cùng dữ liệu. Không có mốc tốt tuyệt đối.', 'AIC {aic}: chỉ có ý nghĩa khi so với mô hình khác trên cùng dữ liệu.', ['arima']),
  e('garch', 'GARCH', 'Dự báo độ rung lắc giá', 'Biến động hôm nay phụ thuộc cú sốc và biến động hôm qua.', 'GARCH dự báo biến động {current_vol_pct}% hiện tại và các phiên tới.', ['garch']),
  e('persistence', 'Độ dai dẳng α+β', 'Cú sốc kéo dài bao lâu', 'Từ 0,9 là kéo dài; từ 1 là không có mức dài hạn ổn định.', 'α+β = {persistence}: so với mốc 0,9 và 1.', ['garch']),
  e('half_life', 'Chu kỳ bán rã', 'Số phiên để cú sốc giảm một nửa', 'Của biến động, không phải của giá.', 'Chu kỳ bán rã {half_life} phiên: sau chừng đó phiên, tác động của một cú sốc còn một nửa.', ['garch']),
  e('egarch_gamma', 'EGARCH γ', 'Giá giảm có làm rung lắc hơn không', 'γ âm: cú sốc giảm tác động mạnh hơn cú sốc tăng.', 'γ = {gamma}: dấu của γ cho biết cú sốc giảm hay tăng làm biến động mạnh hơn.', ['garch']),
  e('hmm', 'HMM', 'Trạng thái thị trường ẩn', 'Mô hình đoán thị trường đang ở pha tăng, đi ngang hay giảm.', 'Mô hình gọi phiên cuối là pha {state}, độ chắc {prob_pct}%.', ['hmm']),
  e('state_prob', 'Xác suất trạng thái', 'Độ chắc của nhãn trạng thái', 'Chưa rõ loại xác suất (lọc hay làm mượt) cho đến khi báo cáo có probability_kind. Không phải xác suất lãi.', 'Độ chắc {prob_pct}% là độ chắc của nhãn trạng thái, không phải xác suất có lãi.', ['hmm']),
  e('cmf', 'CMF', 'Dòng tiền ước lượng', 'Tính từ vị trí đóng cửa và khối lượng; trên 0 là giá đóng cửa gần đỉnh phiên hơn. Chỉ mô tả, chưa chứng minh dự báo được ngoài mẫu; không phải tiền thật.', 'CMF {cmf}: mô tả vị trí đóng cửa trong giai đoạn quan sát, không phải lời khuyên mua.', ['technical']),
  e('er', 'ER', 'Hiệu quả xu hướng', 'Từ 0,3 trở xuống là đường giá nhiều nhiễu.', 'ER {er}: so với mốc 0,3.', ['technical']),
  e('trend_r2', 'R² xu hướng', 'Độ khớp đường xu hướng', 'Gần 1 là khớp hơn, không nói hướng.', 'R² {r2}: đường giá bám đường xu hướng đến mức nào, không nói tăng hay giảm.', ['technical']),
  e('rs20', 'RS20', 'Sức mạnh 20 phiên so với VN-Index', 'Dương: lợi suất 20 phiên vượt VN-Index.', 'RS20 {rs_20d_pct}%: chênh lệch lợi suất 20 phiên so với VN-Index.', ['technical']),
  e('beta', 'Beta', 'Độ nhạy với thị trường', 'Không phải mức lợi nhuận.', 'Beta {beta}: khi thị trường đổi 1%, giá thường đổi khoảng chừng đó nhân beta.', ['technical']),
  e('momentum', 'Momentum', 'Đà giá gần đây', 'Điểm có dấu; mô tả quá khứ, chưa chứng minh dự báo được ngoài mẫu.', 'Momentum {momentum_score}: mô tả đà đã qua, không phải dự báo.', ['directional_alpha']),
  e('hurst', 'Hurst', 'Xu hướng duy trì hay đảo chiều', 'Trên 0,5 gợi ý duy trì, dưới 0,5 gợi ý đảo chiều.', 'Hurst {hurst}: so với mốc 0,5.', ['directional_alpha']),
  e('rank_in_basket', 'Vị trí trong rổ', 'Vị trí so với các mã khác', 'Không phải xác suất lãi.', 'Vị trí {rank_pct} trên 100 trong rổ so sánh.', ['directional_alpha']),
  e('alpha', 'Alpha', 'Phần lợi nhuận vượt thị trường', 'Dự báo của mô hình, chưa chắc có thật ngoài mẫu.', 'Alpha dự báo {proj_pct}%: là con số của mô hình, chưa được kiểm chứng ngoài mẫu.', ['directional_alpha']),
  e('correlation', 'Tương quan', 'Hai mã có cùng chiều không', 'Từ -1 đến +1; gần 0 không chứng minh độc lập.', 'Tương quan trung bình {avg_pairwise_corr}: các mã cùng ngành đi cùng chiều đến mức nào.', ['context']),
  e('coverage', 'Độ phủ', 'Bao nhiêu mô hình tham gia', '100% là đầy đủ theo cách tính của báo cáo.', 'Độ phủ {coverage_pct}%: phần mô hình có kết quả dùng được.', ['agreement']),
  e('agreement', 'Đồng thuận', 'Mức nhất trí giữa các mô hình', 'Không phải xác suất lãi.', 'Đồng thuận {agreement_pct}%: các mô hình cùng hướng đến mức nào.', ['agreement']),
  e('monte_carlo', 'Monte Carlo', 'Mô phỏng nhiều kịch bản giá', 'Chạy nhiều đường giá ngẫu nhiên theo giả định về dao động.', 'Trong 100 kịch bản mô phỏng, {prob_up} kịch bản có giá cuối kỳ cao hơn hôm nay.', ['simulation_risk']),
  e('percentiles', 'P05 / P50 / P95', '5 / 50 / 95 trong 100', 'P05: 5 trong 100 kịch bản thấp hơn mức này. P95: 95 trong 100 kịch bản thấp hơn mức này.', 'P05 {p05}: chỉ 5 trong 100 kịch bản đi thấp hơn mức này.', ['simulation_risk']),
  e('settlement', 'T+ (chờ cổ phiếu về)', 'Thời gian chờ thanh toán', LEGAL_PLACEHOLDER, LEGAL_PLACEHOLDER, ['simulation_risk', 'trade_plan'], true),
  e('roundtrip_cost', 'Chi phí hai chiều', 'Tổng chi phí mua và bán', `Giả định của báo cáo, có thể gồm phí, thuế, trượt giá (không tách); thực tế theo công ty chứng khoán ${LEGAL_PLACEHOLDER}.`, 'Chi phí hai chiều {roundtrip_cost_pct}%: trừ vào dự báo gộp để ra dự báo sau chi phí.', ['costs']),
  e('price_band', 'Biên độ giá', 'Giới hạn giá mỗi phiên', LEGAL_PLACEHOLDER, LEGAL_PLACEHOLDER, ['trade_plan'], true),
  e('stop_target', 'Cắt lỗ / Mục tiêu', 'Mức giá của kế hoạch', 'Điều kiện của kế hoạch, không phải dự báo sẽ chạm.', 'Cắt lỗ {sl_swing}, mục tiêu {tp1}: các mức giá của kế hoạch.', ['trade_plan']),
  e('rr', 'Tỷ lệ lãi/lỗ (R:R)', 'So lãi mục tiêu với lỗ nếu sai', 'Trước chi phí: (mục tiêu - vào) / (vào - cắt lỗ). Giá trị sau chi phí lấy nguyên từ rr_net_cost, công thức chưa công bố. Không nói xác suất chạm mức nào.', 'R:R {rr2} trước chi phí; {rr_net_cost} sau chi phí theo báo cáo.', ['trade_plan']),
  e('kelly', 'Kelly', 'Cách chia vốn theo tỷ lệ thắng và tỷ lệ lãi/lỗ', 'Chỉ hiện khi báo cáo bật; không là khuyến nghị.', 'Kelly {kelly_pct}% vốn: chỉ là một cách tính, không phải đề xuất.', ['trade_plan']),
  e('adv20', 'Giá trị giao dịch TB 20 phiên (ADV20)', 'Dòng tiền giao dịch quen thuộc', 'Thước đo độ dễ vào ra.', 'ADV20 {adv20_value_vnd} đồng mỗi phiên.', ['liquidity']),
  e('capacity', 'Sức chứa', 'Số cổ phiếu có thể giao dịch tham chiếu', 'Theo giả định nguồn, không đảm bảo có bên đối ứng.', 'Sức chứa {capacity_shares} cổ phiếu theo giả định của báo cáo.', ['liquidity']),
  e('gate', 'Cổng điều kiện', 'Các điều kiện phải đạt trước khi hành động', 'Điểm cao vẫn có thể bị chặn.', 'Điểm Quant {score}/100 nhưng cổng điều kiện {gate_pass}.', ['decision']),
  e('quant_score', 'Điểm Quant', 'Điểm xếp hạng chất lượng', 'Không phải xác suất lãi.', 'Điểm Quant {score}/100: thứ hạng chất lượng theo hệ thống.', ['decision']),
  e('data_quality', 'Chất lượng dữ liệu', 'Dữ liệu đầu vào có sạch không', 'Đạt nghĩa là qua các kiểm tra đã cài.', 'Chất lượng dữ liệu {status}, điểm {score}/100.', ['data_quality']),
];

export const glossaryById = (id: string): GlossaryEntry | undefined => quantGlossary.find(entry => entry.id === id);
/** Fill `{slot}` placeholders; returns null when any slot has no value (callers then drop the example line). */
export function fillGlossaryExample(entry: GlossaryEntry, values: Readonly<Record<string, string | number | null | undefined>>): string | null {
  let missing = false;
  const text = entry.example.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = values[key];
    if (v == null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) { missing = true; return ''; }
    return String(v);
  });
  return missing ? null : text;
}
