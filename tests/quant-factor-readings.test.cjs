const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {buildSync}=require('esbuild');
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
function load(file){const r=buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react-dom','katex']});const m={exports:{}};new Function('require','module','exports',r.outputFiles[0].text)(require,m,m.exports);return m.exports;}
const {presentFactors}=load('frontend/src/lib/quant-factors.ts');
const {factorLevel,factorReading,factorQuickRead}=load('frontend/src/lib/quant-factor-readings.ts');
const {factorRadarLabels}=load('frontend/src/lib/quant-factor-radar-layout.ts');
const {sharpeScore,cmfScore,trendScore,filteredHmmScore,liquidityScore,percentileRank,radarScores}=load('frontend/src/lib/quant-radar-scoring.ts');
const {completeQuantReport,quantReportSample}=load('frontend/tests/fixtures/quant-report-sample.ts');
const {QuantFactorProfile}=load('frontend/src/components/quant-factor-profile.tsx');
const {FactorThreeD}=load('frontend/src/components/quant-factor-3d.tsx');

test('Raw score boundaries preserve agreed categories, including exact 2/.1/.3/.6 and extreme tails',()=>{
 for(const [fn,lo,hi] of [[sharpeScore,0,2],[cmfScore,0,.1],[trendScore,.3,.6]]){
  assert.ok(fn(lo-1e-8)<50);assert.equal(fn(lo),50);assert.equal(fn(hi),70);assert.ok(fn(hi+1e-8)>70);
 }
 assert.ok(sharpeScore(-.134)<50);assert.equal(cmfScore(-1),0);assert.equal(cmfScore(1),100);assert.equal(trendScore(1),100);
 assert.equal(cmfScore(1.01),null);assert.equal(trendScore(-.1),null);assert.equal(sharpeScore(NaN),null);
 for(const x of [-1e9,-2,-.134,0,1,2,3,1e9])assert.ok(sharpeScore(x)>=0&&sharpeScore(x)<=100);
 assert.equal(factorLevel(70,'sharpe'),'medium');assert.equal(factorLevel(71,'sharpe'),'strong');
 assert.equal(factorLevel(29.99,'hmm_regime'),'weak');assert.equal(factorLevel(30,'hmm_regime'),'medium');assert.equal(factorLevel(70,'hmm_regime'),'medium');assert.equal(factorLevel(70.01,'hmm_regime'),'strong');
 assert.equal(factorLevel(70,'forecast_ret'),'strong');assert.equal(factorLevel(null),'missing');
});
test('EVF regression: raw negative Sharpe and BEAR 100 override misleading old z scores',()=>{
 const report=completeQuantReport();report.sections.statistics.metrics.stats.sharpe=-.134;
 report.research.factors.find(p=>p.id==='sharpe').value=.466;
 report.sections.hmm.metrics.hmm.state_probs={BULL:0,SIDEWAY:0,BEAR:100};
 const before=JSON.stringify(report),rows=presentFactors(report.research.factors,report),get=id=>rows.find(p=>p.id===id);
 assert.equal(get('sharpe').value,-.134);assert.ok(get('sharpe').score<50);assert.equal(get('hmm_regime').score,0);
 assert.equal(get('cmf').value,.21);assert.ok(get('cmf').score>70);assert.equal(get('forecast_ret').score,78);assert.equal(get('forecast_conf').score,65);assert.equal(get('vol_regime').score,40);
 assert.equal(JSON.stringify(report),before);
});
test('HMM uses all three filtered probabilities in percent; rejects fallback, smoothed, malformed and unavailable',()=>{
 const r=completeQuantReport(),h=r.sections.hmm.metrics.hmm;
 assert.equal(filteredHmmScore(r).score,79);
 h.state_probs={BULL:0,SIDEWAY:100,BEAR:0};assert.equal(filteredHmmScore(r).score,50);
 for(const bad of [{BULL:.67,SIDEWAY:.24,BEAR:.09},{BULL:70,SIDEWAY:30,BEAR:10},{BULL:80,SIDEWAY:20},{BULL:-1,SIDEWAY:1,BEAR:100}]){h.state_probs=bad;assert.equal(filteredHmmScore(r).score,null);}
 h.state_probs={BULL:67,SIDEWAY:24,BEAR:9};h.probability_kind='smoothed';assert.equal(filteredHmmScore(r).score,null);
 h.probability_kind='filtered';h.method='fallback';assert.equal(filteredHmmScore(r).score,null);
 h.method='multivariate_hmm';r.sections.hmm.status='UNAVAILABLE';assert.equal(filteredHmmScore(r).score,null);
});
test('Liquidity ranks the same complete universe, averages ties, and requires both ADV and Amihud',()=>{
 const r=completeQuantReport(),u=r.research.radar_scoring.liquidity_universe;
 assert.equal(liquidityScore(r).score,50);
 u.members.find(p=>p.symbol==='FPT').amihud20=0;assert.equal(liquidityScore(r).score,75);
 assert.equal(percentileRank(2,[1,2,2,3]),50);assert.equal(percentileRank(2,[2,2,2]),50);assert.equal(percentileRank(2,[2]),null);
 u.members[0].amihud20=NaN;assert.equal(liquidityScore(r).score,null);
 u.members[0].amihud20=1;r.research.radar_scoring.as_of='2026-10-15';assert.equal(liquidityScore(r).score,null);
 r.research.radar_scoring.as_of='2026-10-16';u.members.push({...u.members[0]});assert.equal(liquidityScore(r).score,null);
 delete r.research.radar_scoring;assert.equal(liquidityScore(r).score,null);
});
test('Alpha averages modules once with equal weight, excludes missing and reports coverage',()=>{
 const r=completeQuantReport();let out=radarScores(r.research.factors,r);
 let valid=out.modules.filter(p=>p.score!=null);assert.equal(out.coverage.total,14);assert.equal(out.coverage.available,7);
 assert.equal(out.scores.alpha_composite.score,valid.reduce((s,p)=>s+p.score,0)/valid.length);
 r.research.radar_scoring.module_scores=[{id:'arima',score:0,method:'published-rule-v1'},{id:'garch',score:100,method:'published-rule-v1'},{id:'statistics',score:100,method:'must-not-override'},{id:'alpha_composite',score:100,method:'recursive'},{id:'decision',score:100,method:'recursive'}];
 out=radarScores(r.research.factors,r);assert.equal(out.coverage.available,9);assert.equal(out.modules.find(p=>p.id==='statistics').score,62);
 assert.equal(out.modules.find(p=>p.id==='arima').score,0);assert.equal(out.modules.find(p=>p.id==='garch').score,100);
 r.sections.arima.status='DISABLED';out=radarScores(r.research.factors,r);assert.equal(out.coverage.available,8);
 r.research.radar_scoring.module_scores.push({id:'garch',score:90,method:'duplicate'});assert.equal(radarScores(r.research.factors,r).modules.find(p=>p.id==='garch').score,null);
 for(const state of ['unavailable','disabled','failed']){const rr=quantReportSample(state);assert.equal(radarScores(rr.research.factors,rr).scores.alpha_composite.score,null);}
});
test('Missing raw metrics never fall back to old z scores; HMM 40 is not called weak',()=>{
 const r=completeQuantReport();delete r.sections.statistics.metrics.stats.sharpe;delete r.sections.technical.metrics.flow.cmf;
 let rows=presentFactors(r.research.factors,r);assert.equal(rows.find(p=>p.id==='sharpe').score,null);assert.equal(rows.find(p=>p.id==='cmf').score,null);
 rows=[{id:'hmm_regime',label:'HMM',score:40},{id:'sharpe',label:'Sharpe',score:40}];
 assert.deepEqual(factorQuickRead(rows).weakIds,['sharpe']);assert.match(factorReading('hmm_regime',40),/30–70/);
 assert.match(factorQuickRead([]).paragraph,/Chưa đủ dữ liệu/);
});
test('Radar and 3D show the same scores, formula and module coverage without a universal neutral claim',()=>{
 const r=completeQuantReport(),rows=presentFactors(r.research.factors,r),html=renderToStaticMarkup(React.createElement(QuantFactorProfile,{data:r.research.factors,report:r}));
 assert.equal((html.match(/data-factor-card=/g)||[]).length,9);assert.equal((html.match(/data-factor-point=/g)||[]).length,9);assert.equal((html.match(/data-factor-reference=/g)||[]).length,3);
 assert.match(html,/Độ phủ: 7\/14/);assert.match(html,/tổng hợp một phần/);assert.match(html,/▲ 79/);assert.match(html,/▼ 40/);assert.doesNotMatch(html,/50 là trung tính/);
 const three=renderToStaticMarkup(React.createElement(FactorThreeD,{factors:rows}));assert.equal((three.match(/data-factor-column=/g)||[]).length,9);assert.match(three,/▲ 79/);
});
test('Radar callouts stay separated at zero, neutral and fractional scores',()=>{
 for(const scores of [Array(9).fill(0),Array(9).fill(50),[null,40,76.421,50,52,53,55,55,57]]){
  const labels=factorRadarLabels(scores,300,240,150);assert.equal(labels.length,scores.filter(s=>s!=null).length);
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(Math.abs(labels[i].x-labels[j].x)>=57.99||Math.abs(labels[i].y-labels[j].y)>=26.99);
 }
});
