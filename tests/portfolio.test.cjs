const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildSync}=require('esbuild');
const path=require('node:path');
const compile=file=>{const out=buildSync({entryPoints:[path.join(__dirname,'../frontend/src/lib',file)],bundle:true,platform:'node',format:'cjs',write:false});const m={exports:{}};new Function('require','module','exports',out.outputFiles[0].text)(require,m,m.exports);return m.exports;};
const engine=compile('portfolio-engine.ts'),data=compile('portfolio.ts'),sim=compile('portfolio-simulation.ts'),adapter=compile('portfolio-quant-adapter.ts');
const {portfolioAssets:assets,portfolioSamples:samples}=data;
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t,`${a} ≠ ${b}`);

test('Danh mục dùng nến chung đồng bộ, đủ model và giá VND',()=>{
  for(const a of assets){assert.equal(a.returns.length,data.portfolioDataInfo.observations);assert.ok(a.price>1000);assert.ok(a.returns.every(Number.isFinite));assert.ok(adapter.quantModel(a.symbol).variance>0);}
  assert.equal(samples.length,3);
});
test('Covariance dùng trung bình mẫu; kiểm tra bằng chuỗi tính tay',()=>{
  const c=engine.covariance([[1,2,3],[-1,-2,-3]]);near(c[0][0],1);near(c[0][1],-1);near(c[1][1],1);
  assert.throws(()=>engine.covariance([[1],[2]]));assert.throws(()=>engine.covariance([[1,2],[2,3,4]]));
});
test('Tổng tài sản và P&L khớp phép tính độc lập; risk contribution cộng đúng',()=>{
  for(const {portfolio} of samples){const r=engine.portfolioRisk(portfolio,assets);near(r.total,portfolio.cash+portfolio.positions.reduce((s,p)=>s+p.quantity*assets.find(a=>a.symbol===p.symbol).price,0));near(r.profit,r.equity-r.invested);near(r.holdings.reduce((s,h)=>s+h.weight,0)+r.cashWeight,1);near(r.holdings.reduce((s,h)=>s+h.riskContribution,0),1);assert.ok(r.volatility>0);}
});
test('Tiền mặt giảm volatility tuyến tính, không làm đổi P&L cổ phiếu',()=>{
  const a=engine.portfolioRisk({cash:0,positions:samples[0].portfolio.positions},assets),b=engine.portfolioRisk({cash:a.total,positions:samples[0].portfolio.positions},assets);
  near(b.volatility,a.volatility/2);near(b.beta,a.beta/2);near(a.profit,b.profit);
});
test('Đóng góp phòng vệ có thể âm, không bị cắt về 0 trong engine',()=>{
  const a=[{symbol:'A',sector:'A',price:1,beta:1,returns:[-.02,0,.02],color:''},{symbol:'B',sector:'B',price:1,beta:1,returns:[.02,0,-.02],color:''}];
  const r=engine.portfolioRisk({cash:0,positions:[{symbol:'A',quantity:3,cost:1},{symbol:'B',quantity:1,cost:1}]},a);
  assert.ok(r.holdings[1].riskContribution<0);near(r.holdings.reduce((s,h)=>s+h.riskContribution,0),1);
});
test('Từ chối vị thế trùng, mã lạ, số âm, NaN và khối lượng lẻ',()=>{
  const base=samples[0].portfolio,p=base.positions[0];
  for(const next of [{...base,cash:-1},{...base,cash:NaN},{...base,positions:[p,p]},{...base,positions:[{...p,symbol:'BAD'}]},{...base,positions:[{...p,quantity:1.5}]},{...base,positions:[{...p,cost:0}]}])assert.throws(()=>engine.portfolioRisk(next,assets));
});
test('Gộp lần mua cùng mã và từ chối cả lô nếu một dòng không hợp lệ',()=>{
  const original={cash:500000,positions:[{symbol:'HUT',quantity:100,cost:10000}]};
  const purchase={symbol:'HUT',quantity:100,cost:13000};
  const newPosition={symbol:'A32',quantity:300,cost:25000};
  const result=engine.addPortfolioPurchases(original,[purchase,newPosition,{...purchase,quantity:200,cost:15000}]);
  assert.deepEqual(result,{cash:500000,positions:[{symbol:'HUT',quantity:400,cost:13250},newPosition]});
  assert.throws(()=>engine.addPortfolioPurchases(original,[newPosition,{...purchase,quantity:10000000}]));
  assert.deepEqual(original.positions,[{symbol:'HUT',quantity:100,cost:10000}]);
});
test('Adapter quy đổi % và phương sai phần trăm; không bịa model thiếu',()=>{
  const raw=require('../backend/mock/analysis-visuals.json').reports.find(r=>r.symbol==='FPT'),m=adapter.quantModel('FPT');
  near(m.omega,raw.garch.omega/10000);near(m.variance,(raw.garch.volatility.at(-1).valuePct/100)**2);near(Object.values(m.hmm).reduce((a,b)=>a+b,0),1);assert.throws(()=>adapter.quantModel('BAD'));
});
test('Cholesky tái tạo ma trận; từ chối ma trận không PSD',()=>{
  const input=[[1,.5],[.5,1]],l=sim.cholesky(input);
  for(let i=0;i<2;i++)for(let j=0;j<2;j++)near(l[i].reduce((sum,v,k)=>sum+v*l[j][k],0),input[i][j]);
  assert.throws(()=>sim.cholesky([[1,2],[2,1]]));
  assert.throws(()=>sim.cholesky([[1,.2],[.3,1]]));assert.throws(()=>sim.cholesky([[NaN,0],[0,1]]));
});
test('Phân vị có nội suy, không làm thay đổi mảng đầu vào',()=>{
  const a=[4,1,3,2];near(engine.quantile(a,.5),2.5);near(engine.quantile(a,0),1);near(engine.quantile(a,1),4);assert.deepEqual(a,[4,1,3,2]);assert.throws(()=>engine.quantile([],.5));
});
test('Cú sốc thị trường, ngành, riêng mã chỉ tác động đúng đối tượng',()=>{
  const s={...sim.defaultScenario,marketShock:-.1,sector:'Ngân hàng',sectorShock:-.2,symbol:'FPT',symbolShock:-.1};
  for(const a of assets){const expected=(.9**a.beta)*(a.sector==='Ngân hàng'?.8:1)*(a.symbol==='FPT'?.9:1)-1;near(sim.deterministicImpact(a,s),expected);}
});
test('Monte Carlo cố định seed, phân vị có thứ tự, histogram đủ đường, CVaR ≥ VaR',()=>{
  const p=samples[0].portfolio,s={...sim.defaultScenario,marketShock:-.08},original=JSON.stringify(p),a=sim.simulatePortfolio(p,assets,s),b=sim.simulatePortfolio(p,assets,s);
  assert.deepEqual(a,b);assert.equal(JSON.stringify(p),original);assert.equal(a.cone.length,21);assert.equal(a.histogram.reduce((sum,h)=>sum+h.count,0),4000);
  for(const c of a.cone)assert.ok(c.p05<=c.p25&&c.p25<=c.p50&&c.p50<=c.p75&&c.p75<=c.p95);
  assert.ok(a.cvar95>=a.var95);assert.ok(a.breachProbability>=0&&a.breachProbability<=1);assert.ok(a.lossProbability>=0&&a.lossProbability<=1);
  near(a.attribution.reduce((sum,h)=>sum+h.mean,0),a.mean-a.total,.0001);
});
test('Cả 5/20/60 phiên và stress 0/100% đều chạy được; tương quan được giữ PSD',()=>{
  for(const horizon of [5,20,60])for(const stress of [0,1]){
    const r=sim.simulatePortfolio(samples[0].portfolio,assets,{...sim.defaultScenario,horizon,stress},100),l=sim.cholesky(r.correlation);
    assert.equal(r.cone.length,horizon+1);for(let i=0;i<assets.length;i++)for(let j=0;j<assets.length;j++)near(l[i].reduce((sum,v,k)=>sum+v*l[j][k],0),r.correlation[i][j],1e-8);
  }
});
test('Tiền mặt thuần và danh mục trống có rủi ro bằng 0, không NaN',()=>{
  for(const cash of [0,100000000]){const p={positions:[],cash},r=sim.simulatePortfolio(p,assets,sim.defaultScenario,100);near(r.var95,0);near(r.cvar95,0);near(r.breachProbability,0);near(r.lossProbability,0);assert.equal(r.cone.at(-1).p05,cash);near(engine.portfolioRisk(p,assets).volatility,0);}
});
test('Bảo toàn tiền mặt và cùng đường nhiễu: giảm nửa số cổ phiếu cho kết quả affine',()=>{
  const p={cash:10000000,positions:[{symbol:'FPT',quantity:1000,cost:100000}]},total=engine.portfolioRisk(p,assets).total;
  const after={cash:p.cash+assets[0].price*500,positions:[{...p.positions[0],quantity:500}]},a=sim.simulatePortfolio(p,assets,sim.defaultScenario,100),b=sim.simulatePortfolio(after,assets,sim.defaultScenario,100);
  near(engine.portfolioRisk(after,assets).total,total);near(b.var95,a.var95/2,1e-6);near(b.cvar95,a.cvar95/2,1e-6);near(b.cone.at(-1).p05,total+(a.cone.at(-1).p05-total)/2,1e-6);
});
test('Phương án hợp nhất không bán trùng, không tăng vị thế, giữ nguyên gốc và tài sản',()=>{
  for(const {portfolio:p} of samples){const saved=JSON.stringify(p),r=sim.rebalancePreview(p,assets,sim.defaultLimits,{...sim.defaultScenario,...sim.scenarioPresets[3].settings});
    assert.equal(JSON.stringify(p),saved);near(r.after.total,r.before.total);assert.equal(new Set(r.changes.map(c=>c.symbol)).size,r.changes.length);near(r.portfolio.cash-p.cash,r.changes.reduce((sum,c)=>sum+c.proceeds,0));
    for(const h of r.portfolio.positions){assert.ok(Number.isInteger(h.quantity)&&h.quantity>0);assert.ok(h.quantity<=p.positions.find(a=>a.symbol===h.symbol).quantity);}
    assert.ok(r.after.holdings.every(h=>h.weight<=sim.defaultLimits.stock+1e-8));assert.ok(r.after.sectors.every(h=>h.weight<=sim.defaultLimits.sector+1e-8));assert.ok(r.after.volatility<=sim.defaultLimits.volatility+1e-8);assert.ok(r.simulation.var95<=r.before.total*sim.defaultLimits.budget+1);assert.equal(r.compliant,true);
  }
});
test('Từ chối thiết lập ngoài miền và thiếu model, không âm thầm fallback',()=>{
  for(const change of [{horizon:0},{stress:1.1},{volatility:NaN},{marketShock:-1},{sector:'BAD'},{symbol:'BAD'},{budget:0},{seed:-1},{seed:2**40}])assert.throws(()=>sim.simulatePortfolio(samples[0].portfolio,assets,{...sim.defaultScenario,...change},100));
  assert.throws(()=>sim.rebalancePreview(samples[0].portfolio,assets,{...sim.defaultLimits,stock:0},sim.defaultScenario));
});

test('Monte Carlo: biên độ sàn, Student-t, sai số VaR và làm tròn lô 100',()=>{
  assert.equal(sim.priceLimit('HOSE'),.07);assert.equal(sim.priceLimit('HNX'),.1);assert.equal(sim.priceLimit('UPCOM'),.15);assert.equal(sim.priceLimit(undefined),.07);
  const p=samples[0].portfolio,wild=assets.map(a=>({...a,exchange:'HOSE',returns:a.returns.map((r,i)=>r*(i%2?40:-40))}));
  const r=sim.simulatePortfolio(p,wild,{...sim.defaultScenario,horizon:5},2000);
  assert.ok(r.limitHitRate>0,'extreme variance must hit the ±7% band');
  for(const point of r.cone) assert.ok(point.p05>=p.cash+(r.total-p.cash)*(.93**point.day)-1,'no path can fall faster than the daily limit');
  assert.ok(r.var95StdErr>0&&r.var95StdErr<r.var95);
  assert.equal(sim.lotRound(250,1000),200);assert.equal(sim.lotRound(1200,1000),1000);assert.equal(sim.lotRound(99,150),0);
  const plan=sim.rebalancePreview(p,assets,{...sim.defaultLimits,stock:.12},sim.defaultScenario);
  for(const c of plan.changes){const held=p.positions.find(x=>x.symbol===c.symbol).quantity;assert.ok((held-c.quantity)%100===0||held-c.quantity===0||c.quantity===held,`${c.symbol} lot`);near(c.netProceeds,c.proceeds*(1-engine.SELL_COST_RATE),1e-6);}
});
test('Rủi ro: HHI, lãi/lỗ sau thuế phí bán',()=>{
  const p=samples[0].portfolio,r=engine.portfolioRisk(p,assets),w=r.holdings.map(h=>h.value/r.equity);
  near(r.hhi,w.reduce((s,x)=>s+x*x,0),1e-9);near(r.effectiveHoldings,1/r.hhi,1e-9);near(r.netProfit,r.profit-r.equity*engine.SELL_COST_RATE,1e-6);
});
test('Dữ liệu thật: căn phiên chung và beta hồi quy',()=>{
  const live=compile('portfolio-live.ts');
  const a={symbol:'A',bars:[{session:'2026-01-02',close:10},{session:'2026-01-05',close:11},{session:'2026-01-06',close:12.1},{session:'2026-01-07',close:12.1}]};
  const b={symbol:'B',bars:[{session:'2026-01-02',close:20},{session:'2026-01-06',close:22},{session:'2026-01-07',close:23.1}]};
  const r=live.alignSessions([a,b]);
  assert.deepEqual(r.sessions,['2026-01-06','2026-01-07']);near(r.returns[0][0],.21);near(r.returns[1][0],.1);near(r.returns[0][1],0);
  const m=Array.from({length:60},(_,i)=>Math.sin(i)/100),x=m.map((v,i)=>1.5*v+(i%3-1)*1e-4);
  near(live.regressionBeta(x,m),1.5,.02);assert.equal(live.regressionBeta([1,2],[1,2]),null);
  const s={cash:5,positions:[{symbol:'FPT',quantity:100,cost:90000}]};
  assert.deepEqual(live.fromServerPortfolio(live.toServerPortfolio(s)),s);
});
