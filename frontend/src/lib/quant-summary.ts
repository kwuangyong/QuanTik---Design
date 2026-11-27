import type { AnalysisReport } from './api/analysis';
import { analysisReason } from './api/analysis';
import { actionNames, number, record } from './quant-reader';
import { readDecision } from './quant-decision';

// Summarize published evidence without recalculating signals or overriding the action.
export function quantSummary(report: AnalysisReport): [string,string][] {
 const read=(section:string,path:string):unknown=>{
  const source=report.sections[section];
  if(!source||source.status==='DISABLED'||source.status==='UNAVAILABLE')return undefined;
  let value:unknown=source.metrics;
  for(const key of path.split('.')){const obj=record(value);if(obj.error||obj.disabled===true||obj.available===false)return undefined;value=obj[key];}
  return value;
 };
 const num=(section:string,path:string)=>{const x=read(section,path);return typeof x==='number'&&Number.isFinite(x)?x:null;};
 const support:string[]=[],risks:string[]=[];
 // Phase (HMM), CMF and momentum only describe the observed window; they are not listed as reasons for or against a trade.
 const net=num('costs','costs.net_forecast_pct');
 if(net!=null){if(net>0)support.push(`dự báo sau phí còn +${number(net)}%`);else risks.push(`dự báo sau phí ${number(net)}%`);}
 const dd=num('statistics','stats.max_dd_pct'),lock=num('simulation_risk','simulation_risk.lock_risk.prob_loss_gt_3pct');
 if(dd!=null&&dd<0)risks.push(`lịch sử từng giảm ${number(Math.abs(dd))}% từ đỉnh`);
 if(lock!=null&&lock>=0&&lock<=100)risks.push(`mô phỏng có ${number(lock)}% khả năng lỗ trên 3% khi chờ cổ phiếu về`);
 if(read('liquidity','liquidity.pass')===false)risks.push('khả năng mua bán chưa đạt yêu cầu');
 const missing=Object.entries(report.sections).filter(([key,s])=>key!=='commentary'&&(s.status==='UNAVAILABLE'||s.status==='DISABLED')).length;
 const coverage=num('agreement','fcast.coverage_pct');
 const quality=read('data_quality','data_quality.status');
 const limits=[missing?`${missing} module chưa có kết quả dùng được`:null,coverage!=null&&coverage<100?`mới có ${number(coverage)}% mô hình tham gia dự báo`:null,quality==='FAIL'?'dữ liệu đầu vào chưa đạt':null,report.warnings.length?`${report.warnings.length} cảnh báo cần đọc thêm`:null].filter(Boolean);
 const decision=readDecision(report);
 const action=actionNames[decision.action]||decision.action||'Chưa có kết luận';
 const reason=decision.reasonCodes[0];
 return [
  ['Các điểm mô tả',support.length?support.join('; ')+'.':'Chưa đủ kết quả để nêu các điểm mô tả.'],
  ['Rủi ro chính',risks.length?risks.join('; ')+'.':'Chưa đủ kết quả để tóm tắt rủi ro; không có nghĩa là không có rủi ro.'],
  ['Phần còn thiếu',limits.length?limits.join('; ')+'.':'Không có module nào báo thiếu hoặc tắt; vẫn cần đọc giới hạn của từng mô hình.'],
  ['Kết luận',`${action}. ${decision.executable===true?'Báo cáo xác nhận các điều kiện thực thi đã đạt.':reason?analysisReason(String(reason)):'Chưa được xác nhận đủ điều kiện thực thi.'}`]
 ];
}
