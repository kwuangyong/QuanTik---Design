"use client";
import {type ReactNode} from "react";
import {analysisReason,type AnalysisReport,type QuantResearch} from "@/lib/api/analysis";
import {at,metricText,number,researchFor} from "@/lib/quant-reader";
import {moduleEvidenceReadings} from "@/content/quant-module-readings";
import {readableMetrics} from "@/lib/quant-presentation";
import {LinePlot,Histogram} from "./quant-research";
import {QuantScenarioView} from "./quant-scenario-3d";
import {QuantGarchView} from "./quant-report-views";
import {QuantFactorProfile} from "./quant-factor-profile";
import {HmmPhaseTriangle} from "./hmm-phase-triangle";
import TermHint from "./term-hint";
const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const numeric=(v:unknown):number[]=>Array.isArray(v)&&v.every(finite)?v:[];
function Missing({text="Báo cáo chưa công bố dữ liệu phù hợp để vẽ biểu đồ này."}:{text?:string}) {return <p className="flex min-h-40 items-center justify-center text-center text-[13px] leading-6 text-[var(--muted)]">{text}</p>;}
function Gauge({label,value,min=0,max=1,term}:{label:string;value:unknown;min?:number;max?:number;term:string}) {
 if(!finite(value)||value<min||value>max)return <p className="py-3 text-[13px] text-[var(--muted)]">{label}: chưa có giá trị hợp lệ.</p>;
 const x=12+(value-min)/(max-min)*276;
 return <div className="py-2"><div className="flex items-center justify-between gap-3 text-[13px]"><TermHint id={term}>{label}</TermHint><strong className="font-mono font-normal">{number(value)}</strong></div><svg role="img" aria-label={`${label}: ${number(value)} trên miền ${min} đến ${max}`} viewBox="0 0 300 44" className="mt-2 block w-full"><line x1="12" y1="12" x2="288" y2="12" stroke="var(--border)" strokeWidth="5"/>{min<0&&<line x1="150" y1="5" x2="150" y2="20" stroke="var(--muted)"/>}<circle cx={x} cy="12" r="5" fill="var(--accent)"/><text x="12" y="38" fill="var(--muted)" fontSize="13">{min}</text><text x="288" y="38" textAnchor="end" fill="var(--muted)" fontSize="13">{number(max)}</text></svg></div>;
}
function PercentBars({rows}:{rows:[string,unknown,string][]}) {return <div className="grid gap-5 py-4">{rows.map(([label,value,term])=><div key={label}><div className="mb-2 flex justify-between gap-3 text-[13px]"><TermHint id={term}>{label}</TermHint><span className="font-mono">{number(value,"%")}</span></div>{finite(value)&&value>=0&&value<=100?<div role="img" aria-label={`${label}: ${number(value,"%")}`} className="h-3 rounded-sm bg-[var(--raised)]"><div className="h-full rounded-sm bg-[var(--accent)] opacity-70" style={{width:`${value}%`}}/></div>:<p className="text-[13px] text-[var(--muted)]">Chưa có tỷ lệ hợp lệ.</p>}</div>)}</div>;}
function historicalHistogram(prices:number[]):QuantResearch["distribution"] {
 const returns=prices.slice(1).flatMap((p,i)=>p>0&&prices[i]>0?[(p/prices[i]-1)*100]:[]);if(returns.length<2)return [];
 const low=Math.min(...returns),high=Math.max(...returns),span=Math.max(high-low,.01),bins=Math.min(12,Math.max(2,Math.ceil(Math.sqrt(returns.length)))),counts=Array.from({length:bins},()=>0);
 for(const value of returns)counts[Math.min(bins-1,Math.floor((value-low)/span*bins))]++;
 return counts.map((count,i)=>({lowerPct:low+i*span/bins,upperPct:low+(i+1)*span/bins,returnPct:low+(i+.5)*span/bins,probabilityPct:count/returns.length*100}));
}
function CostBars({metrics}:{metrics:Record<string,unknown>}) {
 const rows=[["Trước chi phí",at(metrics,"costs.gross_forecast_pct"),"action_gross"],["Chi phí hai chiều",at(metrics,"costs.roundtrip_cost_pct"),"action_cost"],["Sau chi phí",at(metrics,"costs.net_forecast_pct"),"action_net"]] as const,max=Math.max(...rows.map(([,v])=>finite(v)?Math.abs(v):0),.01);
 return <div className="grid gap-5 py-3">{rows.map(([label,v,term],i)=><div key={label}><div className="mb-2 flex justify-between gap-3 text-[13px]"><TermHint id={term}>{label}</TermHint><span className="font-mono">{number(v,"%")}</span></div><div className="relative h-4 bg-[var(--raised)]"><span className="absolute inset-y-0 left-1/2 border-l border-[var(--muted)]"/>{finite(v)&&<span className="absolute inset-y-1" style={{width:`${Math.abs(v)/max*49}%`,left:`${v<0?50-Math.abs(v)/max*49:50}%`,background:i===1?"var(--neutral)":v<0?"var(--negative)":"var(--positive)"}}/>}</div></div>)}<p className="text-[13px] text-[var(--muted)]">Cùng thang %; chi phí là khoản bị trừ, không phải lợi nhuận.</p></div>;
}
function TradeLevels({metrics}:{metrics:Record<string,unknown>}) {
 const levels=[["SL",at(metrics,"sl.sl_swing"),"stop_loss"],["Entry",at(metrics,"sl.entry"),"entry"],["TP1",at(metrics,"sl.tp1"),"take_profit"],["TP2",at(metrics,"sl.tp2"),"take_profit"]] as const;
 if(!levels.every(([,v])=>finite(v)&&v>0))return <Missing/>;
 const values=levels.map(([,v])=>Number(v));if(!(values[0]<values[1]&&values[1]<values[2]&&values[2]<=values[3]))return <Missing text="Các mức giá chưa tạo thành thứ tự SL < Entry < TP1 ≤ TP2 hợp lệ. Giữ số liệu công bố để đối chiếu."/>;
 return <><svg role="img" aria-label="Khoảng giá SL, Entry, TP1 và TP2 theo VND" viewBox="0 0 440 130" className="my-6 block w-full"><line x1="25" y1="58" x2="415" y2="58" stroke="var(--border)" strokeWidth="3"/>{levels.map(([label,v],i)=>{const x=25+(Number(v)-values[0])/(values[3]-values[0])*390;return <g key={label}><circle cx={x} cy="58" r="6" fill={i===0?"var(--negative)":i===1?"var(--accent)":"var(--positive)"}/><text x={x} y={i%2?25:95} textAnchor="middle" fill="var(--muted)" fontSize="13">{label}</text></g>;})}</svg><dl className="grid grid-cols-2 gap-4 text-[13px]">{levels.map(([label,v,term])=><div key={label}><dt className="text-[var(--muted)]"><TermHint id={term}>{label}</TermHint></dt><dd className="mt-1 font-mono">{number(v," VND")}</dd></div>)}</dl></>;
}
export function QuantModuleEvidence({name,report,metrics,available}:{name:string;report:AnalysisReport;metrics:Record<string,unknown>;available:boolean}) {
 const research=researchFor(report),[title,explanation]=moduleEvidenceReadings[name]||["Bằng chứng","Đối chiếu kết quả với dữ liệu đầu vào."];
 let chart:ReactNode=null;
 if(!available||report.sections[name]?.status==="DISABLED")chart=<Missing text="Module chưa có kết quả khả dụng để dựng biểu đồ. Các giải thích phương pháp vẫn được giữ bên dưới."/>;
 else switch(name){
 case "statistics":chart=<LinePlot title={`Sụt giảm trong module hiệu suất ${report.symbol}`} unit="%" drawdown rows={research.drawdown.map((p,i)=>({x:i,value:p.valuePct,label:p.date}))}/>;break;
 case "distribution":chart=<Histogram title="Phân phối lợi suất lịch sử" observation="quan sát" data={historicalHistogram(numeric(readableMetrics(report.sections.statistics)._price_close))}/>;break;
 case "arima":{const prices=numeric(at(metrics,"arima.forecast.prices"));chart=prices.length>=2?<LinePlot title="Dự báo giá riêng ARIMA" unit="VND" rows={prices.map((value,i)=>({x:i+1,value}))}/>:<><Gauge label="ADF p-value" term="module_adf_p" value={at(metrics,"arima.stationarity.adf_p")}/><p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">Chưa có chuỗi forecast ARIMA để vẽ đường giá. Thang p-value không phải thang xác suất mô hình đúng.</p></>;break;}
 case "garch":chart=<QuantGarchView report={report}><LinePlot title="Đường biến động trong module GARCH" unit="% / phiên" rows={numeric(at(metrics,"garch.garch.forecast_vol")).map((value,i)=>({x:i+1,value}))}/></QuantGarchView>;break;
 case "hmm":chart=<><PercentBars rows={[["BULL",at(metrics,"hmm.state_probs.BULL"),"module_hmm_bull"],["SIDEWAY",at(metrics,"hmm.state_probs.SIDEWAY"),"module_hmm_sideway"],["BEAR",at(metrics,"hmm.state_probs.BEAR"),"module_hmm_bear"]]}/>{!!research.regime.length&&<LinePlot title="Lịch sử trạng thái trong module HMM" unit="VND" regime rows={research.regime.map((p,i)=>({x:i,value:p.price,label:p.date,state:p.state}))}/>}</>;break;
 case "technical":chart=<><Gauge label="CMF" term="cmf" value={at(metrics,"flow.cmf")} min={-1}/><Gauge label="ER" term="module_er" value={at(metrics,"trend.er")}/><Gauge label="R²" term="module_r2" value={at(metrics,"trend.r2")}/></>;break;
 case "context":chart=<><Gauge label="Tương quan trung bình ngành" term="module_sector_corr" value={at(metrics,"cross_corr.avg_pairwise_corr")} min={-1}/><p className="mt-4 text-[13px] leading-6 text-[var(--muted)]">Ngành: {metricText(at(metrics,"sector.name"))} · Xu hướng: {metricText(at(metrics,"sector.trend.trend_label"))}. Báo cáo chưa cung cấp chuỗi chỉ số ngành để dựng đường giá ngành.</p></>;break;
 case "agreement":chart=<PercentBars rows={[["Đồng thuận",at(metrics,"fcast.agreement_pct"),"action_agreement"],["Độ phủ",at(metrics,"fcast.coverage_pct"),"model_coverage"],["Mức ủng hộ",at(metrics,"fcast.support_pct"),"directional_support_pct"]]}/>;break;
 case "simulation_risk":chart=<><QuantScenarioView report={report} kind="monte"><LinePlot title="Dải giá trong module Monte Carlo" unit="VND" band rows={research.cone.map(p=>({x:p.session,value:p.p50,low:p.p05,innerLow:p.p25,innerHigh:p.p75,high:p.p95}))}/></QuantScenarioView><details className="mt-4 text-[13px]"><summary className="cursor-pointer text-[var(--accent)]">Xem phân phối cuối kỳ</summary><Histogram title="Phân phối cuối kỳ trong module Monte Carlo" data={research.distribution}/></details></>;break;
 case "costs":chart=<CostBars metrics={metrics}/>;break;
 case "trade_plan":chart=<TradeLevels metrics={metrics}/>;break;
 case "liquidity":{const ratio=at(metrics,"liquidity.value_ratio_5_20");chart=<><Gauge label="Tỷ lệ thanh khoản 5/20" term="module_liquidity_ratio" value={ratio} max={finite(ratio)?Math.max(2,ratio):2}/><p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">Mốc so sánh: 1× · Sức chứa công bố: {number(at(metrics,"liquidity.capacity_shares")," cổ phiếu")}.</p></>;break;}
 case "data_quality":chart=<><Gauge label="Điểm dữ liệu / 100" term="module_quality_score" value={at(metrics,"data_quality.score")} max={100}/><p className="mt-3 text-[13px] leading-6">Trạng thái: {metricText(at(metrics,"data_quality.status"))}</p>{report.warnings.length>0&&<ul className="mt-3 list-inside list-disc text-[13px] leading-6 text-[var(--muted)]">{report.warnings.map((warning,i)=><li key={i}>{analysisReason(warning)}</li>)}</ul>}</>;break;
 case "decision":chart=<div className="grid gap-3">{[["Cổng điều kiện",at(metrics,"action.gate_pass"),"module_gate"],["Thực thi",at(metrics,"action.executable"),"action_executable"]].map(([label,value,term])=><div key={String(label)} className="flex justify-between gap-3 rounded border border-[var(--border)] p-4 text-[13px]"><TermHint id={String(term)}>{String(label)}</TermHint><span className={value===true?"text-[var(--positive)]":"text-[var(--muted)]"}>{value===true?"Đạt":value===false?"Chưa đạt":"Chưa công bố"}</span></div>)}</div>;break;
 case "commentary":chart=<QuantFactorProfile data={research.factors}/>;break;
 }
 return <div className="grid min-w-0 gap-3"><article className="min-w-0 rounded border border-[var(--border)] p-4"><h5 className="mb-4 text-[13px] font-medium">Biểu đồ & bằng chứng</h5>{chart||<Missing/>}</article><details className="min-w-0 rounded border border-[var(--border)] p-4"><summary className="cursor-pointer text-sm font-medium text-[var(--accent)]">Cách đọc biểu đồ · Bấm để mở</summary><h5 className="mt-3 text-base font-medium leading-7">{title}</h5><p className="mt-3 text-[13px] leading-7 text-[var(--muted)]">{explanation}</p><p className="mt-4 border-t border-[var(--border)] pt-4 text-[13px] leading-6 text-[var(--muted)]">Bấm vào tên chỉ số để xem định nghĩa, công thức, ví dụ và điều kiện sử dụng. Kết quả thiếu được giữ rõ trạng thái.</p></details>{name==="hmm"&&<HmmPhaseTriangle report={report}/>}</div>;
}
