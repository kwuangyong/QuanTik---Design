const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {buildSync}=require('esbuild');
function load(file){const output=buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false});const module={exports:{}};new Function('require','module','exports',output.outputFiles[0].text)(require,module,module.exports);return module.exports;}
const {moduleInterpretation}=load('frontend/src/lib/quant-interpretation.ts');
const {reportFixture}=load('frontend/tests/fixtures/analysis.ts');
test('Interpretation preserves zero, distinguishes unavailable results and leaves source data untouched',()=>{
 const report=reportFixture(),before=JSON.stringify(report);
 assert.match(moduleInterpretation('statistics',{stats:{sharpe:0,max_dd_pct:0}},report),/Sharpe đạt 0/);
 assert.match(moduleInterpretation('costs',{costs:{net_forecast_pct:0}},report),/không còn dương/);
 assert.match(moduleInterpretation('statistics',{stats:{sharpe:NaN}},report),/Chưa đủ dữ liệu để diễn giải/);
 assert.match(moduleInterpretation('hmm',{hmm:{method:'fallback',current:'BULL'}},report),/phương pháp thay thế/i);
 assert.equal(JSON.stringify(report),before);
});
test('All report modules explain meaning without inventing missing numbers or modifying the action',()=>{
 const report=reportFixture(),before=JSON.stringify(report);
 for(const [name,section] of Object.entries(report.sections)){
  const text=moduleInterpretation(name,section.metrics,report);
  assert.ok(text.length>80,name);assert.doesNotMatch(text,/undefined|NaN|Infinity/);
 }
 assert.equal(JSON.stringify(report),before);
});
test('Disabled module interpretation does not expose stale numerical output',()=>{
 const report=reportFixture();report.sections.costs.status='DISABLED';
 const text=moduleInterpretation('costs',{costs:{net_forecast_pct:999}},report);
 assert.match(text,/đang tắt/);assert.doesNotMatch(text,/999/);
});

const {quantSummary}=load('frontend/src/lib/quant-summary.ts');
test('Final summary keeps the source decision and omits unavailable or failed evidence',()=>{
 const report=reportFixture();
 report.sections.costs.metrics={costs:{net_forecast_pct:0}};
 report.sections.hmm.status='UNAVAILABLE';report.sections.hmm.metrics={hmm:{current:'BULL'}};
 report.sections.technical.metrics={flow:{available:false,cmf:999}};
 const before=JSON.stringify(report),summary=quantSummary(report),text=summary.map(p=>p.join(': ')).join(' ');
 assert.equal(summary.length,4);assert.match(text,/Theo dõi/);assert.match(text,/sau phí 0%/);assert.doesNotMatch(text,/999|nhận diện pha tăng/);assert.equal(JSON.stringify(report),before);
});

const {moduleAnalysis}=load('frontend/src/lib/quant-interpretation.ts');
const {moduleGuides}=load('frontend/src/lib/quant-reader.ts');
test('Interpretations reverse with the reported evidence and retain exact source numbers',()=>{
 const report=reportFixture();
 let output=moduleAnalysis('distribution',{dist:{verdict:{is_gaussian:false},skewness:.491,excess_kurtosis:2.442}},report);
 assert.match(output.summary,/0,491.*lệch phải/);assert.match(output.summary,/2,442.*đuôi dày/);assert.match(output.summary,/VaR\/CVaR lịch sử và GARCH/);
 output=moduleAnalysis('distribution',{dist:{skewness:-.491,excess_kurtosis:-.5}},report);assert.match(output.summary,/lệch trái/);assert.doesNotMatch(output.summary,/cho thấy đuôi dày/);
 assert.match(moduleAnalysis('statistics',{stats:{sharpe:2.042,max_dd_pct:-14.94}},report).summary,/2,042.*rất tốt.*tuy nhiên.*-14,94/);
 assert.match(moduleAnalysis('technical',{flow:{cmf:-.2},trend:{er:.2}},report).summary,/áp lực bán.*nhiều nhiễu/);
 assert.match(moduleAnalysis('costs',{costs:{net_forecast_pct:-.5}},report).summary,/sau phí âm/);
});
test('Missing, disabled, failed and non-finite output cannot become a positive reading',()=>{
 const report=reportFixture(),before=JSON.stringify(report);
 for(const name of Object.keys(moduleGuides).filter(n=>!['decision','commentary'].includes(n))) {
  assert.match(moduleAnalysis(name,{},report).summary,/Chưa đủ dữ liệu để diễn giải/,name);
 }
 assert.match(moduleAnalysis('statistics',{stats:{sharpe:NaN}},report).summary,/Chưa đủ dữ liệu/);
 assert.match(moduleAnalysis('costs',{costs:{available:false,net_forecast_pct:999}},report).summary,/Chưa đủ dữ liệu/);
 assert.doesNotMatch(moduleInterpretation('costs',{costs:{error:'fit failed',net_forecast_pct:999}},report),/999/);
 assert.equal(JSON.stringify(report),before);
 report.sections.costs.status='UNAVAILABLE';assert.doesNotMatch(moduleInterpretation('costs',{costs:{net_forecast_pct:999}},report),/999/);
});
