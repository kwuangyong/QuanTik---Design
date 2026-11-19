import { covariance, gaussian, seededRandom, quantile, portfolioRisk, type Asset, type Portfolio } from "./portfolio-engine";
import { quantModel } from "./portfolio-quant-adapter";
export type Scenario = { horizon: number; marketShock: number; sector: string; sectorShock: number; symbol: string; symbolShock: number; stress: number; volatility: number; budget: number; seed: number };
export const defaultScenario: Scenario = { horizon:20, marketShock:0, sector:"Ngân hàng", sectorShock:0, symbol:"FPT", symbolShock:0, stress:0, volatility:1, budget:.1, seed:42 };
export const scenarioPresets = [
  {name:"Cơ sở", settings:{marketShock:0,sectorShock:0,symbolShock:0,stress:0,volatility:1}},
  {name:"Thị trường giảm", settings:{marketShock:-.1,sectorShock:0,symbolShock:0,stress:.35,volatility:1.3}},
  {name:"Cú sốc ngân hàng", settings:{marketShock:-.03,sector:"Ngân hàng",sectorShock:-.15,symbolShock:0,stress:.4,volatility:1.4}},
  {name:"Căng thẳng đồng thời", settings:{marketShock:-.12,sector:"Ngân hàng",sectorShock:-.12,symbol:"FPT",symbolShock:-.08,stress:.7,volatility:1.8}},
];
export function cholesky(matrix: number[][]) {
  const n = matrix.length, lower = matrix.map(() => Array<number>(n).fill(0));
  if (matrix.some(row => row.length !== n)) throw new Error("Ma trận không vuông.");
  if (matrix.some((row,i) => row.some((v,j) => !Number.isFinite(v) || Math.abs(v-matrix[j][i])>1e-9))) throw new Error("Ma trận phải hữu hạn và đối xứng.");
  for (let i=0;i<n;i++) for(let j=0;j<=i;j++) {
    let sum = matrix[i][j];
    for(let k=0;k<j;k++) sum -= lower[i][k] * lower[j][k];
    if(i===j) { if(sum < -1e-10) throw new Error("Ma trận tương quan không xác định dương."); lower[i][j] = Math.sqrt(Math.max(sum,1e-12)); }
    else lower[i][j] = sum / lower[j][j];
  }
  return lower;
}
export function validateScenario(s: Scenario, assets: Asset[]) {
  if (![5,20,60].includes(s.horizon) || !Number.isSafeInteger(s.seed) || s.seed<0 || s.seed>4294967295 || ![s.marketShock,s.sectorShock,s.symbolShock].every(v => Number.isFinite(v) && v >= -.5 && v <= .5) || !Number.isFinite(s.stress) || s.stress < 0 || s.stress > 1 || !Number.isFinite(s.volatility) || s.volatility < .5 || s.volatility > 3 || !Number.isFinite(s.budget) || s.budget < .01 || s.budget > .5 || !assets.some(a => a.symbol===s.symbol) || !assets.some(a => a.sector===s.sector)) throw new Error("Thiết lập kịch bản không hợp lệ.");
}
export function deterministicImpact(asset: Asset, s: Scenario) {
  // Cú sốc là lợi suất cộng dồn cả kỳ; các nguồn độc lập cộng theo log.
  return Math.expm1(asset.beta * Math.log1p(s.marketShock) + (asset.sector===s.sector ? Math.log1p(s.sectorShock):0) + (asset.symbol===s.symbol ? Math.log1p(s.symbolShock):0));
}
/** Mô phỏng giá tương đối (giá/giá hiện tại) cho cả universe. Không phụ thuộc danh mục, nên mọi danh mục dùng chung một bộ nhiễu. */
export function simulateAssetPaths(assets: Asset[], scenario: Scenario, paths = 1200) {
  validateScenario(scenario, assets);
  if(!Number.isInteger(paths) || paths<100 || paths>10000) throw new Error("Số đường phải từ 100 đến 10.000.");
  const n = assets.length, s = scenario, horizon = s.horizon;
  const models = assets.map(a => quantModel(a.symbol));
  const returns = covariance(assets.map(a => a.returns));
  const baseCorrelation = returns.map((row,i) => row.map((v,j) => returns[i][i] > 0 && returns[j][j] > 0 ? Math.max(-1, Math.min(1, v / Math.sqrt(returns[i][i] * returns[j][j]))) : i === j ? 1 : 0));
  // Co về I để ổn định; trộn ma trận toàn số 1 giữ tính PSD khi tăng tương quan.
  const correlation = baseCorrelation.map((row,i) => row.map((v,j) => i===j ? 1 : (1-s.stress)*.98*v+s.stress));
  const lower = cholesky(correlation), random = seededRandom(s.seed);
  const shocks = assets.map(a => Math.log1p(deterministicImpact(a,s)) / horizon);
  // relatives[(path*(horizon+1)+day)*n+i]; ngày 0 = 1.
  const relatives = new Float64Array(paths*(horizon+1)*n);
  for(let path=0;path<paths;path++) {
    const prices = assets.map(()=>1), variances = models.map(m=>m.variance);
    relatives.fill(1, path*(horizon+1)*n, (path*(horizon+1)+1)*n);
    for(let day=1;day<=horizon;day++) {
      const noise = assets.map(()=>gaussian(random)), offset = (path*(horizon+1)+day)*n;
      for(let i=0;i<n;i++) {
        const z = lower[i].reduce((sum,l,j)=>sum+l*noise[j],0), variance = variances[i]*s.volatility**2;
        prices[i] *= Math.exp(shocks[i]-.5*variance+Math.sqrt(variance)*z);
        // Phương sai kỳ vọng; không fit lại hoặc cập nhật theo nhiễu thực hiện.
        variances[i]=models[i].omega+(models[i].alpha+models[i].beta)*variances[i];
        relatives[offset+i]=prices[i];
      }
    }
  }
  return {paths, horizon, n, relatives, correlation, scenario:{...s}};
}
export type AssetPaths = ReturnType<typeof simulateAssetPaths>;
export function simulatePortfolio(portfolio: Portfolio, assets: Asset[], scenario: Scenario, paths = 1200, shared?: AssetPaths) {
  const sim = shared ?? simulateAssetPaths(assets, scenario, paths);
  if (shared && (shared.n !== assets.length || JSON.stringify(shared.scenario) !== JSON.stringify(scenario) || shared.paths !== paths)) throw new Error("Bộ đường mô phỏng dùng chung không khớp kịch bản.");
  const risk = portfolioRisk(portfolio,assets), s = scenario, {n, horizon, relatives, correlation} = sim;
  const values = assets.map(a => risk.holdings.find(h=>h.symbol===a.symbol)?.value ?? 0);
  const buckets = Array.from({length:horizon+1},()=>[] as number[]);
  const endings: number[] = [], means = assets.map(()=>0);
  let lossCount=0, breachCount=0;
  for(let path=0;path<paths;path++) {
    let breached=false;
    buckets[0].push(risk.total);
    for(let day=1;day<=horizon;day++) {
      const offset=(path*(horizon+1)+day)*n;
      let value=portfolio.cash;
      for(let i=0;i<n;i++) value+=relatives[offset+i]*values[i];
      buckets[day].push(value);
      if(risk.total>0 && value<=risk.total*(1-s.budget)) breached=true;
      if(day===horizon) {
        endings.push(value); if(value<risk.total) lossCount++;
        for(let i=0;i<n;i++) means[i]+=(relatives[offset+i]-1)*values[i]/paths;
      }
    }
    if(breached) breachCount++;
  }
  const losses=endings.map(v=>risk.total-v).sort((a,b)=>b-a), tail=losses.slice(0,Math.ceil(paths*.05));
  const cone=buckets.map((b,day)=>({day,p05:quantile(b,.05),p25:quantile(b,.25),p50:quantile(b,.5),p75:quantile(b,.75),p95:quantile(b,.95)}));
  const attribution=risk.holdings.map(h=>({symbol:h.symbol,sector:h.sector,mean:means[h.index],shock:h.value*deterministicImpact(h,s)}));
  const sectorAttribution=risk.sectors.map(sector=>({name:sector.name,mean:attribution.filter(a=>a.sector===sector.name).reduce((sum,a)=>sum+a.mean,0),shock:attribution.filter(a=>a.sector===sector.name).reduce((sum,a)=>sum+a.shock,0)}));
  const min=Math.min(...endings), max=Math.max(...endings), width=(max-min)/12 || 1;
  const histogram=Array.from({length:12},(_,i)=>({low:min+i*width,high:min+(i+1)*width,count:0}));
  endings.forEach(v=>histogram[Math.min(11,Math.floor((v-min)/width))].count++);
  return {total:risk.total,scenario:{...s},paths,cone,histogram,correlation,attribution,sectorAttribution,var95:Math.max(0,quantile(losses,.95)),cvar95:Math.max(0,tail.reduce((a,b)=>a+b,0)/tail.length),lossProbability:lossCount/paths,breachProbability:breachCount/paths,mean:endings.reduce((a,b)=>a+b,0)/paths};
}
export type Limits = { stock: number; sector: number; volatility: number; budget: number };
export const defaultLimits: Limits = {stock:.3,sector:.45,volatility:.22,budget:.1};
/** Lô chẵn sàn HOSE. Phần lẻ hiện có chỉ được bán ra, không bao giờ mua thêm. */
export const LOT_SIZE = 100;
/** Hạ khối lượng về lô chẵn ≤ target; giữ nguyên nếu không cần giảm. */
export function reduceToLot(current: number, target: number, lot = LOT_SIZE) {
  return target >= current ? current : Math.max(0, Math.floor(Math.max(0, target) / lot) * lot);
}
export function validateLimits(limits: Limits) {
  if(["stock","sector","volatility","budget"].some(k=>{const v=(limits as Record<string,number>)[k];return !Number.isFinite(v)||v<=0||v>1;})) throw new Error("Giới hạn phải lớn hơn 0 và không quá 100%.");
  if(limits.budget<.01||limits.budget>.5) throw new Error("Ngân sách lỗ phải từ 1% đến 50% tổng tài sản.");
}
// Mỗi bước giảm 1 lô, hoặc ~2% vị thế với vị thế rất lớn, để số vòng lặp có giới hạn.
const stepTarget=(quantity:number)=>quantity-Math.max(LOT_SIZE,Math.floor(quantity*.02/LOT_SIZE)*LOT_SIZE);
const MAX_STEPS=20000;
export function rebalancePreview(portfolio: Portfolio, assets: Asset[], limits: Limits, scenario: Scenario) {
  validateLimits(limits);
  const before = portfolioRisk(portfolio,assets), total = before.total, n = assets.length;
  const appliedScenario={...scenario,budget:limits.budget};
  const quantities=new Map(before.holdings.map(h=>[h.symbol,h.quantity]));
  const priceOf=new Map(before.holdings.map(h=>[h.symbol,h.price])), indexOf=new Map(before.holdings.map(h=>[h.symbol,h.index]));
  const reduce=(symbol:string,target:number)=>quantities.set(symbol,reduceToLot(quantities.get(symbol)!,target));
  // 1. Trần từng mã.
  for(const h of before.holdings) reduce(h.symbol,limits.stock*total/h.price);
  // 2. Trần ngành: giảm theo tỉ lệ các mã còn lại trong ngành, rồi bù từng lô nếu làm tròn chưa đủ.
  for(const sector of before.sectors) {
    const members=before.holdings.filter(h=>h.sector===sector.name), cap=limits.sector*total;
    const value=()=>members.reduce((sum,h)=>sum+quantities.get(h.symbol)!*h.price,0);
    const scale=Math.min(1,cap/(value()||1));
    if(scale<1) members.forEach(h=>reduce(h.symbol,quantities.get(h.symbol)!*scale));
    for(let guard=0;value()>cap+1e-6&&guard<MAX_STEPS;guard++) {
      const largest=[...members].filter(h=>quantities.get(h.symbol)!>0).sort((a,b)=>quantities.get(b.symbol)!*b.price-quantities.get(a.symbol)!*a.price)[0];
      reduce(largest.symbol,stepTarget(quantities.get(largest.symbol)!));
    }
  }
  const weights=()=>{const w=Array<number>(n).fill(0);quantities.forEach((q,symbol)=>{w[indexOf.get(symbol)!]=q*priceOf.get(symbol)!/(total||1);});return w;};
  const held=()=>[...quantities].filter(([,q])=>q>0).map(([symbol])=>symbol);
  // 3. Trần biến động: mỗi bước bán mã có biến động biên (Σw)ᵢ lớn nhất, tức giảm biến động nhiều nhất trên mỗi đồng bán.
  for(let guard=0;guard<MAX_STEPS;guard++) {
    const w=weights(), marginal=before.cov.map(row=>row.reduce((sum,v,j)=>sum+v*w[j],0));
    const variance=Math.max(0,w.reduce((sum,x,i)=>sum+x*marginal[i],0));
    if(Math.sqrt(variance*252)<=limits.volatility+1e-9) break;
    const pick=held().sort((a,b)=>marginal[indexOf.get(b)!]-marginal[indexOf.get(a)!])[0];
    if(!pick||marginal[indexOf.get(pick)!]<=0) break;
    reduce(pick,stepTarget(quantities.get(pick)!));
  }
  // 4. Ngân sách VaR 95%: dùng cùng bộ đường giá; mỗi bước bán mã có tổn thất trung bình mỗi đồng lớn nhất trong 5% đường xấu nhất.
  const shared=simulateAssetPaths(assets,appliedScenario), {paths,horizon,relatives}=shared, last=(path:number)=>(path*(horizon+1)+horizon)*n;
  const budget=limits.budget*total, tailCount=Math.ceil(paths*.05);
  for(let guard=0;guard<MAX_STEPS;guard++) {
    const w=weights(), losses=Array.from({length:paths},(_,path)=>{let loss=0;for(let i=0;i<n;i++) loss+=w[i]*total*(1-relatives[last(path)+i]);return {path,loss};});
    if(Math.max(0,quantile(losses.map(l=>l.loss),.95))<=budget) break;
    const tail=losses.sort((a,b)=>b.loss-a.loss).slice(0,tailCount);
    const tailLoss=(symbol:string)=>tail.reduce((sum,{path})=>sum+1-relatives[last(path)+indexOf.get(symbol)!],0)/tailCount;
    const pick=held().sort((a,b)=>tailLoss(b)-tailLoss(a))[0];
    if(!pick||tailLoss(pick)<=0) break;
    reduce(pick,stepTarget(quantities.get(pick)!));
  }
  const after:Portfolio={cash:portfolio.cash+before.holdings.reduce((sum,h)=>sum+(h.quantity-quantities.get(h.symbol)!)*h.price,0),positions:portfolio.positions.map(p=>({...p,quantity:quantities.get(p.symbol)!})).filter(p=>p.quantity>0)};
  const afterRisk=portfolioRisk(after,assets);
  const baseline=simulatePortfolio(portfolio,assets,appliedScenario,paths,shared), simulation=simulatePortfolio(after,assets,appliedScenario,paths,shared);
  const changes=before.holdings.map(h=>({symbol:h.symbol,quantity:h.quantity-quantities.get(h.symbol)!,proceeds:(h.quantity-quantities.get(h.symbol)!)*h.price})).filter(c=>c.quantity>0);
  // Kiểm chứng lại sau làm tròn lô: báo kết quả thay vì cam kết.
  const compliant=afterRisk.holdings.every(h=>h.weight<=limits.stock+1e-9)&&afterRisk.sectors.every(h=>h.weight<=limits.sector+1e-9)&&afterRisk.volatility<=limits.volatility+1e-9&&simulation.var95<=budget+1;
  return {before,after:afterRisk,portfolio:after,baseline,simulation,changes,compliant,lotSize:LOT_SIZE};
}
