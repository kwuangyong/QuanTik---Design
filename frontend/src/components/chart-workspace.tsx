"use client";
import { tw } from "@/lib/tailwind";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { stocks, getStock } from "@/lib/mock-data";
import { PageHeading, EmptyState } from "./ui";
import { QuantPanel } from "./quant-panel";
export function ChartWorkspace() {
    const router = useRouter();
    const query = useSearchParams();
    const symbol = (query.get("symbol") ?? "FPT").toUpperCase();
    return <><PageHeading title="Biểu đồ"/><ChartSurface key={symbol} symbol={symbol} exchangeHint={query.get("exchange")} onSymbolChange={(next) => router.replace(`/charts?symbol=${next}`)}/></>;
}
export function ChartSurface({ symbol, exchangeHint, onSymbolChange }: {
    symbol: string;
    exchangeHint?: string | null;
    onSymbolChange: (symbol: string) => void;
}) {
    const stock = getStock(symbol) || (/^[A-Z0-9]{2,16}$/.test(symbol)
        ? { symbol, name: symbol, exchange: exchangeHint && ["HOSE", "HNX", "UPCOM"].includes(exchangeHint) ? exchangeHint : "" } : undefined);
    const [timeframe, setTimeframe] = useState("1D");
    const [sidebar, setSidebar] = useState(true);
    const chartUrl = `https://chart.vps.com.vn/tv/?${new URLSearchParams({ symbol, allowFullscreen: "true", resolution: timeframe, lang: "vi" })}`;
    if (!stock)
        return <EmptyState title="Chọn mã cổ phiếu"><Link className="text-link [.auth-stage_.account-login_&]:[font-size:12px] [.auth-stage_.account-login_&]:[color:var(--muted)]" href="/dashboard">Dashboard →</Link></EmptyState>;
    return <section className="chart-workspace [.chart-dialog_&]:[border-width:0] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [background:var(--surface)] overflow-hidden">
    <div className="chart-controls [.chart-dialog_&]:[padding:10px_0_16px] flex items-center [gap:15px] flex-wrap [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--border)] [padding:14px_22px] max-[900px]:[gap:10px] max-[700px]:[padding:12px]">
      <label><span className="sr-only">Chọn mã biểu đồ</span><select aria-label="Chọn mã biểu đồ" className="symbol-select" value={symbol} onChange={(event) => onSymbolChange(event.target.value)}>{!getStock(symbol) && <option value={symbol}>{symbol}</option>}{stocks.map((item) => <option key={item.symbol}>{item.symbol}</option>)}</select></label>
      <label><span className="sr-only">Khung thời gian</span><select aria-label="Khung thời gian" value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>{["1D", "1W", "1M"].map((interval) => <option key={interval}>{interval}</option>)}</select></label>
      <div className="chart-view-actions [margin-left:auto] flex flex-wrap [gap:8px] max-[700px]:[.chart-dialog_&]:[margin-left:0] max-[700px]:[.chart-dialog_&]:w-full">
        <Link className="button secondary [.auth-stage_.account-login_&]:w-full [.auth-stage_.account-login_&]:justify-center [.auth-stage_.account-login_&]:[min-height:46px] [.account-actions_&]:[white-space:normal] [.account-table_&]:[font-size:11px] inline-flex items-center justify-center [gap:9px] [font-size:14px] [font-weight:500] [border-width:1px] [border-style:solid] [border-color:transparent] [padding:10px_15px] [border-radius:4px] [min-height:42px] whitespace-nowrap [transition:background_0.18s,_transform_0.18s] [.button&]:[background:var(--surface)] [.button&]:[border-color:var(--border)] [.button&]:[color:var(--text)] [.button&:hover]:[background:var(--raised)] [.chart-controls_&]:[font-size:14px] [.chart-controls_&]:[padding:8px_12px] [.quant-panel.compact_.quant-panel-heading_&]:w-full max-[1100px]:[.quant-panel.compact_.quant-panel-heading_&]:[width:auto] max-[700px]:[.selected-actions_&]:[flex:1] max-[700px]:[min-height:42px] [.scan-intro-actions_&]:[min-height:52px] [.scan-intro-actions_&]:[padding:13px_20px] [.scan-intro-actions_&]:[font-size:16px] [.quant-chart-views_&]:[padding:8px_12px] [.quant-chart-views_&]:[font-size:14px] [.quant-chart-views_&[aria-pressed='true']]:[color:var(--accent)] [.quant-chart-views_&[aria-pressed='true']]:[border-color:var(--accent)] [.quant-chart-views_&[aria-pressed='true']]:[background:var(--accent-soft)] [.quant-model-toolbar_&]:[padding:8px_10px] [.quant-model-toolbar_&]:[font-size:14px] max-[700px]:[.scan-intro-actions_&]:justify-center max-[700px]:[.scan-intro-actions_&]:w-full" href={`/analysis?symbol=${symbol}`}>Mở Quant toàn màn hình ↗</Link>
        <button className="button secondary [.auth-stage_.account-login_&]:w-full [.auth-stage_.account-login_&]:justify-center [.auth-stage_.account-login_&]:[min-height:46px] [.account-actions_&]:[white-space:normal] [.account-table_&]:[font-size:11px] inline-flex items-center justify-center [gap:9px] [font-size:14px] [font-weight:500] [border-width:1px] [border-style:solid] [border-color:transparent] [padding:10px_15px] [border-radius:4px] [min-height:42px] whitespace-nowrap [transition:background_0.18s,_transform_0.18s] [.button&]:[background:var(--surface)] [.button&]:[border-color:var(--border)] [.button&]:[color:var(--text)] [.button&:hover]:[background:var(--raised)] [.chart-controls_&]:[font-size:14px] [.chart-controls_&]:[padding:8px_12px] [.quant-panel.compact_.quant-panel-heading_&]:w-full max-[1100px]:[.quant-panel.compact_.quant-panel-heading_&]:[width:auto] max-[700px]:[.selected-actions_&]:[flex:1] max-[700px]:[min-height:42px] [.scan-intro-actions_&]:[min-height:52px] [.scan-intro-actions_&]:[padding:13px_20px] [.scan-intro-actions_&]:[font-size:16px] [.quant-chart-views_&]:[padding:8px_12px] [.quant-chart-views_&]:[font-size:14px] [.quant-chart-views_&[aria-pressed='true']]:[color:var(--accent)] [.quant-chart-views_&[aria-pressed='true']]:[border-color:var(--accent)] [.quant-chart-views_&[aria-pressed='true']]:[background:var(--accent-soft)] [.quant-model-toolbar_&]:[padding:8px_10px] [.quant-model-toolbar_&]:[font-size:14px] max-[700px]:[.scan-intro-actions_&]:justify-center max-[700px]:[.scan-intro-actions_&]:w-full" aria-pressed={sidebar} onClick={() => setSidebar(!sidebar)}>{sidebar ? <PanelRightClose size={17}/> : <PanelRightOpen size={17}/>}{sidebar ? "Thu phân tích" : "Mở phân tích bên chart"}</button>
      </div>
    </div>
    <div className={tw(`chart-split ${sidebar ? "with-quant" : ""}`)}>
      <div className="chart-main min-w-0">
        <div className="chart-stock-heading flex items-center justify-between [gap:14px] [padding:24px_24px_8px] [&_h2]:[font-size:26px] [&_h2]:[font-weight:600] [&_h2]:[margin:0] [&_h2]:flex [&_h2]:items-center [&_h2]:[gap:12px] [&_h2_span]:[font-size:15px] [&_h2_span]:[font-weight:400] [&_h2_span]:[color:var(--muted)] [&_p]:[font-size:14px] [&_p]:[color:var(--muted)] [&_p]:[margin:6px_0_0] [&_>_div:last-child]:flex [&_>_div:last-child]:[gap:14px] [&_>_div:last-child]:items-center [&_strong]:[font-size:28px] [&_strong]:[font-weight:500] max-[900px]:items-start max-[900px]:[&_h2]:flex-wrap max-[700px]:[padding:20px_16px_8px] max-[700px]:flex-wrap max-[700px]:[&_>_div:last-child]:[margin-top:4px] max-[700px]:[&_h2]:[gap:8px]"><div><h2>{symbol}<span>{stock.name}</span></h2></div><span className="muted [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">{stock.exchange}</span></div>
        <iframe key={chartUrl} title={`Biểu đồ ${symbol}`} src={chartUrl} allow="fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="vps-chart block w-full h-[560px] border-0 max-[700px]:h-[440px]"/>
        <p className="px-6 py-3 text-sm"><a className="text-[var(--accent)] underline" href={chartUrl} target="_blank" rel="noopener noreferrer">Mở biểu đồ ↗</a></p>
      </div>
      {sidebar && <aside className="chart-quant [border-left-width:1px] [border-left-style:solid] [border-left-color:var(--border)] [padding:20px] min-w-0 [max-height:650px] overflow-y-auto max-[1100px]:[border-left-width:0] max-[1100px]:[border-top-width:1px] max-[1100px]:[border-top-style:solid] max-[1100px]:[border-top-color:var(--border)] max-[1100px]:[max-height:none] max-[700px]:[padding:16px]" aria-label={`Phân tích bên chart ${symbol}`}><QuantPanel key={symbol} symbol={symbol} compact/></aside>}
    </div>
  </section>;
}
