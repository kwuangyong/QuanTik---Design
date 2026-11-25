import { gaussian, seededRandom, quantile, portfolioRisk, SELL_COST_RATE, type Asset, type Portfolio } from "./portfolio-engine";
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
/** Daily price limits by exchange (HOSE ±7%, HNX ±10%, UPCOM ±15%); unknown exchange uses HOSE. */
export const priceLimit = (exchange?: string | null) => exchange === "UPCOM" ? .15 : exchange === "HNX" ? .1 : .07;
/** Student-t degrees of freedom for daily shocks. Unit variance, heavier tails than Gaussian. */
export const SHOCK_DOF = 5;
function chiSquare(random: () => number, dof: number) { let sum = 0; for (let i = 0; i < dof; i++) { const g = gaussian(random); sum += g*g; } return sum; }
export function simulatePortfolio(portfolio: Portfolio, assets: Asset[], scenario: Scenario, paths = 4000) {
  validateScenario(scenario, assets);
  if(!Number.isInteger(paths) || paths<100 || paths>20000) throw new Error("Số đường phải từ 100 đến 20.000.");
  const risk = portfolioRisk(portfolio,assets), n = assets.length, s = scenario;
  // Co về I để ổn định; trộn ma trận toàn số 1 giữ tính PSD khi tăng tương quan.
  const correlation = risk.correlation.map((row,i) => row.map((v,j) => i===j ? 1 : (1-s.stress)*.98*v+s.stress));
  const lower = cholesky(correlation), random = seededRandom(s.seed);
  const values = assets.map(a => risk.holdings.find(h=>h.symbol===a.symbol)?.value ?? 0);
  const shocks = assets.map(a => Math.log1p(deterministicImpact(a,s)) / s.horizon);
  // One volatility source: the same daily covariance that drives the headline volatility.
  const variances = assets.map((_,i) => Math.max(0, risk.cov[i][i]) * s.volatility**2);
  const limits = assets.map(a => priceLimit(a.exchange));
  const tScale = Math.sqrt((SHOCK_DOF-2)/SHOCK_DOF);
  const buckets = Array.from({length:s.horizon+1},()=>[] as number[]);
  const endings: number[] = [], means = assets.map(()=>0);
  let lossCount=0, breachCount=0, limitHits=0;
  for(let path=0;path<paths;path++) {
    const prices = assets.map(()=>1);
    let breached=false;
    buckets[0].push(risk.total);
    for(let day=1;day<=s.horizon;day++) {
      const noise = assets.map(()=>gaussian(random));
      // Multivariate Student-t: one chi-square mixing draw per day keeps the correlation.
      const mix = tScale*Math.sqrt(SHOCK_DOF/chiSquare(random, SHOCK_DOF));
      for(let i=0;i<n;i++) {
        const z = lower[i].reduce((sum,l,j)=>sum+l*noise[j],0)*mix, variance = variances[i];
        const move = Math.exp(shocks[i]-.5*variance+Math.sqrt(variance)*z), clamped = Math.min(1+limits[i], Math.max(1-limits[i], move));
        if (clamped !== move && values[i] > 0) limitHits++;
        prices[i] *= clamped;
      }
      const value=portfolio.cash+prices.reduce((sum,p,i)=>sum+p*values[i],0);
      buckets[day].push(value);
      if(risk.total>0 && value<=risk.total*(1-s.budget)) breached=true;
      if(day===s.horizon) {
        endings.push(value); if(value<risk.total) lossCount++;
        prices.forEach((p,i)=>{means[i]+=(p-1)*values[i]/paths;});
      }
    }
    if(breached) breachCount++;
  }
  const losses=endings.map(v=>risk.total-v).sort((a,b)=>b-a), tail=losses.slice(0,Math.ceil(paths*.05));
  // Batch-means standard error of VaR95 from 20 independent groups of paths.
  const groups=20, size=Math.floor(paths/groups), batchVar=Array.from({length:groups},(_,g)=>quantile(endings.slice(g*size,(g+1)*size).map(v=>risk.total-v),.95));
  const batchMean=batchVar.reduce((a,b)=>a+b,0)/groups, var95StdErr=Math.sqrt(batchVar.reduce((a,b)=>a+(b-batchMean)**2,0)/(groups-1)/groups);
  const cone=buckets.map((b,day)=>({day,p05:quantile(b,.05),p25:quantile(b,.25),p50:quantile(b,.5),p75:quantile(b,.75),p95:quantile(b,.95)}));
  const attribution=risk.holdings.map(h=>({symbol:h.symbol,sector:h.sector,mean:means[h.index],shock:h.value*deterministicImpact(h,s)}));
  const sectorAttribution=risk.sectors.map(sector=>({name:sector.name,mean:attribution.filter(a=>a.sector===sector.name).reduce((sum,a)=>sum+a.mean,0),shock:attribution.filter(a=>a.sector===sector.name).reduce((sum,a)=>sum+a.shock,0)}));
  const min=Math.min(...endings), max=Math.max(...endings), width=(max-min)/12 || 1;
  const histogram=Array.from({length:12},(_,i)=>({low:min+i*width,high:min+(i+1)*width,count:0}));
  endings.forEach(v=>histogram[Math.min(11,Math.floor((v-min)/width))].count++);
  const held=values.filter(v=>v>0).length;
  return {total:risk.total,scenario:{...s},paths,cone,histogram,correlation,attribution,sectorAttribution,var95:Math.max(0,quantile(losses,.95)),var95StdErr:risk.total>0?var95StdErr:0,cvar95:Math.max(0,tail.reduce((a,b)=>a+b,0)/tail.length),lossProbability:lossCount/paths,breachProbability:breachCount/paths,limitHitRate:held?limitHits/(paths*s.horizon*held):0,mean:endings.reduce((a,b)=>a+b,0)/paths};
}
/** HOSE/HNX/UPCOM board lot. Reductions round down to whole lots; an odd lot is sold whole. */
export const BOARD_LOT = 100;
export function lotRound(target: number, held: number) {
  if (target >= held) return held;
  return Math.max(0, Math.floor(target / BOARD_LOT) * BOARD_LOT);
}
export type Limits = { stock: number; sector: number; volatility: number; budget: number };
export const defaultLimits: Limits = {stock:.3,sector:.45,volatility:.22,budget:.1};
export function rebalancePreview(portfolio: Portfolio, assets: Asset[], limits: Limits, scenario: Scenario) {
  if(Object.values(limits).some(v=>!Number.isFinite(v)||v<=0||v>1)) throw new Error("Giới hạn phải lớn hơn 0 và không quá 100%.");
  const before = portfolioRisk(portfolio,assets);
  const quantities=new Map(before.holdings.map(h=>[h.symbol,lotRound(Math.floor(limits.stock*before.total/h.price),h.quantity)]));
  for(const sector of before.sectors) {
    const members=before.holdings.filter(h=>h.sector===sector.name), value=members.reduce((sum,h)=>sum+quantities.get(h.symbol)!*h.price,0);
    const scale=Math.min(1,limits.sector*before.total/(value||1));
    members.forEach(h=>quantities.set(h.symbol,lotRound(Math.floor(quantities.get(h.symbol)!*scale),quantities.get(h.symbol)!)));
  }
  const candidate=():Portfolio=>({cash:portfolio.cash+before.holdings.reduce((sum,h)=>sum+(h.quantity-quantities.get(h.symbol)!)*h.price,0),positions:portfolio.positions.map(p=>({...p,quantity:quantities.get(p.symbol)!})).filter(p=>p.quantity>0)});
  const capped=portfolioRisk(candidate(),assets), scale=Math.min(1,limits.volatility/(capped.volatility||1));
  quantities.forEach((quantity,symbol)=>quantities.set(symbol,lotRound(Math.floor(quantity*scale),quantity)));
  const appliedScenario={...scenario,budget:limits.budget};
  const interim=simulatePortfolio(candidate(),assets,appliedScenario);
  const lossScale=Math.min(1,limits.budget*before.total/(interim.var95||1));
  quantities.forEach((quantity,symbol)=>quantities.set(symbol,lotRound(Math.floor(quantity*lossScale),quantity)));
  const after=candidate(), afterRisk=portfolioRisk(after,assets);
  const baseline=simulatePortfolio(portfolio,assets,appliedScenario), simulation=simulatePortfolio(after,assets,appliedScenario);
  const changes=before.holdings.map(h=>{const quantity=h.quantity-quantities.get(h.symbol)!,gross=quantity*h.price;return {symbol:h.symbol,quantity,proceeds:gross,netProceeds:gross*(1-SELL_COST_RATE)};}).filter(c=>c.quantity>0);
  // Làm tròn số nguyên có thể dịch cơ cấu nhỏ: báo kết quả kiểm chứng thay vì cam kết.
  const compliant=afterRisk.holdings.every(h=>h.weight<=limits.stock+1e-9)&&afterRisk.sectors.every(h=>h.weight<=limits.sector+1e-9)&&afterRisk.volatility<=limits.volatility+1e-9&&simulation.var95<=limits.budget*before.total+1;
  return {before,after:afterRisk,portfolio:after,baseline,simulation,changes,compliant};
}
