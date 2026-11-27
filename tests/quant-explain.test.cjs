const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {buildSync} = require('esbuild');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function load(file) {
 const result=buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react-dom','react/jsx-runtime']});
 const m={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,m,m.exports);return m.exports;
}
const {quantReportSample,quantSampleCases}=load('frontend/tests/fixtures/quant-report-sample.ts');
const {buildExplain,explainToneContract,explainGroupDefs}=load('frontend/src/lib/quant-explain.ts');
const {QuantExplain}=load('frontend/src/components/quant-explain.tsx');
const {quantModuleNames}=load('frontend/src/lib/quant-glossary.ts');
const text=html=>html.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ');
const BANNED=/undefined|NaN|Infinity|null|tín hiệu|Haiku|nên mua|nên bán|mua ngay|bán ngay|chắc chắn|!/i;
const flat=groups=>groups.flatMap(g=>g.cards);
const cardText=c=>[c.chip,c.badge,c.verdict,c.why,c.caution,...c.numbers.flatMap(n=>[n.label,n.value,n.ref])].join(' | ');

test('Groups come in the order C, A, B, D then the trust strip, with all 16 modules once',()=>{
 const groups=buildExplain(quantReportSample('complete'));
 assert.deepEqual(groups.map(g=>g.id),['C','A','B','D','T']);
 assert.deepEqual(groups.map(g=>g.cards.map(c=>c.module)),[['garch','simulation_risk','distribution','liquidity'],['statistics','technical','hmm','context'],['arima','directional_alpha','agreement'],['trade_plan','costs','decision'],['data_quality','commentary']]);
 assert.deepEqual(flat(groups).map(c=>c.module).sort(),[...quantModuleNames].sort());
 assert.equal(explainGroupDefs.length,5);
});
test('16 modules x 5 scenarios: complete 4-part frame, no undefined/NaN, no banned wording, at most 3 figures',()=>{
 for(const scenario of quantSampleCases){
  const report=quantReportSample(scenario),before=JSON.stringify(report),cards=flat(buildExplain(report));
  assert.equal(cards.length,16,scenario);
  for(const c of cards){
   const t=cardText(c),id=`${scenario}/${c.module}`;
   assert.doesNotMatch(t,BANNED,id);
   for(const part of ['verdict','why','caution','chip','title'])assert.ok(c[part]&&c[part].trim().length>0,`${id} ${part}`);
   assert.ok(c.numbers.length>=1&&c.numbers.length<=3,id);
   assert.ok(['ok','neutral','caution','risk','nodata'].includes(c.tone),id);
   assert.ok(explainToneContract[c.module].includes(c.tone),`${id}: tone ${c.tone} is not backed by a threshold`);
  }
  assert.equal(JSON.stringify(report),before,`${scenario}: report mutated`);
 }
});
test('Unavailable, disabled and failed scenarios show missing data and never a stale number',()=>{
 for(const scenario of ['unavailable','disabled','failed']){
  for(const c of flat(buildExplain(quantReportSample(scenario)))){
   const id=`${scenario}/${c.module}`;
   assert.equal(c.tone,'nodata',id);
   assert.equal(c.state,scenario==='disabled'?'disabled':'missing',id);
   assert.equal(c.chip,scenario==='disabled'?'Đã tắt':'Chưa đủ dữ liệu',id);
   for(const n of c.numbers)assert.equal(n.value,'—',`${id}: ${n.label}`);
   assert.doesNotMatch(cardText(c),/100\.000|102\.000|412|24,5|3\.000\.000|72\/100|\b95\b|1\.000 lần/,id);
  }
 }
});
test('Partial scenario keeps the frame, marks "Một phần" and uses only real numbers',()=>{
 const cards=flat(buildExplain(quantReportSample('partial')));
 const by=Object.fromEntries(cards.map(c=>[c.module,c]));
 assert.match(by.arima.badge,/Một phần/);assert.equal(by.arima.state,'partial');assert.equal(by.trade_plan.state,'ready');
 assert.equal(by.arima.numbers[2].value,'—');
 assert.match(by.arima.numbers[2].ref,/chưa có chuỗi dự báo/);
 assert.equal(by.garch.tone,'caution');
});
test('Complete scenario follows the spec wording and thresholds',()=>{
 const by=Object.fromEntries(flat(buildExplain(quantReportSample('complete'))).map(c=>[c.module,c]));
 assert.equal(by.garch.tone,'caution');
 assert.match(by.garch.verdict,/khoảng 2% mỗi phiên và cú sốc có thể kéo dài/);
 assert.deepEqual(by.garch.numbers.map(n=>n.value),['2 %/phiên','0,96','17 phiên']);
 assert.equal(by.simulation_risk.tone,'neutral');
 assert.match(by.simulation_risk.verdict,/Khoảng 62 trong mỗi 100 lần \(từ 1\.000 lần mô phỏng\)/);
 assert.match(by.simulation_risk.why,/Khoảng 8 trong mỗi 100 lần \(khoảng 80 trên 1\.000 lần mô phỏng\) lỗ hơn 3%/);
 assert.match(by.simulation_risk.why,/theo quy định hiện hành của công ty chứng khoán/);
 assert.equal(by.distribution.tone,'caution');
 assert.equal(by.liquidity.tone,'ok');
 assert.equal(by.liquidity.numbers[0].value,'120 tỷ');
 assert.equal(by.statistics.tone,'neutral');
 assert.match(by.statistics.why,/giữa mốc khá \(1\) và rất tốt \(2\)/);
 assert.match(by.statistics.why,/mỗi 100 đồng ở đỉnh từng còn khoảng 88 đồng/);
 assert.equal(by.arima.tone,'ok');assert.equal(by.arima.chip,'Đạt mốc ADF');
 assert.equal(by.agreement.tone,'caution');
 assert.match(by.agreement.verdict,/mới 80% mô hình tham gia/);
 assert.equal(by.costs.tone,'neutral');
 assert.equal(by.costs.verdict,'Dự báo gộp 4,1%, trừ phí còn 3,5%.');
 assert.equal(by.decision.tone,'caution');
 assert.match(by.decision.verdict,/Mô hình: theo dõi/);
 assert.equal(by.data_quality.tone,'ok');
 assert.equal(by.trade_plan.tone,'neutral');
 assert.match(by.trade_plan.verdict,/lỗ ước tính khoảng 1% tài sản \(3\.000\.000 VND\)/);
 assert.match(by.trade_plan.why,/3,33/);
 assert.match(by.trade_plan.why,/công thức chưa công bố/);
 assert.doesNotMatch(by.trade_plan.verdict,/100 triệu/);
});
test('Momentum, CMF and trend modules are description-only and say "chưa chứng minh dự báo được ngoài mẫu"',()=>{
 const by=Object.fromEntries(flat(buildExplain(quantReportSample('complete'))).map(c=>[c.module,c]));
 for(const name of ['technical','directional_alpha','hmm']){
  assert.equal(by[name].tone,'neutral',name);
  assert.match(`${by[name].verdict} ${by[name].caution}`,/hưa chứng minh dự báo được ngoài mẫu/,name);
  assert.doesNotMatch(cardText(by[name]),/áp lực mua|nghiêng về bên mua|xu hướng tốt|hỗ trợ/,name);
 }
 assert.match(by.directional_alpha.verdict,/^Điểm động lượng 0,4 \(dương\), chỉ mô tả quá khứ/);
 assert.match(by.commentary.why,/hưa chứng minh dự báo được ngoài mẫu/);
 assert.doesNotMatch(by.commentary.why,/CMF|HMM|pha tăng|động lượng/);
});
test('HMM: probability kind is named only when published, otherwise "Chưa rõ loại xác suất"',()=>{
 const none=quantReportSample('complete');delete none.sections.hmm.metrics.hmm.probability_kind;
 const hmm=buildExplain(none).flatMap(g=>g.cards).find(c=>c.module==='hmm');
 assert.match(hmm.badge,/Chưa rõ loại xác suất/);assert.match(hmm.why,/Chưa rõ loại xác suất/);
 assert.doesNotMatch(cardText(hmm),/lọc\b(?!\/)/);
 const filtered=buildExplain(quantReportSample('complete')).flatMap(g=>g.cards).find(c=>c.module==='hmm');
 assert.equal(filtered.badge,'Xác suất lọc');
 const fb=quantReportSample('complete');fb.sections.hmm.metrics.hmm.method='fallback';
 const fall=buildExplain(fb).flatMap(g=>g.cards).find(c=>c.module==='hmm');
 assert.equal(fall.tone,'nodata');assert.deepEqual(fall.numbers.map(n=>n.value),['—','—','—']);
});
test('Threshold boundaries: persistence 0,9 and 1, ADF 0,05, coverage 100, kurtosis 0, liquidity pass, data quality',()=>{
 const tone=(mutate,name)=>{const r=quantReportSample('complete');mutate(r);return buildExplain(r).flatMap(g=>g.cards).find(c=>c.module===name).tone;};
 const g=v=>r=>{r.sections.garch.metrics.garch.garch.persistence=v;};
 assert.equal(tone(g(.89),'garch'),'neutral');assert.equal(tone(g(.9),'garch'),'caution');assert.equal(tone(g(.99),'garch'),'caution');assert.equal(tone(g(1),'garch'),'risk');
 const a=v=>r=>{r.sections.arima.metrics.arima.stationarity.adf_p=v;};
 assert.equal(tone(a(.049),'arima'),'ok');assert.equal(tone(a(.05),'arima'),'caution');
 const cov=v=>r=>{r.sections.agreement.metrics.fcast.coverage_pct=v;};
 assert.equal(tone(cov(100),'agreement'),'neutral');assert.equal(tone(cov(99),'agreement'),'caution');
 const k=(v,gs)=>r=>{r.sections.distribution.metrics.dist.excess_kurtosis=v;r.sections.distribution.metrics.dist.verdict.is_gaussian=gs;};
 assert.equal(tone(k(0,true),'distribution'),'neutral');assert.equal(tone(k(.01,true),'distribution'),'caution');assert.equal(tone(k(0,false),'distribution'),'caution');
 assert.equal(tone(r=>{r.sections.liquidity.metrics.liquidity.pass=false;},'liquidity'),'risk');
 assert.equal(tone(r=>{r.sections.data_quality.metrics.data_quality.status='FAIL';},'data_quality'),'risk');
 assert.equal(tone(r=>{r.sections.data_quality.metrics.data_quality.status='WARN';},'data_quality'),'neutral');
 assert.equal(tone(r=>{r.sections.trade_plan.metrics.sl.sl_swing=101000;},'trade_plan'),'caution');
 assert.equal(tone(r=>{r.sections.decision.metrics.action.executable=true;r.decision.executable=true;},'decision'),'ok');
 // No threshold exists for Sharpe, the Monte Carlo loss frequency or the net forecast: the chip stays "Mô tả".
 assert.equal(tone(r=>{r.sections.statistics.metrics.stats.sharpe=-3;},'statistics'),'neutral');
 assert.equal(tone(r=>{r.sections.simulation_risk.metrics.simulation_risk.lock_risk.prob_loss_gt_3pct=60;},'simulation_risk'),'neutral');
 assert.equal(tone(r=>{r.sections.costs.metrics.costs.net_forecast_pct=-2;},'costs'),'neutral');
});
test('Rendered layer: 16 cards, each with a link to its deep module, no banned wording, five scenarios',()=>{
 for(const scenario of quantSampleCases){
  const html=renderToStaticMarkup(React.createElement(QuantExplain,{report:quantReportSample(scenario)})),t=text(html);
  const hit=t.match(BANNED);assert.equal(hit,null,`${scenario}: ${hit&&t.slice(Math.max(0,hit.index-30),hit.index+30)}`);
  assert.equal((html.match(/data-explain-module=/g)||[]).length,16,scenario);
  assert.equal((html.match(/data-explain-open=/g)||[]).length,16,scenario);
  assert.equal((html.match(/data-explain-group=/g)||[]).length,5,scenario);
  assert.match(t,/Kết luận:/);assert.match(t,/Vì sao/);assert.match(t,/Lưu ý/);assert.match(t,/Xem chi tiết ở lớp Chuyên sâu/);
 }
});
