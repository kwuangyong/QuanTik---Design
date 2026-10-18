"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getStock } from "@/lib/mock-data";
import { chartConfig, parseTVSymbol } from "@/lib/tradingview";
import { usePreferences } from "./preferences";
import { PageHeading, EmptyState } from "./ui";
import { TradingViewWidget } from "./tradingview-widget";
import { MockPriceChart } from "./mock-price-chart";
import { useMockChartPreview } from "./chart-preview-context";

export function ChartWorkspace() {
  const query = useSearchParams();
  const symbol = (query.get("symbol") ?? "FPT").toUpperCase();
  return <><PageHeading title="Biểu đồ"/><ChartSurface key={symbol} symbol={symbol} exchangeHint={query.get("exchange")}/></>;
}

/** Price charts are exclusively the embedded TradingView chart and its native toolbar. */
export function ChartSurface({ symbol, exchangeHint }: {
  symbol: string;
  exchangeHint?: string | null;
  onSymbolChange?: (symbol: string) => void;
  initialQuant?: boolean;
}) {
  const { theme } = usePreferences();
  const mock = useMockChartPreview();
  const qualified = parseTVSymbol(symbol);
  const stock = getStock(symbol);
  const resolved = qualified || parseTVSymbol(`${stock?.exchange || exchangeHint}:${symbol}`);
  if (!resolved) return <EmptyState title="Chọn mã cổ phiếu"><Link href="/dashboard">Về bảng điện →</Link></EmptyState>;
  return <section className="chart-workspace min-w-0 overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] [.chart-dialog_&]:border-0">
    {mock ? <MockPriceChart key={resolved.full} symbol={resolved.symbol} exchange={resolved.exchange}/> : <TradingViewWidget kind="chart" config={chartConfig(resolved.full, "D", theme, "standard")} title={`Biểu đồ ${resolved.symbol}`} fallbackUrl={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(resolved.full)}`}/>}
  </section>;
}
