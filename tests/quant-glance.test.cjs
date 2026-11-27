const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {buildSync} = require('esbuild');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function load(file) {
 const result=buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react-dom','katex']});
 const m={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,m,m.exports);return m.exports;
}
const {quantReportSample,quantSampleCases}=load('frontend/tests/fixtures/quant-report-sample.ts');
const {QuantGlance}=load('frontend/src/components/quant-glance.tsx');
const {LiveQuantReport}=load('frontend/src/components/quant-live-report.tsx');
const {buildGlance}=load('frontend/src/lib/quant-glance.ts');
const text=html=>html.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ');
const render=report=>renderToStaticMarkup(React.createElement(QuantGlance,{report}));
// The module-less scenarios keep stale numbers on purpose (fixture): these must never reach the glance layer.
const STALE=/102\.000|3\.000\.000|72\/100|Khoảng|trong mỗi 100|24,5|25%|95\/100|1,2\b/;

test('Summary layer: five scenarios render without undefined/NaN, prohibited wording or imperative advice',()=>{
 for(const scenario of quantSampleCases){
  const report=quantReportSample(scenario),before=JSON.stringify(report),html=render(report),t=text(html);
  assert.doesNotMatch(t,/undefined|NaN|Infinity|null/,scenario);
  assert.doesNotMatch(t,/tín hiệu|điểm hỗ trợ|đà nghiêng/i,scenario);
  assert.doesNotMatch(t,/mua ngay|bán ngay|nên mua|nên bán|chắc chắn|đảm bảo|!/i,scenario);
  assert.match(t,/Có tin được báo cáo không\?/,scenario);
  assert.match(t,/không phải lời khuyên đầu tư/,scenario);
  assert.match(t,/\[chờ rà soát pháp lý VN\]/,scenario);
  assert.equal(JSON.stringify(report),before,scenario);
 }
});
test('Complete: verdict is a model label, risk is a natural frequency from real data, at most three headline numbers',()=>{
 const report=quantReportSample('complete'),t=text(render(report));
 assert.match(t,/Mô hình: theo dõi/);
 assert.match(t,/Chưa đủ điều kiện thời điểm vào lệnh\./);
 assert.match(t,/khoảng 8 trong mỗi 100 lần \(từ 1\.000 lần mô phỏng\) lỗ hơn 3% khi chờ cổ phiếu về/);
 assert.match(t,/khi chờ cổ phiếu về tài khoản \(theo quy định hiện hành của công ty chứng khoán\)/);
 assert.match(t,/Lịch sử từng giảm tới 12% từ đỉnh/);
 const g=buildGlance(report);
 assert.ok(g.numbers.length<=3);
 assert.deepEqual(g.numbers.map(n=>n.value),['72/100','1% tài sản','102.000']);
 for(const n of g.numbers)assert.ok(n.note.length>0,n.id);
 assert.equal(g.risk.frequency.perHundred,8);assert.equal(g.risk.frequency.simulations,1000);
 assert.match(t,/Đạt 95\/100/);assert.match(t,/Thận trọng 80%/);assert.match(t,/Dữ liệu đến 2026-10-16/);
 assert.deepEqual(g.groups.map(x=>x.id),['C','A','B','D']);
 const html=render(report),order=['C','A','B','D'].map(id=>html.indexOf(`data-glance-group="${id}"`));
 assert.ok(order.every(i=>i>0)&&order.every((v,i)=>i===0||v>order[i-1]),String(order));
});
test('Partial keeps real numbers and marks the group as partial; frequency never derives from simulation count',()=>{
 const report=quantReportSample('partial'),g=buildGlance(report);
 assert.equal(g.risk.frequency.perHundred,8);
 assert.ok(g.groups.some(x=>x.chip==='Một phần'||x.chip==='Có dữ liệu'));
 const missing=JSON.parse(JSON.stringify(report));delete missing.research.simulation_count;
 const t=text(render(missing));assert.match(t,/số lần mô phỏng chưa công bố/);assert.doesNotMatch(t,/1\.000 lần/);
 const noRisk=JSON.parse(JSON.stringify(report));delete noRisk.sections.simulation_risk.metrics.simulation_risk.lock_risk;
 assert.equal(buildGlance(noRisk).risk.frequency,null);
});
test('Unavailable, disabled and failed show missing data honestly with no stale figure',()=>{
 for(const scenario of ['unavailable','disabled','failed']){
  const report=quantReportSample(scenario),html=render(report),t=text(html),g=buildGlance(report);
  assert.match(t,/Chưa có kết luận/,scenario);assert.match(t,/Chưa đủ dữ liệu/,scenario);
  assert.match(t,/Chưa đủ dữ liệu để nêu rủi ro nổi bật/,scenario);
  assert.doesNotMatch(t,STALE,scenario);
  assert.doesNotMatch(t,/Mô hình: theo dõi/,scenario);
  assert.equal(g.verdict.available,false);
  for(const n of g.numbers){assert.equal(n.value,'—',`${scenario}/${n.id}`);assert.equal(n.available,false);}
  for(const grp of g.groups){assert.equal(grp.figure.value,'—',`${scenario}/${grp.id}`);}
  assert.match(html,/data-glance-state="missing"/);
 }
 assert.ok(buildGlance(quantReportSample('unavailable')).groups.every(x=>x.tone==='nodata'));
});
test('Flag off (=0) keeps the legacy reader; default (flag on) shows the summary layer without the 16 modules',()=>{
 const report=quantReportSample('complete'),prev=process.env.NEXT_PUBLIC_QUANT_READER_V2;
 try{
  process.env.NEXT_PUBLIC_QUANT_READER_V2='0';
  const off=renderToStaticMarkup(React.createElement(LiveQuantReport,{report}));
  assert.doesNotMatch(off,/data-quant-glance|data-quant-levels/);assert.equal((off.match(/data-quant-module=/g)||[]).length,16);
  delete process.env.NEXT_PUBLIC_QUANT_READER_V2;
  const on=renderToStaticMarkup(React.createElement(LiveQuantReport,{report}));
  assert.match(on,/data-quant-glance/);assert.match(on,/data-quant-levels/);assert.equal((on.match(/data-quant-module=/g)||[]).length,0);
  assert.match(on,/aria-pressed="true" data-level="summary"/);
  const compact=renderToStaticMarkup(React.createElement(LiveQuantReport,{report,compact:true}));
  assert.doesNotMatch(compact,/data-quant-glance/);
 }finally{if(prev===undefined)delete process.env.NEXT_PUBLIC_QUANT_READER_V2;else process.env.NEXT_PUBLIC_QUANT_READER_V2=prev;}
});
