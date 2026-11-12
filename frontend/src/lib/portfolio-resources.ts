import { getStock, getScanResult, getDemoResult, getDemoCandles, getAnalysisVisuals, marketSnapshotInfo, scanSnapshot } from "./mock-data";
import { factorProfile } from "./factor-profile";
import { at, moduleReading } from "./quant-reader";
import { analysisReason, type AnalysisReport } from "./api/analysis";
import type { ScreeningLatest, ScreeningResults } from "./api/screening";
import type { Asset } from "./portfolio-engine";

/** Ranh giới nguồn: fixture được ghi rõ là mẫu; báo cáo thực không fallback sang mẫu. */
export function portfolioResource(symbol: string) {
  const stock = getStock(symbol), scan = getScanResult(symbol), demo = getDemoResult(symbol), visual = getAnalysisVisuals(symbol);
  const candles = getDemoCandles(symbol,"1D");
  const price = stock?.price;
  if (marketSnapshotInfo.priceUnit !== "nghìn đồng") throw new Error("Chưa hỗ trợ đơn vị giá của snapshot này.");
  return {
    symbol, name:stock?.name ?? null, sector:stock?.sector ?? null,
    priceVnd:typeof price==="number" && Number.isFinite(price) && price>0 ? price*1000 : null,
    priceAsOf:marketSnapshotInfo.asOf, priceLabel:marketSnapshotInfo.captureLabel,
    candles, visual,
    screening:scan ? {status:"SNAPSHOT" as const,score:scan.score,label:scan.recommendation,source:scanSnapshot.source.publishedLabel} : {status:"NOT_IN_SAMPLE" as const,score:null,label:"Không thuộc 10 dòng snapshot",source:scanSnapshot.source.publishedLabel},
    quant:demo&&visual ? {status:"DEMO" as const,score:demo.score,label:demo.recommendation,factors:factorProfile(demo,visual)} : {status:"UNAVAILABLE" as const,score:null,label:"Chưa có Quant mẫu",factors:[]},
  };
}

type Candle = {label:string;close:number};
export function alignedCandleReturns(series:{symbol:string;candles:Candle[]}[]) {
  if(!series.length) throw new Error("Thiếu chuỗi giá dùng chung.");
  for(const {candles} of series) if(candles.length<2 || new Set(candles.map(c=>c.label)).size!==candles.length || candles.some(c=>!c.label || !Number.isFinite(c.close) || c.close<=0)) throw new Error("Nến thiếu, trùng phiên hoặc có giá không hợp lệ.");
  const common=series[0].candles.map(c=>c.label).filter(label=>series.every(s=>s.candles.some(c=>c.label===label)));
  if(common.length<3) throw new Error("Cần ít nhất ba nến chung để tính covariance.");
  for(const s of series) if(s.candles.filter(c=>common.includes(c.label)).map(c=>c.label).join("|")!==common.join("|")) throw new Error("Các chuỗi không cùng thứ tự phiên.");
  return {labels:common.slice(1),returns:series.map(s=>{const closes=common.map(label=>s.candles.find(c=>c.label===label)!.close);return closes.slice(1).map((close,i)=>close/closes[i]-1);})};
}

export function sharedPortfolioAssets(definitions:{symbol:string;beta:number;color:string}[]) {
  const resources=definitions.map(d=>portfolioResource(d.symbol));
  const aligned=alignedCandleReturns(resources.map(r=>({symbol:r.symbol,candles:r.candles})));
  const assets:Asset[]=resources.map((r,i)=>{
    if(r.priceVnd===null || !r.name || !r.sector) throw new Error(`Thiếu giá/ngành dùng chung của ${r.symbol}.`);
    return {symbol:r.symbol,name:r.name,sector:r.sector,price:r.priceVnd,beta:definitions[i].beta,color:definitions[i].color,returns:aligned.returns[i]};
  });
  return {assets,resources,observations:aligned.labels.length,labels:aligned.labels};
}

/** Chuẩn hóa đầu ra đã công bố; chỉ nhận đúng mã, phiên, ca và section khả dụng. */
export function publishedPortfolioEvidence(symbol:string,session:string,input:{screening?:{latest:ScreeningLatest;results:ScreeningResults};report?:AnalysisReport}) {
  const publication=input.screening,report=input.report;
  const scanState=!publication?"MISSING":publication.latest.id!==publication.results.run_id||publication.latest.target_session!==session?"MISMATCH":publication.latest.stale?"STALE":"AVAILABLE";
  const item=scanState==="AVAILABLE"?publication!.results.items.find(i=>i.symbol===symbol):undefined;
  const reportState=!report?"MISSING":report.symbol!==symbol||(report.target_session||report.data_as_of.slice(0,10))!==session?"MISMATCH":"AVAILABLE";
  const section=(name:string)=>reportState==="AVAILABLE"&&report!.sections[name]?.status==="AVAILABLE"?report!.sections[name].metrics:null;
  const value=(name:string,path:string)=>{const v=at(section(name),path);return typeof v==="number"&&Number.isFinite(v)?v:null;};
  const hasDecision=section("decision")!==null;
  return {
    symbol,session,screening:{status:scanState==="AVAILABLE"&&!item?"NOT_LISTED":scanState,priceVnd:item?.price_vnd??null,eligible:item?.eligible??null,groups:item?.groups??null},
    quant:{status:reportState,beta:value("technical","alpha.cross_sectional.beta"),
      action:hasDecision&&typeof report!.decision.action==="string"?report!.decision.action:null,
      executable:hasDecision&&typeof report!.decision.executable==="boolean"?report!.decision.executable:null,
      reasons:hasDecision&&Array.isArray(report!.decision.reason_codes)?report!.decision.reason_codes.filter((c):c is string=>typeof c==="string").map(analysisReason):[],
      readings:["statistics","technical","garch","hmm","liquidity"].flatMap(name=>{const metrics=section(name);return metrics?[{module:name,text:moduleReading(name,metrics)}]:[]})},
  };
}
