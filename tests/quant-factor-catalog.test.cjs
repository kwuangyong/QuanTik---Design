const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {buildSync}=require('esbuild'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file){const r=buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react-dom','katex']});const m={exports:{}};new Function('require','module','exports',r.outputFiles[0].text)(require,m,m.exports);return m.exports;}
const {presentFactors,profileFactorIds}=load('frontend/src/lib/quant-factors.ts');
const {QuantFactorProfile}=load('frontend/src/components/quant-factor-profile.tsx');
const {reportFixture}=load('frontend/tests/fixtures/analysis.ts');
const {completeQuantReport}=load('frontend/tests/fixtures/quant-report-sample.ts');
test('Catalog retains nine axes, obtains raw metrics from the report and leaves missing axes empty',()=>{
 const r=reportFixture(),before=JSON.stringify(r),rows=presentFactors(r.research.factors,r);
 assert.deepEqual(rows.map(p=>p.id),profileFactorIds);assert.equal(rows.find(p=>p.id==='sharpe').value,1.2);assert.equal(rows.find(p=>p.id==='sharpe').score,62);
 assert.equal(rows.find(p=>p.id==='cmf').score,null);assert.equal(rows.find(p=>p.id==='liquidity').score,null);
 assert.equal(JSON.stringify(r),before);
});
test('Partial radar retains named axes, omits missing points, and never draws a falsely complete polygon',()=>{
 const r=reportFixture(),html=renderToStaticMarkup(React.createElement(QuantFactorProfile,{data:r.research.factors,report:r}));
 assert.equal((html.match(/data-factor-axis=/g)||[]).length,9);assert.equal((html.match(/data-factor-value=/g)||[]).length,3);
 assert.doesNotMatch(html,/fill-opacity="(?:0)?\.12"/);assert.match(html,/Chưa có dữ liệu/);
 for(const id of ['lock_safety','distribution_quality','data_quality'])assert.ok(!html.includes(`data-factor-axis="${id}"`));
});
test('Invalid legacy domains stay absent and removed factors never change the nine axes',()=>{
 const r=completeQuantReport();r.research.factors.push({id:'lock_safety',label:'ignored',value:1,min:-1,max:1});
 assert.equal(presentFactors(r.research.factors,r).length,9);
 for(const entry of [{value:NaN,min:-1,max:1},{value:.1,min:1,max:1},{value:2,min:-1,max:1}])assert.equal(presentFactors([{id:'forecast_ret',...entry}]).find(p=>p.id==='forecast_ret').score,null);
});
