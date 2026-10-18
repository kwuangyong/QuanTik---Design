"use client";
import { useEffect, useState } from "react";
import { stocks } from "@/lib/mock-data";
import { marketConfig, quotesConfig } from "@/lib/tradingview";
import { Panel } from "./ui";
import { usePreferences } from "./preferences";
import { TradingViewWidget } from "./tradingview-widget";

export function TradingViewBoard() {
  const { theme, watchlist } = usePreferences();
  const [view, setView] = useState("quotes");
  const [chartUrl, setChartUrl] = useState("");
  useEffect(() => { setChartUrl(`${window.location.origin}${window.location.pathname}`); }, []);
  const groups = ["HNX", "UPCOM", "HOSE"].map(exchange => ({name: exchange,
    symbols: stocks.filter(stock => stock.exchange === exchange && (view !== "watch" || watchlist.includes(stock.symbol)))
      .map(stock => ({ name: `${stock.exchange}:${stock.symbol}`, displayName: stock.symbol }))
  })).filter(group => group.symbols.length);
  return <Panel title="Bảng điện · TradingView" action={<span className="text-xs text-[var(--muted)]">Widget nhúng</span>}>
    <div className="flex flex-wrap items-center gap-2 p-4" role="group" aria-label="Chế độ bảng giá">
      {[["quotes", "Danh mục thử"], ["watch", "Theo dõi"], ["market", "Thị trường Việt Nam"]].map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)} className={`rounded border px-3 py-2 text-sm ${view === id ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{label}</button>)}
    </div>
    {view === "market" ? <TradingViewWidget kind="market" config={marketConfig(theme)} title="Thị trường Việt Nam" fallbackUrl="https://www.tradingview.com/markets/stocks-vietnam/"/> : groups.length ?
      <TradingViewWidget kind="quotes" config={quotesConfig(theme, groups, chartUrl)} title="Bảng giá" fallbackUrl="https://www.tradingview.com/markets/stocks-vietnam/"/> : <p className="p-6 text-sm text-[var(--muted)]">Chưa có mã trong danh sách theo dõi.</p>}
    <p className="px-4 pb-4 text-xs leading-6 text-[var(--muted)]">Danh mục thử dùng {stocks.length} mã để kiểm tra nhúng. Bảng TradingView không có ba mức dư mua/bán. HNX/UPCoM hiện được công bố ở mức cuối ngày (EOD); HOSE cần kiểm tra khả năng nhúng.</p>
  </Panel>;
}
