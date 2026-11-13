/** Engine thuần: mọi giá dùng VND, lợi suất/biến động dùng số thập phân. */
export type Asset = { symbol: string; name: string; sector: string; price: number; beta: number; color: string; returns: number[] };
export type Position = { symbol: string; quantity: number; cost: number };
export type Portfolio = { positions: Position[]; cash: number };
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function gaussian(random: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(random(), 1e-12))) * Math.cos(2 * Math.PI * random());
}
export function quantile(values: number[], p: number) {
  if (!values.length || p < 0 || p > 1) throw new Error("Phân vị không hợp lệ.");
  const sorted = [...values].sort((a, b) => a - b), at = (sorted.length - 1) * p, low = Math.floor(at);
  return sorted[low] + (sorted[Math.ceil(at)] - sorted[low]) * (at - low);
}
export function covariance(series: number[][]) {
  if (!series.length) return [];
  const n = series[0].length;
  if (n < 2 || series.some(row => row.length !== n || row.some(v => !Number.isFinite(v)))) throw new Error("Chuỗi lợi suất phải đồng bộ và có ít nhất hai phiên.");
  const means = series.map(row => row.reduce((s, v) => s + v, 0) / n);
  return series.map((a, i) => series.map((b, j) => a.reduce((sum, v, k) => sum + (v - means[i]) * (b[k] - means[j]), 0) / (n - 1)));
}
export function validatePortfolio(portfolio: Portfolio, assets: Asset[]) {
  if (!Number.isFinite(portfolio.cash) || portfolio.cash < 0 || portfolio.cash > 1e12) throw new Error("Tiền mặt phải từ 0 đến 1.000 tỷ VND.");
  const symbols = new Set<string>();
  for (const p of portfolio.positions) {
    if (!assets.some(a => a.symbol === p.symbol) || symbols.has(p.symbol)) throw new Error("Mã không được hỗ trợ hoặc bị trùng.");
    if (!Number.isSafeInteger(p.quantity) || p.quantity < 1 || p.quantity > 1e7 || !Number.isFinite(p.cost) || p.cost <= 0 || p.cost > 1e8) throw new Error("Khối lượng phải là số nguyên 1–10 triệu; giá mua phải lớn hơn 0 và tối đa 100 triệu VND.");
    symbols.add(p.symbol);
  }
}
export function portfolioRisk(portfolio: Portfolio, assets: Asset[]) {
  validatePortfolio(portfolio, assets);
  const cov = covariance(assets.map(a => a.returns));
  const holdings = portfolio.positions.map(p => {
    const index = assets.findIndex(a => a.symbol === p.symbol), asset = assets[index];
    return { ...asset, ...p, index, value: p.quantity * asset.price, invested: p.quantity * p.cost };
  });
  const equity = holdings.reduce((s, p) => s + p.value, 0), invested = holdings.reduce((s, p) => s + p.invested, 0), total = equity + portfolio.cash;
  const weights = assets.map(a => (holdings.find(p => p.symbol === a.symbol)?.value ?? 0) / (total || 1));
  const marginal = cov.map(row => row.reduce((s, v, j) => s + v * weights[j], 0));
  const variance = Math.max(0, weights.reduce((s, w, i) => s + w * marginal[i], 0));
  const rows = holdings.map(p => ({ ...p, weight: weights[p.index], profit: p.value - p.invested, volatility: Math.sqrt(cov[p.index][p.index] * 252), riskContribution: variance ? weights[p.index] * marginal[p.index] / variance : 0 }));
  const sectors = [...new Set(rows.map(p => p.sector))].map(name => ({ name, value: rows.filter(p => p.sector === name).reduce((s, p) => s + p.value, 0), weight: rows.filter(p => p.sector === name).reduce((s, p) => s + p.weight, 0), color: rows.find(p => p.sector === name)!.color })).sort((a,b) => b.weight - a.weight);
  const sectorWeights = sectors.map(sector => assets.map(a => (rows.find(h => h.symbol === a.symbol && h.sector === sector.name)?.value ?? 0) / (sector.value || 1)));
  const sectorCov = sectorWeights.map(a => sectorWeights.map(b => a.reduce((sum,w,i) => sum + w * cov[i].reduce((t,c,j) => t + c*b[j],0),0)));
  const sectorCorrelation = sectorCov.map((row,i) => row.map((v,j) => sectorCov[i][i] > 0 && sectorCov[j][j] > 0 ? Math.max(-1, Math.min(1, v / Math.sqrt(sectorCov[i][i]*sectorCov[j][j]))) : i===j ? 1 : 0));
  return { holdings: rows, sectors, total, equity, invested, profit: equity - invested, returnPct: invested ? (equity - invested) / invested : 0, volatility: Math.sqrt(variance * 252), beta: rows.reduce((s,p) => s + p.weight * p.beta, 0), cashWeight: portfolio.cash / (total || 1), cov,
    sectorCorrelation, correlation: cov.map((row,i) => row.map((v,j) => cov[i][i] > 0 && cov[j][j] > 0 ? Math.max(-1, Math.min(1, v / Math.sqrt(cov[i][i] * cov[j][j]))) : i === j ? 1 : 0)) };
}
