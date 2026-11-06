// Presentation thresholds and copy only. Never imported by model/scoring code.
export const factorThresholds = { strong: 70, neutral: 50 } as const;
export const factorScaleNote = 'Thang 0–100 · ngưỡng riêng từng nhân tố · HMM: <30 bear rõ, >70 bull rõ · phần thiếu để trống';
export const factorGroups = [
  { id: 'performance', label: 'Hiệu quả', color: 'var(--factor-performance)' },
  { id: 'forecast', label: 'Dự báo', color: 'var(--factor-forecast)' },
  { id: 'state', label: 'Trạng thái', color: 'var(--factor-state)' },
  { id: 'execution', label: 'Thực thi', color: 'var(--factor-execution)' },
] as const;
export type FactorGroup = typeof factorGroups[number]['id'];
export type FactorLevel = 'strong' | 'medium' | 'weak' | 'missing';
export function factorLevel(score: number | null, id = ""): FactorLevel {
  if (score == null) return 'missing';
  if (id === 'hmm_regime') return score > 70 ? 'strong' : score < 30 ? 'weak' : 'medium';
  if (['sharpe','cmf','trend_quality'].includes(id)) return score > 70 ? 'strong' : score < 50 ? 'weak' : 'medium';
  return score >= 70 ? 'strong' : score >= 50 ? 'medium' : 'weak';
}
export const factorLevelNames = { strong: 'Mạnh', medium: 'Vừa', weak: 'Yếu', missing: 'Chưa có dữ liệu' };
export const factorLevelSymbols = { strong: '▲', medium: '▬', weak: '▼', missing: '—' };
type ReadingRule = { group: FactorGroup; measure: string; direction: 'higher'; directionNote: string; strong: string; medium: string; weak: string };
const normalizedNote = 'Nguồn xuất nhân tố đã chuẩn hóa tương đối, không phải chỉ số gốc hay xác suất. Không đảo chiều khi hiển thị.';
export const factorReadingRules: Record<string, ReadingRule> = {
  sharpe: { group:'performance', measure:'Lợi nhuận trên mỗi đơn vị biến động của cổ phiếu.', direction:'higher', directionNote:'Dùng Sharpe gốc: <0 xấu, 0–2 bình thường, >2 tốt.',
    strong:'Hiệu quả lợi nhuận so với biến động là điểm hỗ trợ tương đối. Vẫn cần đọc lợi suất và mức sụt giảm gốc.',
    medium:'Hiệu quả điều chỉnh rủi ro chưa nổi trội trên thang tham khảo. Cần đối chiếu với tổn thất đã quan sát.',
    weak:'Hiệu quả lợi nhuận so với biến động là điểm hạn chế tương đối. Không nên chỉ nhìn lợi suất để bỏ qua mức giảm.' },
  cmf: { group:'performance', measure:'Giá và khối lượng đang nghiêng về bên mua hay bên bán.', direction:'higher', directionNote:'Dùng CMF gốc: <0 xấu, 0–0,1 bình thường, >0,1 tốt.',
    strong:'Giá–khối lượng là điểm hỗ trợ tương đối trong hồ sơ. Cần xem CMF gốc để biết áp lực mua hay bán.',
    medium:'Giá–khối lượng chưa thuộc nhóm hỗ trợ mạnh. Cần kiểm tra xem dòng tiền có cùng chiều với giá hay không.',
    weak:'Giá–khối lượng đang là điểm hạn chế tương đối. Đây không phải số tiền thực tế rút khỏi cổ phiếu.' },
  alpha_composite: { group:'performance', measure:'Điểm trung bình cộng của các module đã có điểm 0–100 hợp lệ.', direction:'higher', directionNote:'Mỗi module có trọng số bằng nhau; bỏ module thiếu khỏi mẫu số. Đây là điểm tổng hợp, không phải alpha lợi nhuận. Đọc kèm độ phủ.',
    strong:'Điểm trung bình module ở vùng cao; cần kiểm tra độ phủ trước khi đánh giá toàn bộ báo cáo.',
    medium:'Điểm trung bình module ở vùng vừa; mở danh sách để xem module nào đóng góp và module nào còn thiếu.',
    weak:'Điểm trung bình module ở vùng thấp; cần đọc các điểm thành phần và độ phủ để xác định hạn chế.' },
  forecast_ret: { group:'forecast', measure:'Mức thay đổi giá dự kiến còn lại sau chi phí giao dịch.', direction:'higher', directionNote:normalizedNote,
    strong:'Dự báo sau phí là điểm hỗ trợ trên thang chuẩn hóa. Cần xem tỷ lệ dự báo ròng gốc để biết còn dương hay âm.',
    medium:'Dự báo sau phí chưa thuộc nhóm hỗ trợ mạnh. Cần đối chiếu mức ròng thực tế với các giả định chi phí.',
    weak:'Dự báo sau phí đang là điểm hạn chế tương đối. Cần xem chi phí đã làm giảm lợi thế dự kiến đến đâu.' },
  forecast_conf: { group:'forecast', measure:'Các bằng chứng đang hỗ trợ dự báo đến đâu.', direction:'higher', directionNote:normalizedNote,
    strong:'Độ tin cậy thuộc nhóm mạnh theo mốc tham khảo. Điểm này không phải xác suất dự báo đúng.',
    medium:'Độ tin cậy chưa đạt nhóm mạnh. Cần kiểm tra độ phủ và các nguồn xác nhận trước khi tin dự báo.',
    weak:'Độ tin cậy là điểm yếu của hồ sơ. Dự báo cao vẫn cần bằng chứng xác nhận từ các nguồn khả dụng.' },
  trend_quality: { group:'state', measure:'Giá đi theo hướng rõ ràng hay còn tăng giảm nhiều nhiễu.', direction:'higher', directionNote:'Dùng ER gốc: <0,3 nhiễu/đi ngang; 0,3–0,6 vừa; >0,6 sạch; >0,8 rất hiếm. ER cao không cho biết hướng tăng hay giảm.',
    strong:'Xu hướng sạch theo ER; trên 0,8 rất hiếm. Cần đọc độ dốc vì một xu hướng giảm cũng có thể rất sạch.',
    medium:'ER từ 0,3 đến 0,6 cho thấy xu hướng vừa phải. Cần đọc cùng độ dốc để biết hướng.',
    weak:'ER dưới 0,3 cho thấy đường giá nhiễu hoặc đi ngang; chưa xác nhận xu hướng sạch.' },
  hmm_regime: { group:'state', measure:'Pha tăng, giảm hoặc đi ngang mà mô hình nhận diện.', direction:'higher', directionNote:'Dùng xác suất filtered: 100×P(bull) + 50×P(sideway). P dạng 0–1; API hiện dùng % nên không nhân 100 lần nữa.',
    strong:'Điểm trên 70 thể hiện bull rõ theo công thức xác suất trạng thái, không phải xác suất lệnh thắng.',
    medium:'Điểm trong vùng 30–70 chưa cho thấy bull hoặc bear rõ; 50 là trung tính.',
    weak:'Điểm dưới 30 thể hiện bear rõ theo xác suất trạng thái. Cần đối chiếu trước khi dùng kế hoạch có hướng.' },
  vol_regime: { group:'state', measure:'Giá lên xuống mạnh hay nhẹ so với nền biến động.', direction:'higher', directionNote:normalizedNote+' Pipeline gốc đã dùng 1 − vol_ratio, sau đó chuẩn hóa. Giá trị âm ở đây nghĩa là kém thuận lợi tương đối; không tự suy ra vol_ratio thực tế.',
    strong:'Điều kiện biến động thuận lợi tương đối trong hồ sơ. Điều này không bảo đảm giá ít giảm hoặc có lãi.',
    medium:'Điều kiện biến động chưa thuộc nhóm thuận lợi mạnh. Cần đối chiếu độ biến động thực với khoảng dừng lỗ.',
    weak:'Điều kiện biến động là điểm yếu tương đối. Cần đối chiếu biên dao động thực với mức dừng lỗ và rủi ro chờ thanh toán.' },
  liquidity: { group:'execution', measure:'Khả năng mua, bán và khớp đủ lượng cổ phiếu.', direction:'higher', directionNote:'50% phân vị log(ADV20) + 50% (100 − phân vị Amihud20), dùng cùng rổ và phiên. Thiếu một thành phần không thay bằng hạng thanh khoản hoặc 50.',
    strong:'Thanh khoản là điểm hỗ trợ để thực hiện kế hoạch. Cần kiểm tra sức chứa và quy mô lệnh để đánh giá trượt giá.',
    medium:'Khả năng giao dịch chưa thuộc nhóm nổi trội. Cần đối chiếu số lượng dự kiến với sức chứa thực tế.',
    weak:'Khả năng giao dịch đang là điểm hạn chế. Không thể suy từ dự báo tốt rằng lệnh sẽ khớp đủ hoặc ít trượt giá.' },
};
export function factorReading(id: string, score: number | null): string {
  if(score==null) return 'Chưa đủ dữ liệu để diễn giải; phần thiếu không được coi là điểm 0 hoặc trung tính.';
  const level=factorLevel(score,id),rule=factorReadingRules[id];
  return `${score.toLocaleString('vi-VN',{maximumFractionDigits:3})}/100 (${factorLevelNames[level]}); ${rule[level as 'strong'|'medium'|'weak']}`;
}
type SummaryFactor = {id:string;label:string;score:number|null};
export function factorQuickRead(rows:readonly SummaryFactor[]) {
  const available=rows.filter((p):p is SummaryFactor & {score:number}=>p.score!=null).slice().sort((a,b)=>b.score-a.score);
  const missing=rows.length-available.length,weak=available.filter(p=>factorLevel(p.score,p.id)==='weak');
  const high=available[0],low=available.at(-1),forecast=available.find(p=>p.id==='forecast_ret'),confidence=available.find(p=>p.id==='forecast_conf');
  const conflict=!!forecast&&!!confidence&&factorLevel(forecast.score,forecast.id)==='strong'&&factorLevel(confidence.score,confidence.id)!=='strong';
  const fmt=(p:SummaryFactor)=>`${p.label} ${p.score?.toLocaleString('vi-VN',{maximumFractionDigits:2})}/100`;
  const chips=[['Cao nhất',high?fmt(high):'Chưa có dữ liệu'],['Thấp nhất',low?fmt(low):'Chưa có dữ liệu'],['Cần lưu ý',missing?`${missing} nhân tố thiếu dữ liệu`:conflict?'Dự báo và tin cậy chưa tương xứng':`${weak.length} nhân tố ở vùng yếu theo ngưỡng riêng`]];
  if(!high||!low)return {chips,paragraph:'Chưa đủ dữ liệu để đọc hồ sơ nhân tố; không thay phần thiếu bằng 0 hoặc 50.',weakIds:[],conflict:false};
  let paragraph=`Cao nhất là ${fmt(high)}, thấp nhất là ${fmt(low)}; tuy nhiên các trục dùng ngưỡng và ý nghĩa riêng, không suy ra tín hiệu mua từ thứ hạng này.`;
  if(weak.length)paragraph+=` Vùng yếu gồm ${weak.map(p=>p.label).join(', ')}.`;
  if(conflict)paragraph+=' Dự báo sau phí cao nhưng độ tin cậy chưa tương xứng.';
  if(missing)paragraph+=` Còn ${missing} nhân tố chưa đủ dữ liệu.`;
  paragraph+=' Alpha tổng hợp dùng trọng số module bằng nhau và cần đọc kèm độ phủ. Cần đối chiếu chỉ số gốc, rủi ro và quyết định của báo cáo.';
  return {chips,paragraph,weakIds:weak.map(p=>p.id),conflict};
}
