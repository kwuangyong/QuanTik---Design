"use client";
import { tw } from "@/lib/tailwind";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { sectors, format, signed, tone } from "@/lib/mock-data";
import { useAgrPriceboard } from "@/lib/use-agr-priceboard";
import { PageHeading, Panel, EmptyState } from "./ui";
import { StockTable } from "./stock-table";
import { usePreferences } from "./preferences";
import { PurchaseResume } from "./account/purchase-resume";
export function Dashboard() {
    const { items: stocks, status, indices, indexStatus } = useAgrPriceboard();
    const { watchlist } = usePreferences();
    const [tab, setTab] = useState("all");
    const [query, setQuery] = useState("");
    const [sector, setSector] = useState("all");
    const [exchange, setExchange] = useState("all");
    const [depth, setDepth] = useState(true);
    const [statistics, setStatistics] = useState(false);
    const [foreign, setForeign] = useState(false);
    const items = stocks.filter((stock) => (tab !== "watch" || watchlist.includes(stock.symbol)) &&
        (sector === "all" || stock.sector === sector) &&
        (exchange === "all" || stock.exchange === exchange) &&
        `${stock.symbol} ${stock.name}`.toUpperCase().includes(query.toUpperCase()));
    return (<><PurchaseResume/>
      <PageHeading title="Dashboard"/>
      <p aria-live="polite" className="text-sm text-[var(--muted)] mb-3">{indexStatus}</p>
      <div className="index-grid grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] [gap:16px] [margin-bottom:26px] max-[900px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[700px]:[gap:12px] max-[700px]:[margin-bottom:20px]">
        {indices.map((index) => (<article className="index-card [padding:20px_22px_13px] [border-width:1px] [border-style:solid] [border-color:var(--border)] [background:var(--surface)] [border-radius:4px] [&_>_div:first-child]:flex [&_>_div:first-child]:items-center [&_>_div:first-child]:justify-between [&_>_div:first-child]:[gap:8px] [&_>_div:first-child]:[font-size:14px] [&_>_div:first-child]:[font-weight:500] [&_strong]:block [&_strong]:[font-size:29px] [&_strong]:[font-weight:500] [&_strong]:[margin-top:11px] [&_strong]:[line-height:1.3] max-[1250px]:[padding:17px_16px_10px] max-[1250px]:[&_strong]:[font-size:25px] max-[900px]:[&_strong]:[font-size:29px] max-[700px]:[padding:16px_14px_10px] max-[700px]:[&_strong]:[font-size:26px] max-[700px]:[&_>_div:first-child]:flex-wrap max-[700px]:[&_>_div:first-child]:[gap:4px]" key={index.name}>
            <div><span>{index.name}</span><span className={tw(`number ${tone(index.change)}`)}>{signed(index.change)}</span></div>
            <strong className="number [font-family:var(--font-mono),_ui-monospace,_monospace] [font-variant-numeric:tabular-nums] [letter-spacing:-0.025em]">{format(index.value)}</strong>
          </article>))}
      </div>
      <div className="dashboard-stack grid [gap:24px] min-w-0">
        <Panel title="Bảng điện" action={<span role="status" className="count-label [font-size:14px] [color:var(--muted)] text-right">{status} · {items.length} mã</span>}>
          <div className="table-toolbar flex justify-between items-center [gap:14px] [padding:16px_20px] flex-wrap max-[1250px]:[flex-wrap:nowrap] max-[900px]:flex-wrap max-[700px]:[padding:14px]">
            <div className="segmented inline-flex items-center [gap:4px] [flex-shrink:0] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:[gap:8px] [&_button]:[border-width:0] [&_button]:[border-radius:4px] [&_button]:[padding:8px_12px] [&_button]:[background:none] [&_button]:[color:var(--muted)] [&_button]:[font-size:14px] [&_button]:[font-weight:500] [&_button]:[min-height:38px] [&_button]:whitespace-nowrap [&_button:hover]:[background:var(--raised)] [&_span]:[font-size:13px] [&_span]:[opacity:0.9]" role="group" aria-label="Danh sách cổ phiếu">
              <button className={tw(tab === "all" ? "active" : "")} aria-pressed={tab === "all"} onClick={() => setTab("all")}>Tất cả</button>
              <button className={tw(tab === "watch" ? "active" : "")} aria-pressed={tab === "watch"} onClick={() => setTab("watch")}>Theo dõi <span>{watchlist.length}</span></button>
            </div>
            <div className="table-controls max-[900px]:flex-wrap min-w-0 flex [gap:10px] items-center max-[1250px]:[flex:1] max-[1250px]:justify-end max-[900px]:[flex-basis:100%] max-[900px]:justify-between max-[700px]:[gap:8px] max-[700px]:[&_select]:[max-width:155px] max-[700px]:[&_select]:[padding-left:8px]">
              <label className="inline-search max-[900px]:[.table-controls_&]:[flex-basis:100%] min-w-0 flex items-center [gap:8px] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [background:var(--background)] [padding:8px_10px] [color:var(--muted)] [&_input]:[border-width:0] [&_input]:[outline:none] [&_input]:[background:none] [&_input]:[color:var(--text)] [&_input]:[width:135px] [&_input]:min-w-0 [&_input]:[font-size:14px] [&:focus-within]:[outline:2px_solid_var(--accent)] [&:focus-within]:[outline-offset:2px] max-[900px]:[flex:1] max-[900px]:[&_input]:w-full max-[700px]:[padding:9px_8px] max-[700px]:[&_input]:[font-size:14px]">
                <Search size={16} aria-hidden="true"/>
                <span className="sr-only">Tìm trong danh sách cổ phiếu</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã hoặc tên"/>
              </label>
              <label><span className="sr-only">Lọc sàn</span><select value={exchange} onChange={(event) => setExchange(event.target.value)}><option value="all">Tất cả sàn</option>{[...new Set(stocks.map((stock) => stock.exchange))].map((name) => <option key={name}>{name}</option>)}</select></label>
              <label><span className="sr-only">Lọc nhóm ngành</span><select value={sector} onChange={(event) => setSector(event.target.value)}><option value="all">Tất cả ngành</option>{[...new Set([...sectors.map((item) => item.name), ...stocks.map((stock) => stock.sector)])].map((name) => <option key={name}>{name}</option>)}</select></label>
            </div>
          </div>
          <div className="board-options flex flex-wrap [gap:20px] [padding:0_20px_16px] [color:var(--muted)] [font-size:14px] [&_label]:inline-flex [&_label]:items-center [&_label]:[gap:8px] [&_label]:cursor-pointer [&_input]:[accent-color:var(--accent)] [&_input]:[width:16px] [&_input]:[height:16px]" role="group" aria-label="Cột bảng điện">
            <label><input type="checkbox" checked={depth} onChange={(event) => setDepth(event.target.checked)}/>Ba mức giá</label>
            <label><input type="checkbox" checked={statistics} onChange={(event) => setStatistics(event.target.checked)}/>Thống kê</label>
            <label><input type="checkbox" checked={foreign} onChange={(event) => setForeign(event.target.checked)}/>Nước ngoài</label>
          </div>
          {sector !== "all" && <div className="active-filter inline-flex items-center [gap:10px] [margin:0_20px_14px] [color:var(--accent)] [background:var(--accent-soft)] [padding:5px_10px] [font-size:14px] [border-radius:4px] [&_button]:flex [&_button]:[border-width:0] [&_button]:[background:none]">{sector}<button aria-label="Xóa lọc ngành" onClick={() => setSector("all")}><X size={14}/></button></div>}
          <p className="text-sm text-[var(--muted)] px-5 pb-3">Nguồn: <a href="https://trading.agr.vn/priceboard" target="_blank" rel="noreferrer" className="underline">AGR</a> · Giá: nghìn ₫ · KL: cổ phiếu · GTGD: triệu ₫</p>
          {items.length ? <StockTable items={items} depth={depth} statistics={statistics} foreign={foreign}/> : <EmptyState title={stocks.length ? "Chưa có mã phù hợp" : "Đang chờ dữ liệu bảng điện AGR"}/>}
        </Panel>
        <Panel title="Dòng tiền theo ngành" className="sector-panel" action={<span className="count-label [font-size:14px] [color:var(--muted)] whitespace-nowrap">Số liệu tham khảo</span>}>
          <div className="table-scroll relative overflow-x-auto [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]" tabIndex={0} role="region" aria-label="Bảng nhóm ngành; cuộn ngang để xem đủ cột">
            <table className="sector-table w-full border-collapse [font-size:14px] [min-width:900px] [&_th]:[color:var(--muted)] [&_th]:[font-weight:400] [&_th]:[padding:13px_18px] [&_th]:[background:var(--background)] [&_th]:text-right [&_th]:whitespace-nowrap [&_td]:[padding:15px_18px] [&_td]:text-right [&_td]:[border-top-width:1px] [&_td]:[border-top-style:solid] [&_td]:[border-top-color:var(--border)] [&_td]:whitespace-nowrap [&_th:first-child]:text-left [&_td:first-child]:text-left">
              <thead><tr><th>Nhóm ngành</th><th>Số mã</th><th>Tăng / Giảm / Đứng</th><th>Thay đổi TB</th><th>GTGD (tỷ ₫)</th><th>Tỷ trọng GTGD</th><th>Độ phủ GTGD</th><th>Điểm TB</th></tr></thead>
              <tbody>{sectors.map((item) => <tr key={item.name} className={tw(sector === item.name ? "selected" : "")}>
                <td><button className="sector-name [border-width:0] [background:none] [padding:0] text-left [font:inherit] [color:var(--text)] [&:hover]:[color:var(--accent)] [&[aria-pressed='true']]:[color:var(--accent)]" aria-pressed={sector === item.name} onClick={() => setSector(sector === item.name ? "all" : item.name)}>{item.name}</button></td>
                <td className="number muted [font-family:var(--font-mono),_ui-monospace,_monospace] [font-variant-numeric:tabular-nums] [letter-spacing:-0.025em] [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">{format(item.count, 0)}</td>
                <td className="number muted [font-family:var(--font-mono),_ui-monospace,_monospace] [font-variant-numeric:tabular-nums] [letter-spacing:-0.025em] [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">{format(item.up, 0)} / {format(item.down, 0)} / {format(item.flat, 0)}</td>
                <td className={tw(`number ${tone(item.change)}`)}>{signed(item.change)}</td>
                <td className="number muted [font-family:var(--font-mono),_ui-monospace,_monospace] [font-variant-numeric:tabular-nums] [letter-spacing:-0.025em] [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">{format(item.value)}</td>
                <td className="number muted [font-family:var(--font-mono),_ui-monospace,_monospace] [font-variant-numeric:tabular-nums] [letter-spacing:-0.025em] [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">{format(item.share)}%</td>
                <td className="number muted [font-family:var(--font-mono),_ui-monospace,_monospace] [font-variant-numeric:tabular-nums] [letter-spacing:-0.025em] [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">{item.covered}/{item.count}</td>
                <td className="number muted [font-family:var(--font-mono),_ui-monospace,_monospace] [font-variant-numeric:tabular-nums] [letter-spacing:-0.025em] [.terminal_&]:[color:var(--muted)] [.panel-heading_>_&]:[font-size:14px] [.panel-heading_>_&]:[color:var(--muted)] [.panel-heading_>_&]:whitespace-nowrap [.analysis-price_>_&]:[font-size:14px]">{format(item.score)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>);
}
