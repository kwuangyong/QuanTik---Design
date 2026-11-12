const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {buildSync}=require('esbuild');
function load(file){const out=buildSync({entryPoints:[path.join(__dirname,'../frontend/src/lib',file)],bundle:true,platform:'node',format:'cjs',write:false}),m={exports:{}};new Function('require','module','exports',out.outputFiles[0].text)(require,m,m.exports);return m.exports;}
const shared=load('portfolio-resources.ts'),data=load('portfolio.ts'),source=load('mock-data.ts');
test('Giá và ngành Portfolio khớp nguồn chung, đổi nghìn VND đúng một lần',()=>{
 for(const a of data.portfolioAssets){const original=source.getStock(a.symbol);assert.equal(a.price,original.price*1000);assert.equal(a.sector,original.sector);assert.equal(a.name,original.name);}
 assert.equal(data.portfolioDataInfo.candles,48);assert.equal(data.portfolioDataInfo.observations,47);
});
test('Lợi suất Portfolio được lấy từ close-to-close của đúng nến Quant, không sinh thêm',()=>{
 for(const a of data.portfolioAssets){const candles=source.getDemoCandles(a.symbol,'1D');assert.deepEqual(a.returns,candles.slice(1).map((c,i)=>c.close/candles[i].close-1));}
});
test('Căn chỉnh theo giao phiên; từ chối giá xấu, phiên trùng và thứ tự đảo',()=>{
 const s=[{symbol:'A',candles:[{label:'1',close:10},{label:'2',close:20},{label:'3',close:10},{label:'4',close:20}]},{symbol:'B',candles:[{label:'1',close:20},{label:'3',close:10},{label:'4',close:10}]}];
 const a=shared.alignedCandleReturns(s);assert.deepEqual(a.labels,['3','4']);assert.deepEqual(a.returns,[[0,1],[-.5,0]]);
 for(const candles of [[{label:'1',close:10},{label:'1',close:20}],[{label:'1',close:0},{label:'2',close:20}],[...s[0].candles].reverse()])assert.throws(()=>shared.alignedCandleReturns([s[0],{symbol:'BAD',candles}]));
});
test('Giữ điểm/thứ hạng nguồn, thiếu snapshot không thành 0 và không đổi thành Quant thực',()=>{
 const fpt=shared.portfolioResource('FPT');assert.equal(fpt.screening.status,'NOT_IN_SAMPLE');assert.equal(fpt.screening.score,null);assert.equal(fpt.quant.status,'DEMO');assert.equal(fpt.quant.score,source.getDemoResult('FPT').score);assert.equal(fpt.quant.factors.length,6);
 const dri=shared.portfolioResource('DRI');assert.equal(dri.screening.score,source.getScanResult('DRI').score);assert.equal(dri.screening.status,'SNAPSHOT');
 const missing=shared.portfolioResource('BAD');assert.equal(missing.quant.status,'UNAVAILABLE');assert.equal(missing.quant.score,null);assert.equal(missing.priceVnd,null);
});
function report(){return {report_id:'r',schema_version:'1.0',job_id:'j',symbol:'FPT',target_session:'2026-10-14',evaluated_at:'2026-10-14T10:00:00Z',data_as_of:'2026-10-14',input_mode:'COMPLETED_DAILY',sections:{technical:{status:'AVAILABLE',metrics:{alpha:{cross_sectional:{beta:1.23}}}},decision:{status:'AVAILABLE',metrics:{}},garch:{status:'UNAVAILABLE',metrics:{garch:{garch:{alpha:.1}}}}},decision:{action:'WATCH',executable:false,reason_codes:['TIMING_NOT_READY']},commentary:{},warnings:[],versions:{}};}
test('Báo cáo thực giữ gate nguồn và section availability; không fallback demo hoặc suy mua từ điểm',()=>{
 const a=shared.publishedPortfolioEvidence('FPT','2026-10-14',{report:report()});assert.equal(a.quant.status,'AVAILABLE');assert.equal(a.quant.beta,1.23);assert.equal(a.quant.action,'WATCH');assert.equal(a.quant.executable,false);assert.equal(a.quant.reasons.length,1);assert.equal(a.quant.readings.some(r=>r.module==='garch'),false);
 const none=shared.publishedPortfolioEvidence('FPT','2026-10-14',{});assert.equal(none.quant.status,'MISSING');assert.equal(none.quant.beta,null);assert.equal(none.quant.executable,null);
 const invalid=shared.publishedPortfolioEvidence('VCB','2026-10-14',{report:report()});assert.equal(invalid.quant.status,'MISMATCH');assert.equal(invalid.quant.beta,null);assert.equal(invalid.quant.action,null);
 const wrong=shared.publishedPortfolioEvidence('FPT','2026-10-15',{report:report()});assert.equal(wrong.quant.status,'MISMATCH');
});
test('Screening phân biệt ca cũ, sai ca và mã không có trong tập công bố',()=>{
 const publication={latest:{id:'run',target_session:'2026-10-14',stale:false},results:{run_id:'run',group:'OVERALL',items:[{symbol:'FPT',price_vnd:56300,eligible:false,groups:{}}]}};
 const read=p=>shared.publishedPortfolioEvidence('FPT','2026-10-14',{screening:p});
 assert.equal(read(publication).screening.eligible,false);assert.equal(read(publication).screening.priceVnd,56300);
 assert.equal(read({...publication,latest:{...publication.latest,stale:true}}).screening.status,'STALE');
 assert.equal(read({...publication,results:{...publication.results,run_id:'other'}}).screening.status,'MISMATCH');
 assert.equal(read({...publication,results:{...publication.results,items:[]}}).screening.status,'NOT_LISTED');
});
