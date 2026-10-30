// Presentation thresholds and copy only. Never imported by model/scoring code.
export const factorThresholds = { strong: 70, neutral: 50 } as const;
export const factorScaleNote = 'Thang 0–100 · 50 là trung tính · càng cao càng thuận lợi cho kế hoạch giao dịch';
export const factorGroups = [
  { id: 'performance', label: 'Hiệu quả', color: 'var(--factor-performance)' },
  { id: 'forecast', label: 'Dự báo', color: 'var(--factor-forecast)' },
  { id: 'state', label: 'Trạng thái', color: 'var(--factor-state)' },
  { id: 'execution', label: 'Thực thi', color: 'var(--factor-execution)' },
] as const;
export type FactorGroup = typeof factorGroups[number]['id'];
export type FactorLevel = 'strong' | 'medium' | 'weak' | 'missing';
export function factorLevel(score: number | null): FactorLevel {
  return score == null ? 'missing' : score >= factorThresholds.strong ? 'strong' : score >= factorThresholds.neutral ? 'medium' : 'weak';
}
export const factorLevelNames = { strong: 'Mạnh', medium: 'Vừa', weak: 'Yếu', missing: 'Chưa có dữ liệu' };
export const factorLevelSymbols = { strong: '▲', medium: '▬', weak: '▼', missing: '—' };
type ReadingRule = { group: FactorGroup; measure: string; direction: 'higher'; directionNote: string; strong: string; medium: string; weak: string };
const normalizedNote = 'Nguồn xuất nhân tố đã chuẩn hóa tương đối, không phải chỉ số gốc hay xác suất. Không đảo chiều khi hiển thị.';
export const factorReadingRules: Record<string, ReadingRule> = {
  sharpe: { group:'performance', measure:'Lợi nhuận trên mỗi đơn vị biến động của cổ phiếu.', direction:'higher', directionNote:normalizedNote,
    strong:'Hiệu quả lợi nhuận so với biến động là điểm hỗ trợ tương đối. Vẫn cần đọc lợi suất và mức sụt giảm gốc.',
    medium:'Hiệu quả điều chỉnh rủi ro chưa nổi trội trên thang tham khảo. Cần đối chiếu với tổn thất đã quan sát.',
    weak:'Hiệu quả lợi nhuận so với biến động là điểm hạn chế tương đối. Không nên chỉ nhìn lợi suất để bỏ qua mức giảm.' },
  cmf: { group:'performance', measure:'Giá và khối lượng đang nghiêng về bên mua hay bên bán.', direction:'higher', directionNote:normalizedNote,
    strong:'Giá–khối lượng là điểm hỗ trợ tương đối trong hồ sơ. Cần xem CMF gốc để biết áp lực mua hay bán.',
    medium:'Giá–khối lượng chưa thuộc nhóm hỗ trợ mạnh. Cần kiểm tra xem dòng tiền có cùng chiều với giá hay không.',
    weak:'Giá–khối lượng đang là điểm hạn chế tương đối. Đây không phải số tiền thực tế rút khỏi cổ phiếu.' },
  alpha_composite: { group:'performance', measure:'Lợi thế riêng của cổ phiếu so với biến động chung.', direction:'higher', directionNote:normalizedNote,
    strong:'Nhân tố alpha là điểm hỗ trợ theo thang của báo cáo. Điểm này không phải mức lợi nhuận sẽ đạt được.',
    medium:'Lợi thế riêng chưa nổi trội theo thang tham khảo. Cần kiểm tra các nguồn alpha đang tham gia.',
    weak:'Lợi thế riêng đang kém thuận lợi tương đối. Một dự báo giá hấp dẫn chưa đủ thay thế bằng chứng alpha.' },
  forecast_ret: { group:'forecast', measure:'Mức thay đổi giá dự kiến còn lại sau chi phí giao dịch.', direction:'higher', directionNote:normalizedNote,
    strong:'Dự báo sau phí là điểm hỗ trợ trên thang chuẩn hóa. Cần xem tỷ lệ dự báo ròng gốc để biết còn dương hay âm.',
    medium:'Dự báo sau phí chưa thuộc nhóm hỗ trợ mạnh. Cần đối chiếu mức ròng thực tế với các giả định chi phí.',
    weak:'Dự báo sau phí đang là điểm hạn chế tương đối. Cần xem chi phí đã làm giảm lợi thế dự kiến đến đâu.' },
  forecast_conf: { group:'forecast', measure:'Các bằng chứng đang hỗ trợ dự báo đến đâu.', direction:'higher', directionNote:normalizedNote,
    strong:'Độ tin cậy thuộc nhóm mạnh theo mốc tham khảo. Điểm này không phải xác suất dự báo đúng.',
    medium:'Độ tin cậy chưa đạt nhóm mạnh. Cần kiểm tra độ phủ và các nguồn xác nhận trước khi tin dự báo.',
    weak:'Độ tin cậy là điểm yếu của hồ sơ. Dự báo cao vẫn cần bằng chứng xác nhận từ các nguồn khả dụng.' },
  trend_quality: { group:'state', measure:'Giá đi theo hướng rõ ràng hay còn tăng giảm nhiều nhiễu.', direction:'higher', directionNote:normalizedNote+' Nhân tố nguồn dùng ER nhân dấu độ dốc.',
    strong:'Nhân tố xu hướng là điểm hỗ trợ tương đối. Cần kiểm tra đường giá thực tế để hiểu hướng và độ nhiễu.',
    medium:'Xu hướng chưa nổi trội trên thang tham khảo. Cần kiểm tra độ nhiễu và sự nhất quán của hướng giá.',
    weak:'Xu hướng đang kém thuận lợi tương đối. Cần kiểm tra giá đi ngược hướng kế hoạch hay còn quá nhiễu.' },
  hmm_regime: { group:'state', measure:'Pha tăng, giảm hoặc đi ngang mà mô hình nhận diện.', direction:'higher', directionNote:normalizedNote+' Nguồn gắn dấu dương cho BULL, âm cho BEAR trước bước chuẩn hóa.',
    strong:'Trạng thái thị trường là điểm hỗ trợ tương đối. Cần xem nhãn HMM gốc; điểm này không phải xác suất lệnh thắng.',
    medium:'Trạng thái chưa tạo điểm hỗ trợ mạnh trên thang này. Cần đối chiếu pha thị trường và chất lượng xu hướng.',
    weak:'Trạng thái thị trường đang là điểm cản trở tương đối. Cần kiểm tra pha gốc trước khi dùng kế hoạch có hướng.' },
  vol_regime: { group:'state', measure:'Giá lên xuống mạnh hay nhẹ so với nền biến động.', direction:'higher', directionNote:normalizedNote+' Pipeline gốc đã dùng 1 − vol_ratio, sau đó chuẩn hóa. Giá trị âm ở đây nghĩa là kém thuận lợi tương đối; không tự suy ra vol_ratio thực tế.',
    strong:'Điều kiện biến động thuận lợi tương đối trong hồ sơ. Điều này không bảo đảm giá ít giảm hoặc có lãi.',
    medium:'Điều kiện biến động chưa thuộc nhóm thuận lợi mạnh. Cần đối chiếu độ biến động thực với khoảng dừng lỗ.',
    weak:'Điều kiện biến động là điểm yếu tương đối. Cần đối chiếu biên dao động thực với mức dừng lỗ và rủi ro chờ thanh toán.' },
  liquidity: { group:'execution', measure:'Khả năng mua, bán và khớp đủ lượng cổ phiếu.', direction:'higher', directionNote:normalizedNote+' Nguồn gốc xếp hạng thanh khoản A > B > C > D trước bước chuẩn hóa.',
    strong:'Thanh khoản là điểm hỗ trợ để thực hiện kế hoạch. Cần kiểm tra sức chứa và quy mô lệnh để đánh giá trượt giá.',
    medium:'Khả năng giao dịch chưa thuộc nhóm nổi trội. Cần đối chiếu số lượng dự kiến với sức chứa thực tế.',
    weak:'Khả năng giao dịch đang là điểm hạn chế. Không thể suy từ dự báo tốt rằng lệnh sẽ khớp đủ hoặc ít trượt giá.' },
};
export function factorReading(id: string, score: number | null): string {
  if(score==null) return 'Chưa đủ dữ liệu để diễn giải; phần thiếu không được coi là điểm 0 hoặc trung tính.';
  const level=factorLevel(score), rule=factorReadingRules[id];
  const hint=score>=factorThresholds.strong?`từ mốc ${factorThresholds.strong}, Mạnh`:score>=factorThresholds.neutral?`từ mốc ${factorThresholds.neutral} nhưng dưới ${factorThresholds.strong}, Vừa`:`dưới mốc trung tính ${factorThresholds.neutral}, Yếu`;
  const text=rule[level as 'strong'|'medium'|'weak'];
  return `${score}/100 (${hint}); ${text.charAt(0).toLocaleLowerCase('vi-VN')+text.slice(1)}`;
}
const summaryConcepts:Record<string,string> = {
  sharpe:'hiệu quả lợi nhuận so với biến động',cmf:'áp lực giá–khối lượng',alpha_composite:'lợi thế riêng',
  forecast_ret:'triển vọng sau chi phí',forecast_conf:'mức tin cậy của dự báo',trend_quality:'chất lượng xu hướng',
  hmm_regime:'bối cảnh trạng thái thị trường',vol_regime:'điều kiện biến động',liquidity:'khả năng giao dịch',
};
type SummaryFactor = { id:string;label:string;score:number|null };
export function factorQuickRead(rows: readonly SummaryFactor[]) {
  const available=rows.filter((p):p is SummaryFactor & {score:number}=>p.score!=null).slice().sort((a,b)=>b.score-a.score);
  const missing=rows.length-available.length, weak=available.filter(p=>p.score<factorThresholds.neutral);
  const high=available[0], low=available.at(-1);
  const forecast=available.find(p=>p.id==='forecast_ret'),confidence=available.find(p=>p.id==='forecast_conf');
  const conflict=!!forecast&&!!confidence&&forecast.score>=factorThresholds.strong&&confidence.score<factorThresholds.strong;
  const caution=conflict?`Dự báo ${forecast!.score}, tin cậy ${confidence!.score}`:missing?`${missing} nhân tố thiếu dữ liệu`:weak.length?`${weak.length} nhân tố dưới ${factorThresholds.neutral}`:'Đối chiếu điều kiện thực thi';
  const chips=[['Mạnh nhất',high?`${high.label} ${high.score}/100`:'Chưa có dữ liệu'],['Yếu nhất',low?`${low.label} ${low.score}/100`:'Chưa có dữ liệu'],['Cần lưu ý',caution]];
  if(!high||!low) return {chips,paragraph:'Chưa đủ dữ liệu để xác định nhân tố mạnh hay yếu; các trục còn thiếu không được xem là điểm 0 hoặc trung tính. Cần bổ sung dữ liệu trước khi đánh giá hồ sơ nhân tố.',weakIds:[],conflict:false};
  const top=available.filter(p=>p.score>=factorThresholds.strong).slice(0,2);
  let paragraph=top.length?`${top.map(p=>`${p.label} đạt ${p.score}/100`).join(' và ')} ${top.length===2?'là hai nhân tố cao nhất':'là nhân tố cao nhất'}, nằm trong nhóm Mạnh từ mốc ${factorThresholds.strong}, cho thấy ${top.map(p=>summaryConcepts[p.id]).join(" và ")} là phần hỗ trợ tương đối của hồ sơ`:`${high.label} đạt ${high.score}/100, cao nhất hồ sơ nhưng ${high.score<factorThresholds.neutral?`vẫn dưới mốc trung tính ${factorThresholds.neutral}`:`chưa đạt mốc Mạnh ${factorThresholds.strong}`}`;
  if(weak.length) paragraph+=`; tuy nhiên ${low.label} chỉ ${low.score}/100, ${weak.length>1?`và tổng cộng ${weak.length}/${available.length} nhân tố`:'thuộc nhóm'} dưới mốc trung tính ${factorThresholds.neutral}, cho thấy ${summaryConcepts[low.id]} còn là điểm hạn chế`;
  else paragraph+='; dù vậy, những điểm cao riêng lẻ không xác nhận khả năng thực thi';
  if(conflict) paragraph+=`. Dự báo sau phí đạt ${forecast!.score}/100 nhưng độ tin cậy chỉ ${confidence!.score}/100, chưa đạt mốc Mạnh ${factorThresholds.strong} nên hai góc nhìn chưa hỗ trợ tương xứng`;
  if(missing) paragraph+=`. Còn ${missing} nhân tố chưa có dữ liệu, vì vậy chưa thể đối chiếu toàn bộ hồ sơ`;
  const implication=missing?'Cần bổ sung các nhân tố còn thiếu và đọc cùng quyết định gốc của báo cáo.':conflict?'Cần kiểm tra độ phủ và các nguồn dự báo, rồi đối chiếu rủi ro với kế hoạch dừng lỗ.':weak.some(p=>p.id==='liquidity')?'Cần kiểm tra sức chứa và quy mô lệnh trước khi sử dụng kế hoạch.':weak.some(p=>p.id==='vol_regime')?'Cần đối chiếu biến động thực và khoảng dừng lỗ trước khi sử dụng kế hoạch.':'Cần đọc cùng quyết định, chi phí và điều kiện thực thi của báo cáo.';
  return {chips,paragraph:paragraph+'. '+implication,weakIds:weak.map(p=>p.id),conflict};
}
