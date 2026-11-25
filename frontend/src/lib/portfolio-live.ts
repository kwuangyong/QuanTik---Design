import { api } from "./api/client";
import type { Asset, Portfolio } from "./portfolio-engine";

/** Contracts of quantik-server portfolio_api.py (GET /market/latest, /market/candles, GET|PUT /portfolio). */
export type MarketLatest = { as_of: string; run_id: string; published_at: number | null; items: { symbol: string; name: string | null; exchange: string | null; sector: string | null; price_vnd: number | null }[] };
export type MarketCandles = { symbol: string; as_of: string; bars: { session: string; open: number; high: number; low: number; close: number; volume: number }[] };
export type ServerPortfolio = { cash_vnd: number; updated_at: number | null; positions: { symbol: string; quantity: number; cost_vnd: number }[] };

/** Sessions of history requested per symbol: one trading year plus a small buffer. */
export const LIVE_WINDOW = 260;
/** Minimum common sessions for a covariance the risk tab is allowed to show. */
export const MIN_LIVE_OBSERVATIONS = 120;
const BENCHMARKS = ["VNINDEX", "VN30"];
const palette = ["#2f7d5b", "#d9822b", "#3a6ea5", "#b0413e", "#7a5ea8", "#3d8c95", "#a68a2d", "#6b7a8f"];

export type LiveAssets = { assets: Asset[]; asOf: string; observations: number; benchmark: string | null; unpriced: string[] };

/** Close-to-close simple returns on the sessions every series shares, in session order. */
export function alignSessions(series: { symbol: string; bars: { session: string; close: number }[] }[]) {
  const sets = series.map(s => new Map(s.bars.filter(b => Number.isFinite(b.close) && b.close > 0).map(b => [b.session, b.close])));
  const common = [...sets[0].keys()].filter(session => sets.every(set => set.has(session))).sort();
  return { sessions: common.slice(1), returns: sets.map(set => common.slice(1).map((session, i) => set.get(session)! / set.get(common[i])! - 1)) };
}
/** OLS beta of asset returns on benchmark returns. */
export function regressionBeta(asset: number[], market: number[]) {
  const n = Math.min(asset.length, market.length);
  if (n < 20) return null;
  const ma = asset.slice(-n).reduce((s, v) => s + v, 0) / n, mm = market.slice(-n).reduce((s, v) => s + v, 0) / n;
  let cov = 0, varM = 0;
  for (let i = 0; i < n; i++) { const a = asset[asset.length - n + i] - ma, m = market[market.length - n + i] - mm; cov += a * m; varM += m * m; }
  return varM > 0 ? cov / varM : null;
}

/** Real published prices and history for the held symbols. Throws when the backend cannot serve them. */
export async function loadLiveAssets(symbols: string[]): Promise<LiveAssets> {
  if (!symbols.length) throw new Error("Danh mục chưa có mã.");
  const latest = await api<MarketLatest>("user", "market/latest");
  const meta = new Map(latest.items.map(item => [item.symbol, item]));
  const unpriced = symbols.filter(symbol => !(Number(meta.get(symbol)?.price_vnd) > 0));
  if (unpriced.length) return { assets: [], asOf: latest.as_of, observations: 0, benchmark: null, unpriced };
  const candles = await Promise.all(symbols.map(symbol => api<MarketCandles>("user", `market/candles?symbol=${encodeURIComponent(symbol)}&limit=${LIVE_WINDOW}`)));
  let benchmark: MarketCandles | null = null;
  for (const symbol of BENCHMARKS) {
    try { benchmark = await api<MarketCandles>("user", `market/candles?symbol=${symbol}&limit=${LIVE_WINDOW}`); break; } catch { /* benchmark history is optional */ }
  }
  const aligned = alignSessions([...candles, ...(benchmark ? [benchmark] : [])]);
  if (aligned.sessions.length < MIN_LIVE_OBSERVATIONS) throw new Error(`Chỉ có ${aligned.sessions.length} phiên lịch sử chung; cần tối thiểu ${MIN_LIVE_OBSERVATIONS} phiên để ước lượng rủi ro.`);
  const market = benchmark ? aligned.returns.at(-1)! : null;
  const assets: Asset[] = symbols.map((symbol, i) => {
    const item = meta.get(symbol)!, returns = aligned.returns[i];
    return { symbol, name: item.name || symbol, sector: item.sector || "Chưa phân ngành", exchange: item.exchange, price: item.price_vnd!,
      beta: market ? regressionBeta(returns, market) ?? 1 : 1, color: palette[i % palette.length], returns };
  });
  return { assets, asOf: latest.as_of, observations: aligned.sessions.length, benchmark: benchmark?.symbol ?? null, unpriced: [] };
}

export const fromServerPortfolio = (value: ServerPortfolio): Portfolio => ({
  cash: value.cash_vnd, positions: value.positions.filter(p => p.cost_vnd > 0).map(p => ({ symbol: p.symbol, quantity: p.quantity, cost: p.cost_vnd })),
});
export const toServerPortfolio = (value: Portfolio) => ({
  cash_vnd: value.cash, positions: value.positions.map(p => ({ symbol: p.symbol, quantity: p.quantity, cost_vnd: p.cost })),
});
export const loadServerPortfolio = () => api<ServerPortfolio>("user", "portfolio").then(fromServerPortfolio);
export const saveServerPortfolio = (value: Portfolio) => api<ServerPortfolio>("user", "portfolio", { method: "PUT", body: JSON.stringify(toServerPortfolio(value)) });
