const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {buildSync}=require('esbuild');
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
function load(file){const result=buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react-dom','katex']});const m={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,m,m.exports);return m.exports;}
const {presentFactors,profileFactorIds}=load('frontend/src/lib/quant-factors.ts');
const {factorLevel,factorReading,factorQuickRead,factorScaleNote}=load('frontend/src/lib/quant-factor-readings.ts');
const {factorRadarLabels}=load('frontend/src/lib/quant-factor-radar-layout.ts');
const {QuantFactorProfile}=load('frontend/src/components/quant-factor-profile.tsx');
const {FactorThreeD}=load('frontend/src/components/quant-factor-3d.tsx');
const values={sharpe:.6,cmf:.3,alpha_composite:.25,forecast_ret:.55,forecast_conf:.3,trend_quality:.42,hmm_regime:.67,vol_regime:-.2,liquidity:.8};
const complete=profileFactorIds.map(id=>({id,label:id,value:values[id],min:-1,max:1}));

test('Display scores respect source domains, rounding, neutral zero and already oriented volatility',()=>{
 const before=JSON.stringify(complete),rows=presentFactors(complete),find=id=>rows.find(p=>p.id===id);
 assert.equal(find('hmm_regime').score,84);assert.equal(find('vol_regime').score,40);assert.equal(find('liquidity').score,90);
 assert.equal(presentFactors([{id:'cmf',value:2,min:0,max:4}]).find(p=>p.id==='cmf').score,50);
 assert.equal(presentFactors([{id:'vol_regime',value:0,min:-1,max:1}]).find(p=>p.id==='vol_regime').score,50);
 assert.equal(JSON.stringify(complete),before);
 assert.equal(factorLevel(70),'strong');assert.equal(factorLevel(69),'medium');assert.equal(factorLevel(50),'medium');assert.equal(factorLevel(49),'weak');assert.equal(factorLevel(null),'missing');
 for(const id of profileFactorIds)assert.notEqual(factorReading(id,80),factorReading(id,30),id);
});
test('Quick read covers complete, partially missing and predominantly weak profiles without invented evidence',()=>{
 const cases=[
  {name:'complete',data:complete,valid:9,weak:1,conflict:true},
  {name:'partial',data:complete.filter(p=>!['sharpe','forecast_conf','liquidity'].includes(p.id)),valid:6,weak:1,conflict:false},
  {name:'weak',data:complete.map((p,i)=>({...p,value:p.id==='forecast_ret'?.5:-.2-i*.05})),valid:9,weak:8,conflict:true},
 ];
 for(const c of cases){const before=JSON.stringify(c.data),rows=presentFactors(c.data),result=factorQuickRead(rows);assert.equal(rows.filter(p=>p.score!=null).length,c.valid);assert.equal(result.weakIds.length,c.weak);assert.equal(result.conflict,c.conflict);assert.equal(result.chips.length,3);assert.match(result.paragraph,/tuy nhiên|dù vậy/);assert.equal((result.paragraph.match(/Cần /g)||[]).length,1);assert.ok(result.paragraph.endsWith('.'));assert.doesNotMatch(result.paragraph,/undefined|NaN|Infinity|nên mua|nên bán|điểm tổng hợp/);assert.equal(JSON.stringify(c.data),before);}
 const full=factorQuickRead(presentFactors(complete));assert.match(full.paragraph,/Thanh khoản đạt 90\/100 và Trạng thái HMM đạt 84\/100/);assert.match(full.paragraph,/Trạng thái biến động chỉ 40\/100/);assert.match(full.paragraph,/78\/100.*65\/100/);
 const empty=factorQuickRead(presentFactors([]));assert.match(empty.paragraph,/Chưa đủ dữ liệu/);assert.doesNotMatch(empty.paragraph,/đạt 0|đạt 50/);
});
test('Card renders one scale note, 9 explained cards, 9 point scores and only 0/50/100 references',()=>{
 const html=renderToStaticMarkup(React.createElement(QuantFactorProfile,{data:complete}));
 assert.equal(html.split(factorScaleNote).length-1,1);
 assert.equal((html.match(/data-factor-card=/g)||[]).length,9);assert.equal((html.match(/Đo điều gì:/g)||[]).length,9);assert.equal((html.match(/Đang nói gì:/g)||[]).length,9);
 assert.equal((html.match(/data-factor-point=/g)||[]).length,9);assert.equal((html.match(/data-factor-reference=/g)||[]).length,3);
 assert.match(html,/▲ 84/);assert.match(html,/▼ 40/);assert.match(html,/▬ 65/);assert.match(html,/Đọc nhanh/);
 assert.doesNotMatch(html,/miền|Giá trị nguồn:/);assert.match(html,/không tự tổng hợp thành điểm mua/);
 const three=renderToStaticMarkup(React.createElement(FactorThreeD,{factors:presentFactors(complete)}));assert.equal((three.match(/data-factor-column=/g)||[]).length,9);assert.match(three,/data-factor-reference="50"/);assert.match(three,/▲ 84/);assert.doesNotMatch(three,/giá trị gốc|miền/);
});
test('Radar callouts stay apart for complete, equal-zero and crowded-neutral values',()=>{
 for(const scores of [Object.values(values).map(v=>Math.round((v+1)*50)),Array(9).fill(0),Array(9).fill(50),[null,40,null,50,52,53,55,55,57]]) {
  const labels=factorRadarLabels(scores,300,240,150);assert.equal(labels.length,scores.filter(s=>s!=null).length);
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(Math.abs(labels[i].x-labels[j].x)>=57.99||Math.abs(labels[i].y-labels[j].y)>=26.99,JSON.stringify([scores,labels[i],labels[j]]));
 }
});
