"use client";
import Link from "next/link";
import { useState } from "react";
import { sectors, stocks, format, signed, tone, getDemoCandles } from "@/lib/mock-data";
import { PageHeading, EmptyState, Modal } from "./ui";
import { ChartSurface } from "./chart-workspace";
import { StockTable } from "./stock-table";
import { usePreferences } from "./preferences";
import { PurchaseResume } from "./account/purchase-resume";

function Spark({ symbol }: { symbol: string }) {
  const values = getDemoCandles(symbol, "1D").slice(-30).map(bar => bar.close);
  if (values.length < 2) return <span className="website-muted">Chưa có nến mẫu</span>;
  const min = Math.min(...values), max = Math.max(...values);
  return <svg viewBox="0 0 160 50" role="img" aria-label={`Xu hướng mẫu ${symbol}`}><polyline points={values.map((value, i) => `${i / (values.length - 1) * 160},${46 - (value - min) / (max - min || 1) * 42}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
export function Dashboard({ watchOnly = false }: { watchOnly?: boolean }) {
  const { watchlist, toggleWatch } = usePreferences();
  const [tab, setTab] = useState(watchOnly ? "watch" : "all"), [query, setQuery] = useState("");
  const [sector, setSector] = useState("all"), [exchange, setExchange] = useState("all");
  const [depth, setDepth] = useState(true), [statistics, setStatistics] = useState(true), [foreign, setForeign] = useState(true), [dense, setDense] = useState(true);
  const [selected, setSelected] = useState<string | null>(null), [focused, setFocused] = useState("FPT");
  const [mode, setMode] = useState("board");
  const items = stocks.filter(stock => (tab !== "watch" || watchlist.includes(stock.symbol)) && (sector === "all" || stock.sector === sector) && (exchange === "all" || stock.exchange === exchange) && `${stock.symbol} ${stock.name}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
  const current = items.find(stock => stock.symbol === focused) || items[0];
  const changes = items.filter(stock => stock.change !== null), rising = changes.filter(stock => stock.change! > 0).length, falling = changes.filter(stock => stock.change! < 0).length;
  const leaders = items.filter(stock => stock.quantScore !== null).sort((a, b) => b.quantScore! - a.quantScore!).slice(0, 5);
  const quantHref = (symbol: string) => `/analysis?symbol=${encodeURIComponent(symbol)}`;
  return <div className={`website-market ${dense ? "is-dense" : ""}`}><PurchaseResume/>
    <PageHeading title={watchOnly ? "Theo dõi" : "Toàn cảnh thị trường"} description={watchOnly ? "Tập trung vào những doanh nghiệp bạn quan tâm." : "Theo dõi cổ phiếu và nhóm ngành."}/>
    <div className="website-market-strip">
      <article><span>Mã trong bộ lọc</span><strong>{items.length}</strong><small>{exchange === "all" ? "Tất cả sàn" : exchange} · {sector === "all" ? "Tất cả ngành" : sector}</small></article>
      <article><span>Cổ phiếu tăng</span><strong className="website-up">{rising}</strong><small>{changes.length ? Math.round(rising / changes.length * 100) : 0}% số mã có giá</small></article>
      <article><span>Cổ phiếu giảm</span><strong className="website-down">{falling}</strong><small>{changes.length - rising - falling} mã đứng giá</small></article>
      <article><span>Điểm Quant cao nhất</span><strong className="website-accent">{leaders[0]?.quantScore ?? "—"}<small> /100</small></strong><small>{leaders[0]?.symbol ?? "—"}</small></article>
    </div>
    <p className="website-badge website-data-label">Dữ liệu minh họa · Snapshot mẫu</p>
    <div className="website-market-filters"><label>Sàn <select aria-label="Lọc sàn" value={exchange} onChange={event => setExchange(event.target.value)}><option value="all">Tất cả sàn</option>{[...new Set(stocks.map(stock => stock.exchange))].map(name => <option key={name}>{name}</option>)}</select></label><label>Ngành <select aria-label="Lọc nhóm ngành" value={sector} onChange={event => setSector(event.target.value)}><option value="all">Tất cả ngành</option>{sectors.map(item => <option key={item.name}>{item.name}</option>)}</select></label><label className="website-market-search"><span className="sr-only">Tìm trong danh sách cổ phiếu</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã hoặc tên"/></label><button className="website-button" onClick={() => { setExchange("all"); setSector("all"); setQuery(""); }}>Xóa lọc</button></div>
    <div className="website-tabs" role="group" aria-label="Chế độ xem thị trường">{[["overview", "Tổng quan"], ["board", "Bảng giá"], ["sectors", "Nhóm ngành"]].map(([id, label]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}</div>
    <div className="dashboard-stack website-dashboard-stack">
      <section className="website-window">
        <div className="website-window-title"><h2>{mode === "sectors" ? "Dòng tiền theo ngành" : tab === "watch" ? "Danh sách theo dõi" : "Bảng giá cổ phiếu"}</h2><span>Giá: 1.000 ₫ · KL: cổ phiếu</span></div>
        {mode !== "sectors" && <div className="website-board-toolbar"><div className="website-tabs" role="group" aria-label="Danh sách cổ phiếu"><button aria-pressed={tab === "all"} onClick={() => setTab("all")}>Tất cả</button><button aria-pressed={tab === "watch"} onClick={() => setTab("watch")}>Theo dõi {watchlist.length}</button></div>{mode === "board" && <div className="website-column-options"><label><input type="checkbox" checked={depth} onChange={event => setDepth(event.target.checked)}/>Dư mua/bán</label><label><input type="checkbox" checked={statistics} onChange={event => setStatistics(event.target.checked)}/>Thống kê</label><label><input type="checkbox" checked={foreign} onChange={event => setForeign(event.target.checked)}/>Nước ngoài</label><label><input type="checkbox" checked={dense} onChange={event => setDense(event.target.checked)}/>Thu gọn</label></div>}</div>}
        {sector !== "all" && <button className="website-filter-chip" aria-label="Xóa lọc ngành" onClick={() => setSector("all")}>{sector} ×</button>}
        {mode === "sectors" ? <div className="website-sector-grid">{sectors.map(item => <button key={item.name} onClick={() => { setSector(item.name); setMode("board"); }}><b>{item.name}</b><strong className={tone(item.change)}>{signed(item.change)}</strong><span>{item.count} mã · GTGD {format(item.value)} tỷ ₫</span></button>)}</div>
        : mode === "board" ? (items.length ? <StockTable items={items} depth={depth} statistics={statistics} foreign={foreign} onSelect={setSelected}/> : <EmptyState title="Chưa có mã phù hợp"/>)
        : <div className="website-overview" role="region" aria-label="Tổng quan cổ phiếu; cuộn ngang để xem đủ cột" tabIndex={0}><table><thead><tr><th>Mã</th><th>Doanh nghiệp</th><th>Sàn / Ngành</th><th>Giá</th><th>+/− %</th><th>Tổng KL</th><th>30 phiên</th><th>Quant</th><th/></tr></thead><tbody>{items.map(stock => <tr key={stock.symbol} tabIndex={0} className={current?.symbol === stock.symbol ? "selected" : ""} onClick={() => setFocused(stock.symbol)} onDoubleClick={() => setSelected(stock.symbol)} onKeyDown={event => { if (event.target === event.currentTarget && event.key === "Enter") setSelected(stock.symbol); }}><td><button className="website-star" aria-label={`${watchlist.includes(stock.symbol) ? "Bỏ theo dõi" : "Theo dõi"} ${stock.symbol}`} aria-pressed={watchlist.includes(stock.symbol)} onClick={event => { event.stopPropagation(); toggleWatch(stock.symbol); }}>{watchlist.includes(stock.symbol) ? "★" : "☆"}</button><button onClick={() => setSelected(stock.symbol)}>{stock.symbol}</button></td><td>{stock.name}</td><td>{stock.exchange} · {stock.sector}</td><td className={tone(stock.change)}>{format(stock.price)}</td><td className={tone(stock.change)}>{signed(stock.change)}</td><td>{format(stock.volume, 0)}</td><td className={tone(stock.change)}><Spark symbol={stock.symbol}/></td><td>{stock.quantScore ?? "—"}</td><td><Link className="website-quant-link" href={quantHref(stock.symbol)}>Quant ›</Link></td></tr>)}</tbody></table>{!items.length && <EmptyState title="Chưa có mã phù hợp"/>}</div>}
      </section>
      {mode !== "sectors" && <section className="website-market-bottom"><div className="website-window"><div className="website-window-title"><h2>Chi tiết cổ phiếu</h2><span>{current?.exchange ?? "—"}</span></div>{current ? <><div className="website-security"><b>{current.symbol}</b><span>{current.name}</span><strong className={tone(current.change)}>{format(current.price)}</strong><button className="website-button" onClick={() => setSelected(current.symbol)}>Biểu đồ ↗</button></div><div className="website-security-body"><div className={tone(current.change)}><small>30 PHIÊN · MÔ PHỎNG</small><Spark symbol={current.symbol}/></div><dl><div><dt>Tham chiếu</dt><dd>{format(current.reference)}</dd></div><div><dt>Tổng khối lượng</dt><dd>{format(current.volume, 0)}</dd></div><div><dt>Điểm Quant</dt><dd>{current.quantScore ?? "—"}</dd></div></dl></div></> : <EmptyState title="Chưa có mã phù hợp"/>}</div><div className="website-window"><div className="website-window-title"><h2>Xếp hạng Quant</h2><span>Trong bộ lọc</span></div>{leaders.map(stock => <div key={stock.symbol} className="website-ranking"><button aria-label={`Chọn mã ${stock.symbol} trong xếp hạng`} onClick={() => setFocused(stock.symbol)}>{stock.symbol}</button><span className="website-accent">{stock.quantScore}</span><span className={tone(stock.change)}>{signed(stock.change)}</span><Link href={quantHref(stock.symbol)} aria-label={`Phân tích Quant ${stock.symbol}`}>↗</Link></div>)}</div></section>}
    </div>
    {selected && <Modal title={`Biểu đồ ${selected}`} onClose={() => setSelected(null)} className="chart-dialog"><ChartSurface key={selected} symbol={selected} onSymbolChange={setSelected}/></Modal>}
  </div>;
}
