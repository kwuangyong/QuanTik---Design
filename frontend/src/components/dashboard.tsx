"use client";
import { tw } from "@/lib/tailwind";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { sectors, stocks } from "@/lib/mock-data";
import { PageHeading, Panel, EmptyState, Modal } from "./ui";
import { ChartSurface } from "./chart-workspace";
import { StockTable } from "./stock-table";
import { usePreferences } from "./preferences";
export function Dashboard() {
    const { watchlist } = usePreferences();
    const [tab, setTab] = useState("all");
    const [query, setQuery] = useState("");
    const [sector, setSector] = useState("all");
    const [exchange, setExchange] = useState("all");
    const [depth, setDepth] = useState(true);
    const [selected, setSelected] = useState<string | null>(null);
    const [statistics, setStatistics] = useState(true);
    const [foreign, setForeign] = useState(true);
    const items = stocks.filter((stock) => (tab !== "watch" || watchlist.includes(stock.symbol)) &&
        (sector === "all" || stock.sector === sector) &&
        (exchange === "all" || stock.exchange === exchange) &&
        `${stock.symbol} ${stock.name}`.toUpperCase().includes(query.toUpperCase()));
    return (<div className="stock-dashboard font-mono [&_button]:font-mono [&_input]:font-mono [&_select]:font-mono">
      <PageHeading title="Dashboard"/>
      <div className="dashboard-stack grid [gap:24px] min-w-0">
        <Panel title="Bảng điện" action={<span className="count-label [font-size:14px] [color:var(--muted)] whitespace-nowrap">Bản xem trước · {items.length} mã</span>}>
          <div className="table-toolbar flex justify-between items-center [gap:14px] [padding:16px_20px] flex-wrap max-[1250px]:[flex-wrap:nowrap] max-[900px]:flex-wrap max-[700px]:[padding:14px]">
            <div className="segmented inline-flex items-center [gap:4px] [flex-shrink:0] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:[gap:8px] [&_button]:[border-width:0] [&_button]:[border-radius:4px] [&_button]:[padding:8px_12px] [&_button]:[background:none] [&_button]:[color:var(--muted)] [&_button]:[font-size:14px] [&_button]:[font-weight:500] [&_button]:[min-height:38px] [&_button]:whitespace-nowrap [&_button:hover]:[background:var(--raised)] [&_span]:[font-size:13px] [&_span]:[opacity:0.9]" role="group" aria-label="Danh sách cổ phiếu">
              <button className={tw(tab === "all" ? "active" : "")} aria-pressed={tab === "all"} onClick={() => setTab("all")}>Tất cả</button>
              <button className={tw(tab === "watch" ? "active" : "")} aria-pressed={tab === "watch"} onClick={() => setTab("watch")}>Theo dõi <span>{watchlist.length}</span></button>
            </div>
            <div className="table-controls max-[900px]:flex-wrap min-w-0 flex [gap:10px] items-center max-[1250px]:[flex:1] max-[1250px]:justify-end max-[900px]:[flex-basis:100%] max-[900px]:justify-between max-[700px]:[gap:8px] max-[700px]:[&_select]:[max-width:155px] max-[700px]:[&_select]:[padding-left:8px]">
              <label className="inline-search max-[900px]:[.table-controls_&]:[flex-basis:100%] min-w-0 flex items-center [gap:8px] [border-width:1px] [border-style:solid] [border-color:var(--border)] [border-radius:4px] [background:var(--background)] [padding:8px_10px] [color:var(--muted)] [&_input]:[border-width:0] [&_input]:[outline:none] [&_input]:[background:none] [&_input]:[color:var(--text)] [&_input]:[width:135px] [&_input]:min-w-0 [&_input]:[font-size:14px] [&:focus-within]:[outline:2px_solid_var(--accent)] [&:focus-within]:[outline-offset:2px] max-[900px]:[flex:1] max-[900px]:[&_input]:w-full max-[700px]:[padding:9px_8px] max-[700px]:[&_input]:[font-size:14px]">
                <Search size={16} aria-hidden="true"/>
                <span className="sr-only">Tìm trong danh sách cổ phiếu</span>
                <input aria-label="Tìm trong danh sách cổ phiếu" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã hoặc tên"/>
              </label>
              <label><span className="sr-only">Lọc sàn</span><select aria-label="Lọc sàn" value={exchange} onChange={(event) => setExchange(event.target.value)}><option value="all">Tất cả sàn</option>{[...new Set(stocks.map((stock) => stock.exchange))].map((name) => <option key={name}>{name}</option>)}</select></label>
              <label><span className="sr-only">Lọc nhóm ngành</span><select aria-label="Lọc nhóm ngành" value={sector} onChange={(event) => setSector(event.target.value)}><option value="all">Tất cả ngành</option>{sectors.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
            </div>
          </div>
          <div className="board-options flex flex-wrap [gap:20px] [padding:0_20px_16px] [color:var(--muted)] [font-size:14px] [&_label]:inline-flex [&_label]:items-center [&_label]:[gap:8px] [&_label]:cursor-pointer [&_input]:[accent-color:var(--accent)] [&_input]:[width:16px] [&_input]:[height:16px]" role="group" aria-label="Cột bảng điện">
            <label><input type="checkbox" checked={depth} onChange={(event) => setDepth(event.target.checked)}/>Ba mức giá</label>
            <label><input type="checkbox" checked={statistics} onChange={(event) => setStatistics(event.target.checked)}/>Thống kê</label>
            <label><input type="checkbox" checked={foreign} onChange={(event) => setForeign(event.target.checked)}/>Nước ngoài</label>
          </div>
          {sector !== "all" && <div className="active-filter inline-flex items-center [gap:10px] [margin:0_20px_14px] [color:var(--accent)] [background:var(--accent-soft)] [padding:5px_10px] [font-size:14px] [border-radius:4px] [&_button]:flex [&_button]:[border-width:0] [&_button]:[background:none]">{sector}<button aria-label="Xóa lọc ngành" onClick={() => setSector("all")}><X size={14}/></button></div>}
          {items.length ? <StockTable pageSize={50} items={items} depth={depth} statistics={statistics} foreign={foreign} onSelect={setSelected}/> : <EmptyState title="Chưa có mã phù hợp"/>}
        </Panel>
      </div>
      {selected && <Modal title={`Biểu đồ ${selected}`} onClose={() => setSelected(null)} className="chart-dialog"><ChartSurface key={selected} symbol={selected}/></Modal>}
    </div>);
}
