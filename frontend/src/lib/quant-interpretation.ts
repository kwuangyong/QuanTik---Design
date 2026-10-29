import { analysisReason, type AnalysisReport } from './api/analysis';
import { actionNames, at, metricText, number, record } from './quant-reader';
import { readableMetrics } from './quant-presentation';
import { quantSummary } from './quant-summary';
import { interpretationThresholds as limits } from './quant-interpretation-thresholds';

export type ModuleAnalysis = { summary: string; details: string[] };
const missing = 'Chưa đủ dữ liệu để diễn giải';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
// Narrative uses published output and presentation-only reading references, never a new signal.
export function moduleAnalysis(name: string, input: unknown, report: AnalysisReport): ModuleAnalysis {
  const section = report.sections[name];
  if (!section || section.status !== 'AVAILABLE') return { summary: `${missing}${section?.status === 'DISABLED' ? ': module đang tắt' : ': module chưa khả dụng'}.`, details: ['Cần kết quả khả dụng của chính báo cáo này trước khi đánh giá; phần còn thiếu không phải tín hiệu trung tính.'] };
  const metrics = readableMetrics({ ...section, metrics: record(input) });
  const get = (path: string) => at(metrics, path);
  const n = (path: string) => finite(get(path)) ? get(path) as number : null;
  const v = (path: string, unit = '') => metricText(get(path), unit);
  const exists = (...paths: string[]) => paths.some(p => finite(get(p)) || typeof get(p) === 'boolean' || typeof get(p) === 'string' || Array.isArray(get(p)) && (get(p) as unknown[]).length > 0);
  const build = (summary: string, ...details: string[]): ModuleAnalysis => ({ summary, details });
  const unavailable = () => build(`${missing} cho module này.`, 'Báo cáo chưa công bố các giá trị cần thiết; cần bổ sung dữ liệu trước khi đối chiếu với quyết định giao dịch.');
  switch (name) {
    case 'statistics': {
      if (!exists('stats.sharpe', 'stats.ann_return_pct', 'stats.max_dd_pct', 'stats.sortino')) return unavailable();
      const sh = n('stats.sharpe'), dd = n('stats.max_dd_pct'), ret = n('stats.ann_return_pct'), so = n('stats.sortino');
      const sharpe = sh == null ? 'Chưa có Sharpe để đánh giá lợi nhuận so với biến động' : `Sharpe đạt ${number(sh)} (${sh >= limits.statistics.sharpeStrong ? `từ ${number(limits.statistics.sharpeStrong)} trở lên là mức rất tốt theo mốc đọc tham khảo` : sh >= limits.statistics.sharpeFair ? `từ ${number(limits.statistics.sharpeFair)} đến dưới ${number(limits.statistics.sharpeStrong)} là mức khá theo mốc đọc tham khảo` : sh > 0 ? `dương nhưng dưới mốc tham khảo ${number(limits.statistics.sharpeFair)}, hiệu quả so với biến động còn hạn chế` : sh === 0 ? 'bằng 0, chưa ghi nhận lợi nhuận vượt mức tham chiếu trên mỗi đơn vị biến động' : 'âm, lợi nhuận thấp hơn mức tham chiếu của phép tính'})`;
      return build(`${sharpe}${ret == null ? '' : `, trong khi lợi suất lịch sử quy đổi năm là ${number(ret, '%')}`}; tuy nhiên ${dd == null ? 'chưa có mức sụt giảm tối đa để đánh giá tổn thất' : `sụt giảm tối đa ${number(dd, '%')} phản ánh mức giảm sâu nhất từ một đỉnh trước đó`}. Cần đối chiếu hiệu quả này với dòng tiền và dự báo sau phí trước khi cân nhắc giao dịch.`,
        `${so == null ? 'Chưa có Sortino' : `Sortino ${number(so)} đo lợi nhuận so với biến động bất lợi; ${so >= limits.statistics.sortinoReference ? `đạt mốc tham khảo ${number(limits.statistics.sortinoReference)}` : `chưa đạt mốc tham khảo ${number(limits.statistics.sortinoReference)}`}`} ${n('stats.ann_vol_pct') == null ? 'và chưa có biến động năm.' : `trong khi biến động năm ${v('stats.ann_vol_pct', '%')} mô tả độ phân tán lợi suất, không phải mức lỗ tối đa.`} Các mốc Sharpe/Sortino chỉ giúp đọc kết quả lịch sử, còn phụ thuộc cửa sổ và cách tính của báo cáo.`,
        dd != null && dd <= 0 && dd >= -100 ? `Sụt giảm ${number(dd, '%')} có nghĩa khoản cổ phiếu trị giá 100 triệu đồng tại một đỉnh từng còn khoảng ${number(100 + dd)} triệu đồng ở đáy sau đó trong cửa sổ quan sát. Đây là minh họa mức giảm đã xảy ra, không phải mức lỗ được giới hạn cho tương lai.` : 'Chưa có mức sụt giảm hợp lệ để minh họa bằng tiền.',
        `Số quan sát ${v('n')}; khi chưa công bố số quan sát hoặc khoảng thời gian, chưa thể đánh giá độ dài mẫu. Lợi suất năm là mức quy đổi, không phải cam kết lợi nhuận một năm tới.`);
    }
    case 'distribution': {
      if (!exists('dist.verdict.is_gaussian', 'dist.skewness', 'dist.excess_kurtosis')) return unavailable();
      const skew=n('dist.skewness'), kurt=n('dist.excess_kurtosis'), normal=get('dist.verdict.is_gaussian');
      return build(`${skew == null ? 'Chưa có độ lệch' : `Độ lệch ${number(skew)} ${skew > limits.distribution.symmetric ? 'cho thấy phân phối lệch phải, với đuôi lợi suất dương dài hơn' : skew < limits.distribution.symmetric ? 'cho thấy phân phối lệch trái, với đuôi lợi suất âm dài hơn' : 'cho thấy mức bất đối xứng đo được bằng 0'}`}; ${kurt == null ? 'chưa có độ nhọn dư' : `độ nhọn dư ${number(kurt)} ${kurt > limits.distribution.normalExcessKurtosis ? 'cho thấy đuôi dày hơn phân phối chuẩn, nên cần chú ý các biến động cực đoan' : kurt < 0 ? 'thấp hơn chuẩn về độ nhọn dư, nhưng chưa đủ để kết luận rủi ro thấp' : 'bằng mốc 0 của phân phối chuẩn'}`}. ${normal === false ? 'Các kiểm tra không ủng hộ giả định Gaussian; không nên chỉ dựa vào VaR Gaussian, cần đối chiếu VaR/CVaR lịch sử và GARCH–t.' : normal === true ? 'Kiểm tra chưa bác bỏ Gaussian; vẫn cần đọc cùng rủi ro đuôi lịch sử trước khi giao dịch.' : 'Chưa có kết luận kiểm tra Gaussian; cần hoàn tất kiểm tra trước khi dùng giả định phân phối chuẩn.'}`,
        `Độ lệch ${v('dist.skewness')} mô tả sự bất đối xứng của những lợi suất đã quan sát. Đuôi dương dài hơn không chứng minh phiên tới sẽ tăng hoặc xác suất có lãi cao hơn.`,
        `Độ nhọn dư ${v('dist.excess_kurtosis')} dùng phân phối chuẩn làm mốc 0; ${kurt != null && kurt > 0 ? 'đuôi dày có thể khiến cách ước lượng rủi ro chỉ dựa vào Gaussian bỏ sót các cú tăng/giảm lớn.' : 'không nên chỉ dùng một chỉ số hình dạng để bỏ qua rủi ro cực đoan.'} Không có VaR/CVaR lịch sử thì báo cáo chưa đủ căn cứ định lượng mức tổn thất đuôi tương ứng.`);
    }
    case 'arima': {
      if (!exists('arima.best.order','arima.best.aic','arima.stationarity.adf_p','arima.stationarity.stationary')) return unavailable();
      const p=n('arima.stationarity.adf_p'), stationary=get('arima.stationarity.stationary'), order=get('arima.best.order');
      const config=Array.isArray(order) && order.every(finite) ? `(${order.join(', ')})` : v('arima.best.order');
      return build(`ARIMA chọn cấu hình ${config}, AIC ${v('arima.best.aic')} và ADF p-value ${v('arima.stationarity.adf_p')}${p == null ? '; chưa đủ kết quả kiểm tra tính dừng' : p < limits.arima.adfSignificance ? `; p-value dưới ${number(limits.arima.adfSignificance)} ủng hộ bác bỏ giả thuyết có nghiệm đơn vị trong kiểm định này` : `; p-value từ ${number(limits.arima.adfSignificance)} trở lên chưa đủ để bác bỏ giả thuyết có nghiệm đơn vị`}. ${stationary === true ? 'Báo cáo xác nhận tính dừng cho chuỗi được kiểm tra.' : stationary === false ? 'Báo cáo chưa xác nhận tính dừng.' : 'Trạng thái tính dừng chưa công bố.'} Cần xem đường dự báo và các mô hình có hướng khác, không dùng AIC làm điểm mua.`,
        `AIC ${v('arima.best.aic')} và BIC ${v('arima.best.bic')} cân bằng mức khớp dữ liệu với độ phức tạp; thấp hơn chỉ có ý nghĩa khi so các mô hình dùng cùng dữ liệu và cách tính. Không có ngưỡng AIC/BIC tuyệt đối cho một cổ phiếu tốt.`,
        `Ngưỡng ADF ${number(limits.arima.adfSignificance)} là mức ý nghĩa tham khảo cho việc đọc kiểm định, không phải xác suất mô hình đúng. Nếu chưa công bố chuỗi dự báo hoặc chẩn đoán sai số thì chưa thể kết luận hướng giá từ các kết quả trên.`);
    }
    case 'garch': {
      if (!exists('garch.garch.current_vol_pct','garch.garch.persistence','garch.garch.alpha','garch.garch.beta')) return unavailable();
      const p=n('garch.garch.persistence'), gamma=n('garch.egarch.gamma');
      return build(`Biến động hiện tại ${v('garch.garch.current_vol_pct', '%/phiên')} đo mức dao động, còn độ dai dẳng α + β = ${v('garch.garch.persistence')} ${p == null ? 'chưa đủ để đánh giá thời gian cú sốc lắng xuống' : p >= limits.garch.stationaryLimit ? 'không cho phép suy ra phương sai dài hạn ổn định theo GARCH này' : p >= limits.garch.persistent ? `từ mốc tham khảo ${number(limits.garch.persistent)} đến dưới ${number(limits.garch.stationaryLimit)}, cho thấy tác động cú sốc có xu hướng kéo dài` : p > 0 ? `dưới mốc tham khảo ${number(limits.garch.persistent)}, cho thấy tác động cú sốc giảm nhanh hơn cấu hình sát 1` : 'không thuộc miền dương để đọc bán rã theo công thức thông thường'}. Cần đối chiếu mức dao động với dừng lỗ và rủi ro T+2; đây không phải dự báo chiều tăng giá.`,
        `α = ${v('garch.garch.alpha')} thể hiện phản ứng với cú sốc mới; β = ${v('garch.garch.beta')} thể hiện ảnh hưởng của phương sai trước. ${p != null && p > 0 && p < 1 ? `Chu kỳ bán rã công bố là ${v('garch.garch.half_life',' phiên')}: thời gian để phần ảnh hưởng lên phương sai giảm một nửa theo mô hình, không phải giá hay độ biến động giảm một nửa.` : 'Chưa có điều kiện để diễn giải một chu kỳ bán rã hữu hạn.'}`,
        `EGARCH γ = ${v('garch.egarch.gamma')}${gamma == null ? '; chưa đủ dữ liệu để đọc bất đối xứng.' : gamma < 0 ? ' cho thấy cú sốc âm có tác động lên log-phương sai lớn hơn cú sốc dương cùng độ lớn theo phương trình đang dùng; chưa chứng minh ý nghĩa thống kê.' : gamma > 0 ? ' cho thấy cú sốc dương có tác động lên log-phương sai lớn hơn cú sốc âm cùng độ lớn theo phương trình đang dùng.' : ' không ghi nhận phần bất đối xứng qua hệ số này.'} Mặt 3D chỉ đổi góc nhìn các tham số đã công bố.`);
    }
    case 'hmm': {
      if (!exists('hmm.current','hmm.method','hmm.prob_pct')) return unavailable();
      const state=get('hmm.current'), label=({BULL:'pha tăng',BEAR:'pha giảm',SIDEWAY:'pha đi ngang'} as Record<string,string>)[String(state)] || 'trạng thái chưa xác định', p=n('hmm.prob_pct'), fallback=get('hmm.method')==='fallback';
      return build(`${fallback ? 'Phương pháp thay thế' : 'HMM'} đang nhận diện ${label}${p != null && !fallback ? ` với xác suất trạng thái ${number(p,'%')} (${p > limits.hmm.majorityPct ? 'vượt một nửa' : 'chưa vượt một nửa'} theo mô hình)` : '; chưa có xác suất HMM đầy đủ'}. ${state==='BULL' ? 'Bối cảnh tăng là một điểm hỗ trợ' : state==='BEAR' ? 'Bối cảnh giảm là điểm cản trở cần chú ý' : 'Bối cảnh này chưa xác nhận một xu hướng tăng'}, tuy nhiên không thay thế tín hiệu và điều kiện thực thi. Cần đối chiếu dòng tiền, Hurst và chất lượng xu hướng trước khi hành động.`,
        fallback ? 'Báo cáo đang dùng phương pháp thay thế; không coi các xác suất HMM còn sót lại là kết quả mô hình đã fit thành công.' : `Xác suất pha tăng ${v('hmm.state_probs.BULL','%')}, đi ngang ${v('hmm.state_probs.SIDEWAY','%')} và pha giảm ${v('hmm.state_probs.BEAR','%')} mô tả độ tin cậy phân loại trạng thái, không phải xác suất giao dịch thắng.`,
        'Chuyển động của tam giác phát lại các trạng thái có trong báo cáo; không bổ sung phiên mới và không biến một nhãn lịch sử thành tín hiệu thị trường trực tiếp.');
    }
    case 'technical': {
      if (!exists('flow.cmf','trend.er','trend.r2','trend.slope_pct','alpha.cross_sectional.rs_20d_pct')) return unavailable();
      const cmf=n('flow.cmf'),er=n('trend.er'),slope=n('trend.slope_pct'),rs=n('alpha.cross_sectional.rs_20d_pct');
      return build(`CMF ${v('flow.cmf')} ${cmf==null ? 'chưa đủ để đọc áp lực mua/bán' : cmf>limits.technical.neutralFlow ? 'nghiêng về áp lực mua' : cmf<0 ? 'nghiêng về áp lực bán' : 'chưa nghiêng về bên mua hay bán'}, trong khi ER ${v('trend.er')} ${er==null ? 'chưa cho biết mức nhiễu của đường giá' : er<=limits.technical.noisyER ? `ở vùng tham khảo không quá ${number(limits.technical.noisyER)}, cho thấy đường giá còn nhiều nhiễu` : `vượt mốc tham khảo ${number(limits.technical.noisyER)}, nhưng vẫn cần đọc cùng độ dốc để biết hướng`}. ${rs==null ? 'Chưa có RS20 để so với VN-Index.' : `RS20 ${number(rs,'%')} cho thấy lợi suất 20 phiên ${rs>0 ? 'vượt' : rs<0 ? 'kém' : 'ngang'} VN-Index theo phép so của báo cáo.`} Cần kiểm tra sự nhất quán giữa áp lực mua/bán và hướng giá, không mua chỉ vì xu hướng rõ.`,
        `R² ${v('trend.r2')} mô tả mức đường xu hướng giải thích chuỗi giá; càng gần 1 càng khớp theo cách đo này. Độ dốc ${v('trend.slope_pct','%')}${slope==null ? ' chưa được công bố nên chưa thể gán hướng tăng/giảm từ ER hoặc R².' : slope>0 ? ' mang dấu dương, nhưng không bảo đảm nhịp tăng tiếp diễn.' : slope<0 ? ' mang dấu âm: đường giá có thể giảm rõ dù R² cao.' : ' bằng 0 theo giá trị công bố.'}`,
        `Beta ${v('alpha.cross_sectional.beta')} mô tả độ nhạy với thị trường trong cửa sổ ước lượng, không phải mức lợi nhuận. CMF là đại diện từ giá và khối lượng, không phải số tiền nạp/rút thực tế; các mốc ER chỉ dùng đọc độ nhiễu, không phải cổng mua/bán.`);
    }
    case 'directional_alpha': {
      if (!exists('momentum_alpha.score','hurst.hurst','lightgbm_cross_sectional.available','conditional_mr.active')) return unavailable();
      const momentum=n('momentum_alpha.score'),hurst=n('hurst.hurst'),ready=get('lightgbm_cross_sectional.available')===true,forecast=ready?n('lightgbm_cross_sectional.proj_pct'):null;
      return build(`Momentum ${v('momentum_alpha.score')} ${momentum==null ? 'chưa có kết quả' : momentum>limits.directional_alpha.neutralMomentum ? 'cho thấy đà gần đây nghiêng về tăng' : momentum<0 ? 'cho thấy đà gần đây nghiêng về giảm' : 'đang ở mức trung tính'}, còn Hurst ${v('hurst.hurst')} ${hurst==null ? 'chưa xác định cấu trúc chuỗi' : hurst>limits.directional_alpha.randomHurst ? 'trên mốc 0,5, gợi ý xu hướng có tính duy trì theo ước lượng' : hurst<.5 ? 'dưới mốc 0,5, gợi ý tính đảo chiều theo ước lượng' : 'ở mốc 0,5, gần cấu trúc ngẫu nhiên theo thước đo này'}. ${forecast==null ? 'LightGBM chưa có dự báo khả dụng.' : `LightGBM dự báo ${number(forecast,'%')} trước phí${momentum!=null && momentum*forecast<0 ? ', trái chiều với đà gần đây' : ''}.`} Cần đọc các nguồn khả dụng cùng độ phủ và đồng thuận, không coi Hurst là một phiếu dự báo hướng.`,
        `Lợi suất quan sát 5/10/20/60 phiên lần lượt là ${[5,10,20,60].map(d=>v(`momentum_alpha.components.ret_${d}d_pct`,'%')).join(' / ')}. Điểm Momentum dùng thang có dấu, không phải phần trăm lợi nhuận; mô hình chỉ tham gia tổng hợp nếu báo cáo xác nhận trạng thái hoạt động.`,
        `Hurst thuộc nhóm ${v('hurst.regime')}, độ tin cậy ước lượng ${v('hurst.confidence')}/1. Mốc 0,5 chỉ là mốc cấu trúc chuỗi, không quyết định mua/bán; cần xem tính ổn định qua các cửa sổ đã công bố.`,
        ready ? `LightGBM có thứ hạng ${v('lightgbm_cross_sectional.rank_pct','%')} trong rổ và alpha dự báo ${v('lightgbm_cross_sectional.predicted_alpha_pct','%')}; thứ hạng không phải xác suất có lời.` : 'LightGBM chưa khả dụng nên các dự báo số của nguồn này không được dùng để diễn giải.',
        `Hồi quy phần dư ${get('conditional_mr.active')===true ? `đang hoạt động với dự báo riêng ${v('conditional_mr.proj_pct','%')}` : get('conditional_mr.active')===false ? 'chưa kích hoạt; không được tính như một nguồn đồng tình' : 'chưa công bố trạng thái hoạt động'}. Không suy nguyên nhân chỉ từ một giá trị Hurst.`);
    }
    case 'context': {
      if (!exists('sector.name','sector.trend.trend_label','cross_corr.avg_pairwise_corr')) return unavailable();
      const corr=n('cross_corr.avg_pairwise_corr');
      return build(`Ngành ${v('sector.name')} có nhãn xu hướng “${v('sector.trend.trend_label')}”; tương quan trung bình ${v('cross_corr.avg_pairwise_corr')} ${corr==null ? 'chưa đủ để đánh giá nhịp chung' : corr>limits.context.independentCorrelation ? 'cho thấy các mã có xu hướng cùng chiều trong mẫu' : corr<0 ? 'cho thấy quan hệ trung bình ngược chiều trong mẫu' : 'không ghi nhận quan hệ tuyến tính trung bình'}. Bối cảnh ngành có thể hỗ trợ hoặc cản trở tín hiệu riêng, nhưng không quyết định giá từng cổ phiếu. Cần đối chiếu với sức mạnh tương đối và xu hướng của chính mã này.`,
        `Tương quan ${v('cross_corr.avg_pairwise_corr')} dùng miền −1 đến +1; gần +1 là cùng chiều hơn, gần −1 là ngược chiều hơn. Tương quan gần 0 không chứng minh độc lập và không có nghĩa giá an toàn.`,
        'Nhãn ngành được giữ nguyên từ báo cáo; nếu không có chuỗi chỉ số ngành và các cửa sổ đồng bộ thì chưa thể định lượng mức ngành đóng góp vào lợi nhuận riêng của mã.');
    }
    case 'agreement': {
      if (!exists('fcast.ensemble_ret_pct','fcast.agreement_pct','fcast.coverage_pct')) return unavailable();
      const coverage=n('fcast.coverage_pct');
      return build(`Dự báo tổng hợp ${v('fcast.ensemble_ret_pct','%')} trong ${v('fcast.horizon',' phiên')} đi cùng đồng thuận ${v('fcast.agreement_pct','%')}, tuy nhiên độ phủ ${v('fcast.coverage_pct','%')} ${coverage==null ? 'chưa cho biết có bao nhiêu bằng chứng khả dụng' : coverage<limits.agreement.fullCoveragePct ? 'cho thấy vẫn có thành phần dự báo chưa tham gia' : 'đã đạt mức đầy đủ theo cách tính của báo cáo'}. Đồng thuận đo sự nhất trí, không phải xác suất có lời. Cần kiểm tra các nguồn đang tham gia và dự báo sau chi phí trước khi dùng kết quả này.`,
        `Mức ủng hộ ${v('fcast.support_pct','%')} là chỉ tiêu riêng của pipeline, không tự đồng nhất với đồng thuận hay độ phủ. Không có một ngưỡng đồng thuận chung nào ở giao diện thay thế quyết định do hệ thống trả về.`,
        'Khi các nguồn cùng dùng dữ liệu tương tự, việc cùng chiều không đồng nghĩa có nhiều bằng chứng độc lập. Nguồn thiếu hoặc không đủ điều kiện không được tính như một phiếu xác nhận; Monte Carlo mô tả rủi ro, không phải một phiếu có hướng.');
    }
    case 'simulation_risk': {
      if (!exists('simulation_risk.mc.prob_up','simulation_risk.horizon','simulation_risk.lock_risk.max_dd_lock_pct','simulation_risk.lock_risk.prob_loss_gt_3pct')) return unavailable();
      const prob=n('simulation_risk.mc.prob_up');
      return build(`Xác suất giá tăng cuối kỳ là ${v('simulation_risk.mc.prob_up','%')} trong ${v('simulation_risk.horizon',' phiên')}${prob==null ? '' : prob>limits.simulation_risk.balancedUpPct ? ', cao hơn mốc cân bằng 50% trong mô phỏng' : prob<50 ? ', thấp hơn mốc cân bằng 50% trong mô phỏng' : ', đúng mốc cân bằng 50% trong mô phỏng'}; tuy nhiên P(lỗ trên 3% trong T+2) là ${v('simulation_risk.lock_risk.prob_loss_gt_3pct','%')} và sụt giảm T-lock ${v('simulation_risk.lock_risk.max_dd_lock_pct','%')}. Giá cuối kỳ và tổn thất khi cổ phiếu chưa về là hai sự kiện khác nhau. Cần đánh giá cả rủi ro trong thời gian khóa thanh toán, không chỉ tỷ lệ tăng cuối kỳ.`,
        prob!=null&&prob>=0&&prob<=100 ? `Tỷ lệ ${number(prob,'%')} tương ứng khoảng ${number(prob)} trên 100 kết quả mô phỏng có giá cuối kỳ cao hơn ban đầu theo giả định mô hình, không phải 100 giao dịch thật. Nguồn biến động là ${v('simulation_risk.mc.vol_source')}.` : 'Chưa có tỷ lệ tăng cuối kỳ hợp lệ trong miền 0–100% để minh họa.',
        'Dải P05–P95 thể hiện các phân vị đã công bố, không phải mức sàn/trần chắc chắn của giá tương lai. Animation chỉ phát lại các điểm của báo cáo; không chạy lại mô hình hoặc tạo thêm đường dự báo.');
    }
    case 'costs': {
      if (!exists('costs.net_forecast_pct','costs.gross_forecast_pct','costs.roundtrip_cost_pct')) return unavailable();
      const net=n('costs.net_forecast_pct');
      return build(`Dự báo trước phí ${v('costs.gross_forecast_pct','%')}, chi phí khứ hồi ${v('costs.roundtrip_cost_pct','%')} và dự báo sau phí ${v('costs.net_forecast_pct','%')} ${net==null ? 'chưa đủ để xác nhận phần lợi nhuận còn lại' : net>limits.costs.breakEvenPct ? 'cho thấy phần dự báo còn dương sau các chi phí đã tính' : net===0 ? 'cho thấy phần dự báo không còn dương, ở mức hòa vốn theo giả định' : 'cho thấy dự báo sau phí âm'}. ${net!=null&&net<=0 ? 'Chi phí và/hoặc dự báo gộp khiến lợi thế sau phí không còn dương.' : 'Dù vậy, dự báo sau phí dương chưa bảo đảm khả năng thực thi.'} Cần đọc cùng cổng quyết định và thanh khoản.`,
        net!=null&&net>=-100 ? `Mức sau phí ${number(net,'%')} trên giá trị mua minh họa 100 triệu đồng tương ứng khoảng ${number(Math.abs(net))} triệu đồng ${net>=0?'lãi':'lỗ'} dự kiến, không phải lợi nhuận đã thực hiện.` : 'Chưa đủ dự báo sau phí hợp lệ để quy đổi sang ví dụ bằng tiền.',
        'Chi phí khứ hồi là giả định cho cả mua và bán, có thể gồm phí, thuế và tác động giao dịch theo báo cáo. Giá khớp thực tế có thể khác; giao diện giữ nguyên ba giá trị nguồn và không tính lại dự báo ròng.');
    }
    case 'trade_plan': {
      if (!exists('sl.entry','sl.sl_swing','sl.tp1','sl.tp2','pos.shares')) return unavailable();
      const entry=n('sl.entry'), sl=n('sl.sl_swing'), tp1=n('sl.tp1'),tp2=n('sl.tp2');
      const ordered=[entry,sl,tp1,tp2].every(x=>x!=null&&x>limits.trade_plan.minPrice)&&sl!<entry!&&entry!<tp1!&&tp1!<=tp2!;
      return build(`Giá vào ${v('sl.entry',' VND')}, dừng lỗ ${v('sl.sl_swing',' VND')}, mục tiêu 1 ${v('sl.tp1',' VND')} và mục tiêu 2 ${v('sl.tp2',' VND')} ${ordered ? 'được sắp theo thứ tự SL < Entry < TP1 ≤ TP2' : 'chưa tạo thành một kế hoạch mua đủ mức giá hợp lệ theo thứ tự SL < Entry < TP1 ≤ TP2'}. Lỗ tại SL công bố là ${v('pos.max_loss',' VND')}; đây là tổn thất ước tính, không phải mức lỗ được bảo đảm. Cần kiểm tra khả năng thực thi và rủi ro T+2 trước khi dùng kế hoạch.`,
        `Số lượng ${v('pos.shares',' cổ phiếu')} tương ứng giá trị vị thế ${v('pos.value',' VND')}, theo ${v('sizing_mode').toLowerCase()}. Chưa có vốn cá nhân thì không nên coi quy mô tham chiếu là số lượng phù hợp cho tài khoản riêng.`,
        'Mục tiêu là mức giá của kế hoạch có điều kiện, không phải dự báo chắc chắn sẽ chạm. Gap giá, thanh khoản thấp hoặc thời gian chờ cổ phiếu về có thể khiến không bán được tại SL; giữ nguyên các mức do báo cáo công bố.');
    }
    case 'liquidity': {
      if (!exists('liquidity.pass','liquidity.adv20_value_vnd','liquidity.value_ratio_5_20')) return unavailable();
      const ratio=n('liquidity.value_ratio_5_20'),pass=get('liquidity.pass');
      return build(`Giá trị giao dịch bình quân 20 phiên là ${v('liquidity.adv20_value_vnd',' VND')}, tỷ lệ thanh khoản 5/20 là ${v('liquidity.value_ratio_5_20','x')}${ratio==null ? '' : ratio>limits.liquidity.unchangedVolumeRatio ? ' cho thấy nhịp gần đây cao hơn nền 20 phiên theo thước đo này' : ratio<1 ? ' cho thấy nhịp gần đây thấp hơn nền 20 phiên theo thước đo này' : ' ngang nền so sánh'}. ${pass===true ? 'Báo cáo xác nhận đạt điều kiện thanh khoản' : pass===false ? 'Báo cáo xác nhận chưa đạt điều kiện thanh khoản' : 'Chưa có kết luận đạt điều kiện'}, dù vậy giao dịch lớn vẫn có thể khó khớp đủ. Cần đối chiếu sức chứa và quy mô lệnh, không suy ra nên mua chỉ từ thanh khoản cao.`,
        `Sức chứa công bố ${v('liquidity.capacity_shares',' cổ phiếu')} là giới hạn tham chiếu theo các giả định nguồn, không bảo đảm có sẵn bên đối ứng ở mọi mức giá. Mốc tỷ lệ 1× chỉ so nhịp giao dịch gần đây với nền, không là một cổng mua/bán mới.`,
        'Giá trị giao dịch cao không đồng nghĩa tiền mua ròng hoặc tích lũy; một giao dịch có cả bên mua và bên bán. Cần kiểm tra chi phí và trượt giá trong chính quy mô vị thế đang xét.');
    }
    case 'data_quality': {
      if (!exists('data_quality.status','data_quality.score')) return unavailable();
      const status=get('data_quality.status');
      return build(`Điểm dữ liệu ${v('data_quality.score')}/100 đi cùng trạng thái “${v('data_quality.status')}”${status==='FAIL' ? ', cho thấy dữ liệu chưa qua kiểm tra của hệ thống' : status==='PASS' ? ', cho thấy dữ liệu đã qua các kiểm tra được áp dụng' : ', nhưng chưa có kết luận đạt/không đạt rõ ràng'}. Điểm này chấm dữ liệu đầu vào, không phải chất lượng đầu tư của cổ phiếu. ${report.warnings.length ? `Báo cáo còn ${report.warnings.length} cảnh báo; cần đọc từng cảnh báo trước khi sử dụng tín hiệu.` : 'Cần kiểm tra thời điểm và độ dài mẫu trước khi sử dụng tín hiệu, kể cả khi trạng thái đã đạt.'}`,
        `Điểm chất lượng dùng thang ${limits.data_quality.minScore}–${limits.data_quality.maxScore}; giao diện không tự đặt thêm ngưỡng đạt mà giữ nguyên trạng thái của pipeline. Dữ liệu tốt không thể bảo đảm dự báo chính xác.`,
        report.warnings.length ? `Các cảnh báo của báo cáo: ${report.warnings.map(code=>analysisReason(code)).join(' ')}` : 'Báo cáo không kèm cảnh báo ở trường warnings; điều này không xác nhận mọi nguồn đều đầy đủ. Cần đối chiếu trạng thái thiếu dữ liệu của từng module.');
    }
    case 'decision': {
      const action=actionNames[String(report.decision.action)] || metricText(report.decision.action),score=n('rec.score'), executable=report.decision.executable;
      return build(`${score==null ? 'Chưa có điểm Quant; ' : `Điểm Quant ${number(score)}/100 đi cùng `}kết luận “${action}”; ${executable===true ? 'báo cáo xác nhận đủ điều kiện thực thi' : 'báo cáo chưa xác nhận đủ điều kiện thực thi'}. Điểm là xếp hạng chất lượng theo hệ thống, không phải xác suất có lãi. Cần tuân theo kết luận và lý do của báo cáo thay vì chỉ nhìn điểm hoặc dự báo dương.`,
        `Cổng điều kiện ${v('action.gate_pass')}; điều kiện thực thi ${executable===true?'đạt':executable===false?'chưa đạt':'chưa công bố'}. Không có ngưỡng điểm giao diện nào ghi đè hành động gốc.`,
        Array.isArray(report.decision.reason_codes) && report.decision.reason_codes.length ? `Lý do cụ thể: ${report.decision.reason_codes.map(code=>analysisReason(String(code))).join(' ')}` : 'Báo cáo chưa công bố lý do cụ thể; cần xem các phần dữ liệu, thời điểm, chi phí và rủi ro để biết thông tin nào còn thiếu.');
    }
    case 'commentary': return build(quantSummary(report).map(([label,text])=>`${label}: ${text}`).join(' '));
    default: return unavailable();
  }
}
export function moduleInterpretation(name: string, metrics: unknown, report: AnalysisReport): string {
  const { summary, details } = moduleAnalysis(name, metrics, report);
  return [summary, ...details].join('\n');
}
