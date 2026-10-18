"use client";
import { tw } from "@/lib/tailwind";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { chartConfig, chartIntervals, indicatorPresets, parseTVSymbol, type IndicatorPreset } from "@/lib/tradingview";
import { TradingViewWidget } from "./tradingview-widget";
import { usePreferences } from "./preferences";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { stocks, getStock } from "@/lib/mock-data";
import { PageHeading, EmptyState } from "./ui";
import { SampleChart } from "./sample-chart";
import { QuantPanel } from "./quant-panel";
export function ChartWorkspace() {
    const router = useRouter();
    const query = useSearchParams();
    const symbol = (query.get("symbol") ?? "FPT").toUpperCase();
    return <><PageHeading title="Biểu đồ"/><ChartSurface key={symbol} symbol={symbol} exchangeHint={query.get("exchange")} onSymbolChange={(next) => router.replace(`/charts?symbol=${encodeURIComponent(next)}`)}/></>;
}
export function ChartSurface({ symbol, exchangeHint, onSymbolChange, initialQuant = true }: {
    symbol: string;
    exchangeHint?: string | null;
    initialQuant?: boolean;
    onSymbolChange: (symbol: string) => void;
}) {
    const qualified = parseTVSymbol(symbol);
    const ticker = qualified?.symbol || symbol;
    const stock = (qualified ? { ...getStock(ticker), symbol: ticker, name: getStock(ticker)?.name || ticker, exchange: qualified.exchange } : getStock(ticker)) || (exchangeHint && ["HOSE", "HNX", "UPCOM"].includes(exchangeHint)
        && /^[A-Z0-9]{2,16}$/.test(symbol) ? { symbol, name: symbol, exchange: exchangeHint } : undefined);
    const [timeframe, setTimeframe] = useState("D");
    const [sidebar, setSidebar] = useState(initialQuant);
    const [source, setSource] = useState("tradingview");
    const [preset, setPreset] = useState<IndicatorPreset>("standard");
    const [custom, setCustom] = useState(qualified?.full || (stock ? `${stock.exchange}:${ticker}` : ""));
    const [symbolError, setSymbolError] = useState("");
    const { theme } = usePreferences();
    if (!stock)
        return <EmptyState title="Chọn mã cổ phiếu"><Link className="text-link [.auth-stage_.account-login_&]:[font-size:12px] [.auth-stage_.account-login_&]:[color:var(--muted)]" href="/dashboard">Dashboard →</Link></EmptyState>;
    return <section className="chart-workspace [.chart-dialog_&]:[border-width:0] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [background:var(--surface)] overflow-hidden">
    <div className="chart-controls [.chart-dialog_&]:[padding:10px_0_16px] flex items-center [gap:15px] flex-wrap [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [padding:14px_22px] max-[900px]:[gap:10px] max-[700px]:[padding:12px]">
      <label className="grid gap-1 text-xs text-[var(--muted)]">Mã biểu đồ<select aria-label="Chọn mã biểu đồ" value={symbol} onChange={event => onSymbolChange(event.target.value)}>{!getStock(symbol) && symbol !== "NASDAQ:AAPL" && <option value={symbol}>{symbol}</option>}{stocks.map(item => <option key={item.symbol}>{item.symbol}</option>)}<option value="NASDAQ:AAPL">NASDAQ:AAPL · đối chiếu</option></select></label>
      <label className="grid gap-1 text-xs text-[var(--muted)]">Nguồn chart<select aria-label="Nguồn biểu đồ" value={source} onChange={event => {setSource(event.target.value);setTimeframe("D");}}><option value="tradingview">TradingView</option><option value="sample">Dữ liệu mẫu</option></select></label>
      <label className="grid gap-1 text-xs text-[var(--muted)]">Timeframe<select aria-label="Khung thời gian" value={timeframe} onChange={event => setTimeframe(event.target.value)}>{chartIntervals.filter(([id]) => source === "tradingview" || ["D", "W", "M"].includes(id)).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {source === "tradingview" && <label className="grid gap-1 text-xs text-[var(--muted)]">Indicator ban đầu<select aria-label="Bộ chỉ báo" value={preset} onChange={event => setPreset(event.target.value as IndicatorPreset)}>{Object.entries(indicatorPresets).map(([id, value]) => <option key={id} value={id}>{value.label}</option>)}</select></label>}
      <form className="flex flex-wrap items-end gap-2" onSubmit={event => {event.preventDefault();const next = parseTVSymbol(custom);if(next){setSymbolError("");onSymbolChange(next.full);}else setSymbolError("Nhập SÀN:MÃ, ví dụ HOSE:FPT hoặc HNX:SHS.");}}><label className="grid gap-1 text-xs text-[var(--muted)]">Tra mã khác<input aria-label="Mã TradingView" className="w-36 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--text)]" value={custom} onChange={event => setCustom(event.target.value)} placeholder="HOSE:FPT"/></label><button className="rounded border border-[var(--border)] px-3 py-2 text-sm" type="submit">Mở</button></form>
      {symbolError && <p role="alert" className="text-sm text-[var(--negative)]">{symbolError}</p>}
      <div className="chart-view-actions [margin-left:auto] flex flex-wrap [gap:8px] max-[700px]:[.chart-dialog_&]:[margin-left:0] max-[700px]:[.chart-dialog_&]:w-full">
        <Link className="button secondary [.auth-stage_.account-login_&]:w-full [.auth-stage_.account-login_&]:justify-center [.auth-stage_.account-login_&]:[min-height:46px] [.account-actions_&]:[white-space:normal] [.account-table_&]:[font-size:11px] inline-flex items-center justify-center [gap:9px] [font-size:14px] [font-weight:500] [border-width:1px] [border-style:solid] [border-color:transparent] [padding:10px_15px] [border-radius:4px] [min-height:42px] whitespace-nowrap [transition:background_0.18s,_transform_0.18s] [.button&]:[background:var(--surface)] [.button&]:[border-color:var(--border)] [.button&]:[color:var(--text)] [.button&:hover]:[background:var(--raised)] [.chart-controls_&]:[font-size:14px] [.chart-controls_&]:[padding:8px_12px] [.quant-panel.compact_.quant-panel-heading_&]:w-full max-[1100px]:[.quant-panel.compact_.quant-panel-heading_&]:[width:auto] max-[700px]:[.selected-actions_&]:[flex:1] max-[700px]:[min-height:42px] [.scan-intro-actions_&]:[min-height:52px] [.scan-intro-actions_&]:[padding:13px_20px] [.scan-intro-actions_&]:[font-size:16px] [.quant-chart-views_&]:[padding:8px_12px] [.quant-chart-views_&]:[font-size:14px] [.quant-chart-views_&[aria-pressed='true']]:[color:var(--accent)] [.quant-chart-views_&[aria-pressed='true']]:[border-color:var(--accent)] [.quant-chart-views_&[aria-pressed='true']]:[background:var(--accent-soft)] [.quant-model-toolbar_&]:[padding:8px_10px] [.quant-model-toolbar_&]:[font-size:14px] max-[700px]:[.scan-intro-actions_&]:justify-center max-[700px]:[.scan-intro-actions_&]:w-full" href={`/analysis?symbol=${encodeURIComponent(ticker)}`}>Mở Quant toàn màn hình ↗</Link>
        <button className="button secondary [.auth-stage_.account-login_&]:w-full [.auth-stage_.account-login_&]:justify-center [.auth-stage_.account-login_&]:[min-height:46px] [.account-actions_&]:[white-space:normal] [.account-table_&]:[font-size:11px] inline-flex items-center justify-center [gap:9px] [font-size:14px] [font-weight:500] [border-width:1px] [border-style:solid] [border-color:transparent] [padding:10px_15px] [border-radius:4px] [min-height:42px] whitespace-nowrap [transition:background_0.18s,_transform_0.18s] [.button&]:[background:var(--surface)] [.button&]:[border-color:var(--border)] [.button&]:[color:var(--text)] [.button&:hover]:[background:var(--raised)] [.chart-controls_&]:[font-size:14px] [.chart-controls_&]:[padding:8px_12px] [.quant-panel.compact_.quant-panel-heading_&]:w-full max-[1100px]:[.quant-panel.compact_.quant-panel-heading_&]:[width:auto] max-[700px]:[.selected-actions_&]:[flex:1] max-[700px]:[min-height:42px] [.scan-intro-actions_&]:[min-height:52px] [.scan-intro-actions_&]:[padding:13px_20px] [.scan-intro-actions_&]:[font-size:16px] [.quant-chart-views_&]:[padding:8px_12px] [.quant-chart-views_&]:[font-size:14px] [.quant-chart-views_&[aria-pressed='true']]:[color:var(--accent)] [.quant-chart-views_&[aria-pressed='true']]:[border-color:var(--accent)] [.quant-chart-views_&[aria-pressed='true']]:[background:var(--accent-soft)] [.quant-model-toolbar_&]:[padding:8px_10px] [.quant-model-toolbar_&]:[font-size:14px] max-[700px]:[.scan-intro-actions_&]:justify-center max-[700px]:[.scan-intro-actions_&]:w-full" aria-pressed={sidebar} onClick={() => setSidebar(!sidebar)}>{sidebar ? <PanelRightClose size={17}/> : <PanelRightOpen size={17}/>}{sidebar ? "Thu phân tích" : "Mở phân tích bên chart"}</button>
      </div>
    </div>
    <div className={tw(`chart-split ${sidebar ? "with-quant" : ""}`)}>
      <div className="chart-main min-w-0">
        <div className="chart-stock-heading flex items-center justify-between [gap:14px] [padding:24px_24px_8px] [&_h2]:[font-size:26px] [&_h2]:[font-weight:600] [&_h2]:[margin:0] [&_h2]:flex [&_h2]:items-center [&_h2]:[gap:12px] [&_h2_span]:[font-size:15px] [&_h2_span]:[font-weight:400] [&_h2_span]:[color:var(--muted)] [&_p]:[font-size:14px] [&_p]:[color:var(--muted)] [&_p]:[margin:6px_0_0] [&_>_div:last-child]:flex [&_>_div:last-child]:[gap:14px] [&_>_div:last-child]:items-center [&_strong]:[font-size:28px] [&_strong]:[font-weight:500] max-[900px]:items-start max-[900px]:[&_h2]:flex-wrap max-[700px]:[padding:20px_16px_8px] max-[700px]:flex-wrap max-[700px]:[&_>_div:last-child]:[margin-top:4px] max-[700px]:[&_h2]:[gap:8px]"><div><h2>{ticker}<span>{stock.name}</span></h2></div><span className="muted [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">{stock.exchange}</span></div>
        {source === "tradingview" ? <>
          <p className="px-6 py-3 text-xs leading-6 text-[var(--muted)]">Dùng thanh công cụ trong chart để thêm Indicators, đổi khung thời gian và vẽ. Khung intraday phụ thuộc quyền dữ liệu từng mã.</p>
          <TradingViewWidget kind="chart" config={chartConfig(qualified?.full || `${stock.exchange}:${ticker}`, timeframe, theme, preset)} title={`Biểu đồ ${ticker}`} fallbackUrl={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(qualified?.full || `${stock.exchange}:${ticker}`)}&interval=${timeframe}`}/>
        </> : <><p className="px-6 py-3 text-sm text-[var(--accent)]">Dữ liệu mô phỏng · Không phải giá thị trường hiện tại.</p><SampleChart symbol={ticker} interval={`1${timeframe}`}/></>}
      </div>
      {sidebar && <aside className="chart-quant [border-left-width:1px] [border-left-style:solid] [border-left-color:var(--border)] [padding:20px] min-w-0 [max-height:650px] overflow-y-auto max-[1100px]:[border-left-width:0] max-[1100px]:[border-top-width:1px] max-[1100px]:[border-top-style:solid] max-[1100px]:[border-top-color:var(--border)] max-[1100px]:[max-height:none] max-[700px]:[padding:16px]" aria-label={`Phân tích bên chart ${symbol}`}><QuantPanel key={ticker} symbol={ticker} compact/></aside>}
    </div>
  </section>;
}
