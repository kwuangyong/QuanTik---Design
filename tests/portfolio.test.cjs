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
  assert.deepEqual(a,b);assert.equal(JSON.stringify(p),original);assert.equal(a.cone.length,21);assert.equal(a.histogram.reduce((sum,h)=>sum+h.count,0),1200);
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
    for(const h of r.portfolio.positions){const original=p.positions.find(a=>a.symbol===h.symbol).quantity;assert.ok(Number.isInteger(h.quantity)&&h.quantity>0);assert.ok(h.quantity===original||h.quantity%sim.LOT_SIZE===0,`${h.symbol} ${h.quantity} không phải lô chẵn`);assert.ok(h.quantity<=p.positions.find(a=>a.symbol===h.symbol).quantity);}
    assert.ok(r.after.holdings.every(h=>h.weight<=sim.defaultLimits.stock+1e-8));assert.ok(r.after.sectors.every(h=>h.weight<=sim.defaultLimits.sector+1e-8));assert.ok(r.after.volatility<=sim.defaultLimits.volatility+1e-8);assert.ok(r.simulation.var95<=r.before.total*sim.defaultLimits.budget+1);assert.equal(r.compliant,true);
  }
});
test('Từ chối thiết lập ngoài miền và thiếu model, không âm thầm fallback',()=>{
  for(const change of [{horizon:0},{stress:1.1},{volatility:NaN},{marketShock:-1},{sector:'BAD'},{symbol:'BAD'},{budget:0},{seed:-1},{seed:2**40}])assert.throws(()=>sim.simulatePortfolio(samples[0].portfolio,assets,{...sim.defaultScenario,...change},100));
  assert.throws(()=>sim.rebalancePreview(samples[0].portfolio,assets,{...sim.defaultLimits,stock:0},sim.defaultScenario));
});
test('Làm tròn lô 100: chỉ giảm, không tăng; giữ nguyên khi không cần giảm',()=>{
  assert.equal(sim.reduceToLot(1237,5000),1237);assert.equal(sim.reduceToLot(1237,1236),1200);assert.equal(sim.reduceToLot(1237,99),0);assert.equal(sim.reduceToLot(150,-5),0);
});
test('Bộ đường dùng chung cho kết quả giống hệt mô phỏng độc lập',()=>{
  const sc={...sim.defaultScenario,...sim.scenarioPresets[3].settings},shared=sim.simulateAssetPaths(assets,sc,300);
  for(const {portfolio:p} of samples){const a=sim.simulatePortfolio(p,assets,sc,300),b=sim.simulatePortfolio(p,assets,sc,300,shared);near(a.var95,b.var95,1e-6);near(a.cvar95,b.cvar95,1e-6);near(a.breachProbability,b.breachProbability);}
  assert.throws(()=>sim.simulatePortfolio(samples[0].portfolio,assets,{...sc,seed:7},300,shared));
});
test('Giảm theo rủi ro: bán mã gây lỗ đuôi lớn hơn trước, giữ mã phòng thủ',()=>{
  const p={cash:0,positions:[{symbol:'SSI',quantity:5000,cost:20000},{symbol:'VNM',quantity:1500,cost:60000}]};
  const sc={...sim.defaultScenario,marketShock:-.12,stress:.5,volatility:1.5};
  const r=sim.rebalancePreview(p,assets,{stock:1,sector:1,volatility:1,budget:.05},sc),sold=Object.fromEntries(r.changes.map(c=>[c.symbol,c.proceeds]));
  assert.ok((sold.SSI??0)>(sold.VNM??0),JSON.stringify(r.changes));assert.equal(r.compliant,true);
});
test('Ngân sách lỗ ngoài 1–50% bị từ chối rõ ràng',()=>{
  for(const budget of [.005,.6])assert.throws(()=>sim.rebalancePreview(samples[0].portfolio,assets,{...sim.defaultLimits,budget},sim.defaultScenario),/Ngân sách lỗ/);
});
