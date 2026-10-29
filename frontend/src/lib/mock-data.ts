import market from "../../../backend/mock/market.json";
import charts from "../../../backend/mock/charts.json";
import scan from "../../../backend/mock/scan.json";
import demo from "../../../backend/mock/demo.json";
import analysisVisuals from "../../../backend/mock/analysis-visuals.json";

type Quote = number | null;
export type Stock = {
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  reference: Quote;
  ceiling: Quote;
  floor: Quote;
  price: Quote;
  change: Quote;
  volume: Quote;
  matchedVolume: Quote;
  value: Quote;
  open: Quote;
  high: Quote;
  low: Quote;
  foreignBuy: Quote;
  foreignSell: Quote;
  foreignRoom: Quote;
  quantScore: Quote;
  bid: { price: Quote; volume: Quote; priceLabel?: string }[];
  ask: { price: Quote; volume: Quote; priceLabel?: string }[];
};

export const demoEnabled = demo.enabled;
export const demoWeights = demo.groupWeights;
export const stocks: Stock[] = market.stocks.map((stock) => demoEnabled ? { ...stock, matchedVolume: demo.matchedVolumes.find((item) => item.symbol === stock.symbol)?.volume ?? null } : stock);
export const sectors = market.sectors;
export const indices = demoEnabled ? demo.indices : market.indices;
export const chartOptions = charts;
export const scanSnapshot = scan;
export type ScanResult = {
  symbol: string; recommendation: string; filter: string; score: number; sector: string;
  conditions: string[]; explanation: string; metrics: Record<string, string | null>;
};
export const getDemoResult = (symbol: string): ScanResult | undefined =>
  demoEnabled ? demo.results.find((result) => result.symbol === symbol) : undefined;
export const getAnalysisVisuals = (symbol: string) => {
  const report = demoEnabled ? analysisVisuals.reports.find((item) => item.symbol === symbol) : undefined;
  return report ? { ...report, garch: { ...report.garch, surface: analysisVisuals.garchSurface } } : undefined;
};
export type AnalysisVisuals = NonNullable<ReturnType<typeof getAnalysisVisuals>>;
export const getDemoCandles = (symbol: string, interval: string) => {
  const key = interval === "1W" ? "1W" : interval === "1M" ? "1M" : "1D";
  return demo.series.find((series) => series.symbol === symbol)?.frames[key] ?? [];
};
export const getScanResult = (symbol: string) =>
  [...scan.best, ...scan.avoid].find((result) => result.symbol === symbol);
export const getStock = (symbol: string) =>
  stocks.find((stock) => stock.symbol === symbol.toUpperCase());
export const format = (value: Quote, digits = 2) =>
  value === null ? "—" : value.toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
export const signed = (value: Quote) =>
  value === null ? "—" : `${value > 0 ? "+" : ""}${format(value)}%`;
export const tone = (value: Quote) =>
  value === null ? "muted" : value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
