export const chartIntervals = [
  ["1", "1 phút"], ["5", "5 phút"], ["15", "15 phút"],
  ["30", "30 phút"], ["60", "1 giờ"], ["240", "4 giờ"],
  ["D", "Ngày"], ["W", "Tuần"], ["M", "Tháng"],
] as const;

export const indicatorPresets = {
  standard: { label: "SMA + RSI", studies: ["MASimple@tv-basicstudies", "RSI@tv-basicstudies"] },
  trend: { label: "EMA + Bollinger Bands", studies: ["MAExp@tv-basicstudies", "BB@tv-basicstudies"] },
  momentum: { label: "MACD + RSI", studies: ["MACD@tv-basicstudies", "RSI@tv-basicstudies"] },
  clean: { label: "Chart trống", studies: [] },
};
export type IndicatorPreset = keyof typeof indicatorPresets;
export function parseTVSymbol(value: string) {
  const match = value.trim().toUpperCase().match(/^(HOSE|HNX|UPCOM|NASDAQ|NYSE|BINANCE):([A-Z0-9.]{1,20})$/);
  return match ? { exchange: match[1], symbol: match[2], full: `${match[1]}:${match[2]}` } : null;
}
export function chartConfig(symbol: string, interval: string, theme: string, preset: IndicatorPreset) {
  const parsed = parseTVSymbol(symbol);
  if (!parsed) throw new Error("Mã TradingView phải có dạng SÀN:MÃ.");
  return {
    autosize: true, symbol: parsed.full,
    interval: chartIntervals.some(([id]) => id === interval) ? interval : "D",
    timezone: "Asia/Ho_Chi_Minh", theme: theme === "light" ? "light" : "dark",
    style: "1", locale: "vi_VN", withdateranges: true,
    hide_top_toolbar: false, hide_side_toolbar: false, hide_legend: false,
    allow_symbol_change: false, save_image: true, calendar: false,
    studies: indicatorPresets[preset].studies,
    support_host: "https://www.tradingview.com",
  };
}
export function quotesConfig(theme: string, groups: {name: string; symbols: {name: string; displayName: string}[]}[], chartUrl: string) {
  return { width: "100%", height: "100%", locale: "vi_VN", colorTheme: theme === "light" ? "light" : "dark",
    isTransparent: false, showSymbolLogo: true, symbolsGroups: groups, largeChartUrl: chartUrl };
}
export function marketConfig(theme: string) {
  return { width: "100%", height: "100%", defaultColumn: "overview", defaultScreen: "most_capitalized",
    showToolbar: true, locale: "vi_VN", market: "vietnam", colorTheme: theme === "light" ? "light" : "dark" };
}
