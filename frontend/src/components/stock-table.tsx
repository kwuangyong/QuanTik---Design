"use client";
import { tw } from "@/lib/tailwind";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownUp, ChartCandlestick, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { format, signed, tone, type Stock } from "@/lib/mock-data";
import { usePreferences } from "./preferences";
import TermHint from "./term-hint";
export function StockTable({ items, depth = false, statistics = false, foreign = false, onSelect }: {
    items: Stock[];
    depth?: boolean;
    statistics?: boolean;
    foreign?: boolean;
    onSelect?: (symbol: string) => void;
}) {
    const { watchlist, toggleWatch } = usePreferences();
    const [direction, setDirection] = useState(1);
    const [page, setPage] = useState(0);
    const itemKey = items.map((item) => item.symbol).join(",");
    useEffect(() => setPage(0), [itemKey, direction]);
    const sorted = [...items].sort((a, b) => direction * a.symbol.localeCompare(b.symbol));
    const currentPage = Math.min(page, Math.max(0, Math.ceil(items.length / 8) - 1));
    const levels = depth ? [2, 1, 0] : [0];
    const cell = (value: number | null, className = "muted", digits = 2) => <td className={tw(`number ${className}`)}>{format(value, digits)}</td>;
    return (<>
      <div className="table-scroll relative overflow-x-auto [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]" tabIndex={0} role="region" aria-label="Bảng cổ phiếu; cuộn ngang để xem đủ cột">
        <table className="stock-table price-board [min-width:730px] [&_th]:[font-size:14px] [&_th]:[padding:13px_14px] [&_td]:[height:65px] [&_td]:[padding:12px_14px] [&_tbody_td:first-child]:sticky [&_tbody_td:first-child]:[left:0] [&_tbody_td:first-child]:[z-index:2] [&_tbody_td:first-child]:[background:var(--surface)] [&_tbody_td:nth-child(2)]:sticky [&_tbody_td:nth-child(2)]:[left:38px] [&_tbody_td:nth-child(2)]:[z-index:2] [&_tbody_td:nth-child(2)]:[background:var(--surface)] [&_tbody_td:nth-child(2)]:[box-shadow:1px_0_var(--border)] [&_th[rowspan]]:[vertical-align:middle] w-full border-collapse [font-size:14px] [&_th]:text-right [&_th]:[color:var(--muted)] [&_th]:[font-weight:400] [&_th]:[background:color-mix(in_srgb,_var(--surface)_65%,_var(--background))] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:var(--border)] [&_th]:whitespace-nowrap [&_th_button]:inline-flex [&_th_button]:items-center [&_th_button]:[gap:6px] [&_th_button]:[background:none] [&_th_button]:[border-width:0] [&_th_button]:[padding:0] [&_th_button]:[font:inherit] [&_th_button]:[color:inherit] [&_th[aria-sort='ascending']]:[color:var(--accent)] [&_th[aria-sort='descending']]:[color:var(--accent)] [&_th:nth-child(2)]:text-left [&_td:nth-child(2)]:text-left [&_th:last-child]:text-left [&_td]:text-right [&_td]:[border-bottom-width:1px] [&_td]:[border-bottom-style:solid] [&_td]:[border-bottom-color:var(--border)] [&_td]:whitespace-nowrap [&_tr:last-child_td]:[border-width:0] [&_tbody_tr:hover]:[background:var(--raised)] [&_td:first-child]:[width:40px] [&_td:first-child]:[padding-left:16px] [&_td:first-child]:[padding-right:0] [&_th:first-child]:[width:40px] [&_th:first-child]:[padding-left:16px] [&_th:first-child]:[padding-right:0]">
          <thead>
            <tr className="board-groups [.price-board_&_th:first-child]:sticky [.price-board_&_th:first-child]:[left:0] [.price-board_&_th:first-child]:[z-index:2] [.price-board_&_th:first-child]:[background:var(--surface)] [.price-board_&_th:nth-child(2)]:sticky [.price-board_&_th:nth-child(2)]:[left:38px] [.price-board_&_th:nth-child(2)]:[z-index:2] [.price-board_&_th:nth-child(2)]:[background:var(--surface)] [.price-board_&_th:nth-child(2)]:[box-shadow:1px_0_var(--border)] [.price-board_&_th[colspan]]:text-center [.price-board_&_th[colspan]]:[border-left-width:1px] [.price-board_&_th[colspan]]:[border-left-style:solid] [.price-board_&_th[colspan]]:[border-left-color:var(--border)]">
              <th rowSpan={2}><span className="sr-only">Theo dõi</span></th>
              <th rowSpan={2} aria-sort={direction === 1 ? "ascending" : "descending"}><button onClick={() => setDirection(-direction)}>Mã <ArrowDownUp size={13}/></button></th>
              <th rowSpan={2}><TermHint id="ref">TC</TermHint></th><th rowSpan={2}><TermHint id="ceil">Trần</TermHint></th><th rowSpan={2}><TermHint id="floor">Sàn</TermHint></th>
              <th colSpan={levels.length} scope="colgroup"><TermHint id="bid">Dư mua</TermHint></th><th colSpan={3} scope="colgroup"><TermHint id="matched">Khớp lệnh</TermHint></th><th colSpan={levels.length} scope="colgroup"><TermHint id="ask">Dư bán</TermHint></th>
              <th rowSpan={2}>Tổng KL</th><th rowSpan={2}><TermHint id="liquidity">GTGD (triệu ₫)</TermHint></th>
              {statistics && <th colSpan={3} scope="colgroup">Thống kê</th>}
              {foreign && <th colSpan={3} scope="colgroup">Nước ngoài</th>}
              <th rowSpan={2}><TermHint id="quant_score">Quant</TermHint></th><th rowSpan={2}><span className="sr-only">Biểu đồ</span></th>
            </tr>
            <tr>
              {levels.map((level) => <SlotHeading key={`bid${level}`} level={level}/>)}
              <th>Giá</th><th>KL</th><th>%</th>
              {[...levels].reverse().map((level) => <SlotHeading key={`ask${level}`} level={level}/>)}
              {statistics && <><th>Mở</th><th>Cao</th><th>Thấp</th></>}
              {foreign && <><th>Mua</th><th>Bán</th><th>Room</th></>}
            </tr>
          </thead>
          <tbody>{sorted.slice(currentPage * 8, currentPage * 8 + 8).map((stock) => <tr key={stock.symbol}>
            <td><button className={tw(`star-button ${watchlist.includes(stock.symbol) ? "saved" : ""}`)} aria-label={`${watchlist.includes(stock.symbol) ? "Bỏ theo dõi" : "Theo dõi"} ${stock.symbol}`} aria-pressed={watchlist.includes(stock.symbol)} onClick={() => toggleWatch(stock.symbol)}><Star size={17} fill={watchlist.includes(stock.symbol) ? "currentColor" : "none"}/></button></td>
            <td className="stock-identity [.price-board_&]:[min-width:72px] [.price-board_&_>_span]:[font-size:12px] [min-width:125px] [&_>_span]:block [&_>_span]:[color:var(--muted)] [&_>_span]:[font-size:14px] [&_>_span]:[max-width:145px] [&_>_span]:overflow-hidden [&_>_span]:[text-overflow:ellipsis]">{onSelect ? <button className="symbol-link [background:none] [border-width:0] [font:600_16px_var(--font-mono),_monospace] [color:var(--text)] [padding:0] text-left [&:hover]:[color:var(--accent)]" title={stock.name} onClick={() => onSelect(stock.symbol)}>{stock.symbol}</button> : <Link className="symbol-link [background:none] [border-width:0] [font:600_16px_var(--font-mono),_monospace] [color:var(--text)] [padding:0] text-left [&:hover]:[color:var(--accent)]" href={`/charts?symbol=${stock.symbol}`} title={stock.name}>{stock.symbol}</Link>}<span>{stock.exchange}</span></td>
            {cell(stock.reference, "neutral")}{cell(stock.ceiling, "ceiling")}{cell(stock.floor, "floor")}
            {levels.map((level) => <QuoteCells key={`bid${level}`} quote={stock.bid[level]} reference={stock.reference}/>)}
            {cell(stock.price, tone(stock.change))}{cell(stock.matchedVolume, "muted", 0)}<td className={tw(`number ${tone(stock.change)}`)}>{signed(stock.change)}</td>
            {[...levels].reverse().map((level) => <QuoteCells key={`ask${level}`} quote={stock.ask[level]} reference={stock.reference}/>)}
            {cell(stock.volume, "muted", 0)}{cell(stock.value)}
            {statistics && <>{cell(stock.open)}{cell(stock.high)}{cell(stock.low)}</>}
            {foreign && <>{cell(stock.foreignBuy, "muted", 0)}{cell(stock.foreignSell, "muted", 0)}{cell(stock.foreignRoom, "muted", 0)}</>}
            <td><Link className="text-link number [.auth-stage_.account-login_&]:[font-size:12px] [.auth-stage_.account-login_&]:[color:var(--muted)] [font-family:var(--font-mono),_ui-monospace,_monospace] [font-variant-numeric:tabular-nums] [letter-spacing:-0.025em]" aria-label={`Phân tích ${stock.symbol}`} href={`/analysis?symbol=${stock.symbol}`}>{format(stock.quantScore, 0)}</Link></td>
            <td>{onSelect ? <button className="icon-button small inline-flex items-center justify-center [width:40px] [height:40px] [flex-shrink:0] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [background:transparent] [color:var(--muted)] [transition:background_0.18s,_color_0.18s] [&:hover]:[background:var(--raised)] [&:hover]:[color:var(--text)] [.icon-button&]:[border-width:0] [.icon-button&]:[width:32px] [.icon-button&]:[height:32px]" aria-label={`Biểu đồ ${stock.symbol}`} onClick={() => onSelect(stock.symbol)}><ChartCandlestick size={17}/></button> : <Link className="icon-button small inline-flex items-center justify-center [width:40px] [height:40px] [flex-shrink:0] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [background:transparent] [color:var(--muted)] [transition:background_0.18s,_color_0.18s] [&:hover]:[background:var(--raised)] [&:hover]:[color:var(--text)] [.icon-button&]:[border-width:0] [.icon-button&]:[width:32px] [.icon-button&]:[height:32px]" aria-label={`Biểu đồ ${stock.symbol}`} href={`/charts?symbol=${stock.symbol}`}><ChartCandlestick size={17}/></Link>}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {items.length > 8 && <div className="table-pagination flex items-center justify-between [padding:12px_20px] [border-top-width:1px] [border-top-style:solid] [border-top-color:var(--border)] [font-size:14px] [color:var(--muted)] [&_>_div]:flex [&_>_div]:[gap:7px]"><span>{currentPage * 8 + 1}–{Math.min(currentPage * 8 + 8, items.length)} / {items.length} mã</span><div><button className="icon-button small inline-flex items-center justify-center [width:40px] [height:40px] [flex-shrink:0] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [background:transparent] [color:var(--muted)] [transition:background_0.18s,_color_0.18s] [&:hover]:[background:var(--raised)] [&:hover]:[color:var(--text)] [.icon-button&]:[border-width:0] [.icon-button&]:[width:32px] [.icon-button&]:[height:32px]" disabled={currentPage === 0} aria-label="Trang trước" onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18}/></button><button className="icon-button small inline-flex items-center justify-center [width:40px] [height:40px] [flex-shrink:0] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [background:transparent] [color:var(--muted)] [transition:background_0.18s,_color_0.18s] [&:hover]:[background:var(--raised)] [&:hover]:[color:var(--text)] [.icon-button&]:[border-width:0] [.icon-button&]:[width:32px] [.icon-button&]:[height:32px]" disabled={(currentPage + 1) * 8 >= items.length} aria-label="Trang sau" onClick={() => setPage(currentPage + 1)}><ChevronRight size={18}/></button></div></div>}
    </>);
}
function SlotHeading({ level }: {
    level: number;
}) {
    return <th>Giá {level + 1} / KL {level + 1}</th>;
}
function QuoteCells({ quote, reference }: {
    quote: Stock["bid"][number];
    reference: number | null;
}) {
    const color = quote?.price == null || reference === null ? "muted" : quote.price > reference ? "positive" : quote.price < reference ? "negative" : "neutral";
    return <td className="order-quote [.price-board_&_>_span]:block [.price-board_&_>_span]:[line-height:1.5]"><span className={tw(`number ${color}`)}>{quote?.priceLabel ?? format(quote?.price ?? null)}</span><span className="number muted [font-family:var(--font-mono),_ui-monospace,_monospace] [font-variant-numeric:tabular-nums] [letter-spacing:-0.025em] [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">{format(quote?.volume ?? null, 0)}</span></td>;
}
