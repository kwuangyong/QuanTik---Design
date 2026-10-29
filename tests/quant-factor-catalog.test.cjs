const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {buildSync}=require('esbuild');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file){const output=buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react-dom','katex']});const module={exports:{}};new Function('require','module','exports',output.outputFiles[0].text)(require,module,module.exports);return module.exports;}
const {presentFactors,factorLabels,profileFactorIds}=load('frontend/src/lib/quant-factors.ts');
const {QuantFactorProfile}=load('frontend/src/components/quant-factor-profile.tsx');
const {reportFixture}=load('frontend/tests/fixtures/analysis.ts');
test('Factor profile retains the selected 9 axes and source values, including zero',()=>{
 const source=reportFixture().research.factors,before=JSON.stringify(source),rows=presentFactors(source);
 assert.equal(rows.length,9);assert.equal(rows.filter(p=>p.fraction!=null).length,3);
 assert.deepEqual(rows.map(p=>p.id),profileFactorIds);
 assert.equal(rows.find(p=>p.id==='cmf').value,.3);
 assert.equal(rows.find(p=>p.id==='forecast_ret').value,null);
 assert.equal(rows.find(p=>p.id==='forecast_ret').fraction,null);
 assert.equal(presentFactors([{id:'cmf',value:0,min:-1,max:1}]).find(p=>p.id==='cmf').fraction,.5);
 assert.equal(JSON.stringify(source),before);
});
test('Partial radar draws 9 named axes and only the available points, never missing-as-zero or a false triangle',()=>{
 const html=renderToStaticMarkup(React.createElement(QuantFactorProfile,{data:reportFixture().research.factors}));
 assert.equal((html.match(/data-factor-axis=/g)||[]).length,9);
 assert.equal((html.match(/data-factor-legend=/g)||[]).length,9);
 assert.equal((html.match(/data-factor-value=/g)||[]).length,3);
 assert.doesNotMatch(html,/fill-opacity="(?:0)?\.12"/);
 assert.match(html,/Chưa có dữ liệu/);
 assert.match(html,/aria-label="Sharpe"/);assert.match(html,/aria-label="Chất lượng xu hướng"/);
 assert.doesNotMatch(html,/>0[1-9]<\/text>/);
 for(const name of ['An toàn T+2','Chất lượng phân phối','Chất lượng dữ liệu'])assert.ok(!html.includes(name));
});
test('Profile excludes the three removed factors and preserves the source report; invalid values stay unplotted',()=>{
 const data=profileFactorIds.map(id=>({id,label:id,value:.2,min:-1,max:1}));
 const html=renderToStaticMarkup(React.createElement(QuantFactorProfile,{data}));
 assert.equal((html.match(/data-factor-value=/g)||[]).length,9);assert.match(html,/fill-opacity="(?:0)?\.12"/);
 data.push({id:'new_source_factor',label:'Nhân tố mới',value:0,min:-2,max:2});
 for(const id of ['lock_safety','distribution_quality','data_quality'])data.push({id,label:factorLabels[id],value:.8,min:-1,max:1});
 const before=JSON.stringify(data),rows=presentFactors(data);assert.equal(rows.length,9);assert.ok(rows.every(p=>profileFactorIds.includes(p.id)));assert.equal(JSON.stringify(data),before);
 for(const entry of [{value:NaN,min:-1,max:1},{value:.1,min:1,max:1},{value:2,min:-1,max:1}])assert.equal(presentFactors([{id:'cmf',...entry}]).find(p=>p.id==='cmf').fraction,null);
});
