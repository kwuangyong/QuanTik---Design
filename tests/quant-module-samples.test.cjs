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
const {completeQuantReport,quantReportSample,quantSampleCases}=load('frontend/tests/fixtures/quant-report-sample.ts');
const {QuantModelSection}=load('frontend/src/components/quant-model-section.tsx');
const {SimpleQuantReport}=load('frontend/src/components/quant-simple-report.tsx');
const {QuantResearchVisuals}=load('frontend/src/components/quant-research.tsx');
const {QuantActionSummary}=load('frontend/src/components/quant-action-summary.tsx');
const {quantModuleItems}=load('frontend/src/components/quant-module-navigation.tsx');
const {moduleGuides,at}=load('frontend/src/lib/quant-reader.ts');
const {moduleAnalysis}=load('frontend/src/lib/quant-interpretation.ts');
const {moduleAvailability,readableMetrics}=load('frontend/src/lib/quant-presentation.ts');
const {scenarioScenes,hmmPhaseData}=load('frontend/src/lib/quant-scenario-data.ts');
const {garchResponseScene}=load('frontend/src/components/quant-report-views.tsx');
const render=(report,name)=>renderToStaticMarkup(React.createElement(QuantModelSection,{report,name,id:name,compact:false,selected:true}));
const text=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');

test('Complete sample populates every published metric and interpretation across all 16 modules',()=>{
 const report=completeQuantReport(),before=JSON.stringify(report);
 assert.equal(quantModuleItems.length,16);
 for(const [name] of quantModuleItems) {
  const metrics=readableMetrics(report.sections[name]),html=render(report,name);
  assert.match(html,new RegExp(`data-quant-module="${name}"`));
  assert.match(text(html),/Ý nghĩa &amp; phân tích/);
  assert.doesNotMatch(text(html),/Thiếu dữ liệu|Chưa đủ dữ liệu để diễn giải|undefined|NaN|Infinity/);
  if(name!=='commentary') assert.equal(moduleAvailability(name,report.sections[name]),'Có dữ liệu',name);
  for(const [,key] of moduleGuides[name].metrics) {
   const value=at(metrics,key);assert.notEqual(value,undefined,`${name}.${key}`);assert.notEqual(value,null,`${name}.${key}`);
  }
  if(!['commentary','directional_alpha'].includes(name)) assert.equal((html.match(/<dd /g)||[]).length>=moduleGuides[name].metrics.length,true,name);
  const reading=moduleAnalysis(name,metrics,report);assert.doesNotMatch(reading.summary,/Chưa đủ dữ liệu để diễn giải/,name);
 }
 assert.match(text(render(report,'arima')),/\(1, 0, 1\).*412,6.*423,1.*0,012/);
 assert.match(render(report,'arima'),/aria-label="Dự báo giá riêng ARIMA"/);
 assert.match(render(report,'distribution'),/<rect /); // actual histogram, not its empty state
 assert.equal(JSON.stringify(report),before);
});

test('All five sample scenarios render 16 modules without changing their report or creating fake defaults',()=>{
 for(const scenario of quantSampleCases) {
  const report=quantReportSample(scenario),before=JSON.stringify(report);
  for(const [name] of quantModuleItems) {
   const html=render(report,name);assert.match(html,new RegExp(`data-quant-module="${name}"`));assert.doesNotMatch(text(html),/undefined|NaN|Infinity/,`${scenario}/${name}`);
   if(scenario==='failed'&&!['commentary','decision','trade_plan'].includes(name)) assert.match(html.split('</summary>')[0],/Thiếu dữ liệu/,name);
   if(['disabled','unavailable'].includes(scenario)&&!['commentary','decision'].includes(name)) {
    assert.match(text(html),/Chưa đủ dữ liệu để diễn giải/,`${scenario}/${name}`);
    assert.doesNotMatch(html,/<dd[^>]*>[^<]*(?:100\.000|412,6|24,5)/,`${scenario}/${name}`);
   }
  }
  assert.equal(JSON.stringify(report),before,scenario);
 }
 const partial=quantReportSample('partial');
 assert.equal(moduleAvailability('statistics',partial.sections.statistics),'Dữ liệu một phần');
 assert.match(text(render(partial,'arima')),/412,6/);assert.match(text(render(partial,'arima')),/Chưa có chuỗi forecast ARIMA/);
 assert.equal(garchResponseScene(partial)!==null,true);
});

test('Unavailable, disabled and failed data cannot leak stale action values or model scenes',()=>{
 for(const scenario of ['unavailable','disabled','failed']) {
  const report=quantReportSample(scenario);
  const html=renderToStaticMarkup(React.createElement(QuantActionSummary,{report,compact:false,showAction:true}));
  for(const id of ['entry','kelly-full','forecast-net','shares']) {
   const chunk=html.split(`data-action-metric="${id}"`)[1]?.split('</dd>')[0];assert.ok(chunk,id);assert.match(chunk,/>—$/,{scenario,id});
  }
  const supplement=renderToStaticMarkup(React.createElement(QuantResearchVisuals,{report}));
  assert.doesNotMatch(supplement,/aria-label="(?:Dải giá Monte Carlo FPT|Lịch sử trạng thái HMM FPT|Sụt giảm từ đỉnh FPT|Biến động dự báo GARCH)"/,scenario);
  assert.equal(garchResponseScene(report),null,scenario);
  assert.equal(scenarioScenes(report,'monte').history,null,scenario);
  assert.deepEqual(hmmPhaseData(report).history,[],scenario);
  assert.equal(hmmPhaseData(report).probabilities,null,scenario);
 }
});

test('Missing section stays visible and factual zero/false remain usable',()=>{
 const report=completeQuantReport();delete report.sections.arima;
 assert.match(text(render(report,'arima')),/Thiếu dữ liệu.*Chưa đủ dữ liệu/);
 report.sections.arima={status:'AVAILABLE',reason_codes:[],units:{},metrics:{arima:{best:{order:[0,0,0],aic:0,bic:0},stationarity:{adf_p:0,stationary:false}}}};
 assert.equal(moduleAvailability('arima',report.sections.arima),'Có dữ liệu');
 const html=text(render(report,'arima'));assert.match(html,/\(0, 0, 0\)/);assert.match(html,/Không/);
});

// Upstream main introduced this alternate reader without wiring it into QuantReport.
// Preserve and exercise it directly, while route tests cover the actual LiveQuantReport.
test('Upstream alternate reader still renders its overview and four evidence cards',()=>{
 const report=completeQuantReport(),before=JSON.stringify(report);
 const html=renderToStaticMarkup(React.createElement(SimpleQuantReport,{report,showAction:true}));
 for(const label of ['Tổng hợp và khuyến nghị','Xu hướng dễ hiểu','Kịch bản giá dễ hiểu','Rủi ro dễ hiểu','Kế hoạch giao dịch']) assert.ok(html.includes(`aria-label="${label}"`),label);
 assert.doesNotMatch(text(html),/undefined|NaN|Infinity/);assert.equal(JSON.stringify(report),before);
});
