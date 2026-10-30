"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api/client";
import { money } from "@/lib/api/contracts";
import type { ScreeningDetail, ScreeningGroup, ScreeningItem, ScreeningLatest, ScreeningResults, ScreeningScore } from "@/lib/api/screening";
import { Guard } from "./account/session";
import { ErrorNotice } from "./account/common";
import { Modal, PageHeading } from "./ui";
import styles from "./screener.module.css";
import { ScreeningSheet, ScreeningCompanyName } from "./screening-sheet";
import { IndustryWatchlist } from "./industry-watchlist";
import { watchlistMemberships } from "@/lib/screening-reference";

const number = (value: number | null | undefined, digits = 1) => typeof value === "number" ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(value) : "—";
const percent = (value: number | null | undefined) => typeof value === "number" ? new Intl.NumberFormat("vi-VN", { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(value) : "—";
const date = (value: string) => value.split("-").reverse().join("/");
const statusLabels = { ELIGIBLE: "Đủ điều kiện", INSUFFICIENT_DATA: "Chưa đủ dữ liệu", LOW_LIQUIDITY: "Thanh khoản thấp" };
const groupLabels: Record<ScreeningGroup, string> = { STRONG: "MẠNH", ACCUMULATION: "TÍCH LŨY", DISTRIBUTION: "PHÂN PHỐI" };
const groupNames = Object.keys(groupLabels) as ScreeningGroup[];

export function Screener() {
  return <><PageHeading title="Quét toàn sàn" description="5 mã tốt nhất và 5 mã nên tránh của phiên, đối chiếu đầy đủ theo sheet lọc cổ phiếu."/><Guard><ScreeningExperience/></Guard></>;
}
function ScreeningExperience() {
  const [activated, setActivated] = useState(false);
  const [view, setView] = useState<"results" | "watchlist">("results");
  return <div className={styles.board}>
    <div className={styles.viewSwitch} aria-label="Bảng quét và Watchlist">
      <button aria-pressed={view === "results"} onClick={() => setView("results")}>Kết quả quét</button>
      <button aria-pressed={view === "watchlist"} onClick={() => setView("watchlist")}>Watchlist theo ngành</button>
    </div>
    <div hidden={view !== "results"}>{activated ? <ScreeningBoard onReset={() => setActivated(false)}/> : <ScanActivation onActivate={() => setActivated(true)}/>}</div>
    {view === "watchlist" && <IndustryWatchlist/>}
  </div>;
}

function ScanActivation({ onActivate }: { onActivate: () => void }) {
  return <section className={styles.gate} aria-label="Kích hoạt kết quả quét toàn sàn">
    <div className={styles.gateCopy}><span className={styles.tag}><i/> PHÂN TÍCH TOÀN THỊ TRƯỜNG</span>
      <h2>Khai mở góc nhìn<br/><em>toàn sàn.</em></h2>
      <p>Khám phá 5 mã nổi bật, 5 mã cần thận trọng và các chỉ số đánh giá.</p>
      <button className={styles.activate} onClick={onActivate}>Kích hoạt kết quả <span aria-hidden="true">↗</span></button>
    </div>
    <div className={styles.gateArt}>
      <svg className={styles.artwork} viewBox="0 0 540 320" fill="none" aria-hidden="true">
        <defs><linearGradient id="scan-beam" x1="0" y1="320" x2="540" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#ff792b" stopOpacity="0"/><stop offset=".5" stopColor="#ff792b"/><stop offset="1" stopColor="#ff792b" stopOpacity="0"/></linearGradient></defs>
        <path d="M40 230 290 88 500 210 250 352Z" fill="#0f3528" fillOpacity=".42" stroke="#2d7758"/>
        <path d="M40 190 290 48 500 170 250 312Z" stroke="#2d7758" strokeOpacity=".45"/>
        <path d="M10 253 294 87 539 227" stroke="url(#scan-beam)" strokeWidth="3"/>
        {[70,118,166,214,262,310,358,406].map((x,i)=><g key={x} transform={`translate(${x} ${190-i*13})`} stroke={i===3||i===6?'#ff792b':'#55dfaa'}><path d="M0-30V38"/><rect x="-6" y={i%2?-9:-17} width="12" height={i%2?30:23} fill={i===3||i===6?'#ff792b':'#55dfaa'}/></g>)}
        <circle cx="292" cy="122" r="55" stroke="#7be8b7" strokeOpacity=".6"/><path d="m330 163 45 44" stroke="#ff792b" strokeWidth="8"/>
        <path d="M292 43V60M292 184V201M213 122H230M354 122H371" stroke="#7be8b7"/>
      </svg>
      <span>KHÔNG CÓ NGÀY MAI,<br/>CHỈ CÓ <b>XÁC SUẤT.</b></span>
    </div>
    <div className={styles.gateFeatures}><div><b>01 / TOÀN THỊ TRƯỜNG</b><span>Tổng hợp theo sàn và doanh nghiệp</span></div><div><b>02 / CƠ HỘI & RỦI RO</b><span>So sánh các mã nổi bật và cần thận trọng</span></div><div><b>03 / TỪNG CỔ PHIẾU</b><span>Mở chi tiết đánh giá cho mã bạn chọn</span></div></div>
  </section>;
}
function ScreeningBoard({ onReset }: { onReset: () => void }) {
  const board = useRef<HTMLDivElement>(null);
  useEffect(() => { board.current?.focus(); }, []);
  const [version, setVersion] = useState(0);
  const [publication, setPublication] = useState<{ latest: ScreeningLatest; best: ScreeningItem[]; worst: ScreeningItem[] }>();
  const [error, setError] = useState<Error>(), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ run: ScreeningLatest; item: ScreeningItem }>();
  const onDenied = useCallback((error: Error) => { setError(error); setPublication(undefined); setSelected(undefined); }, []);
  const forbidden = error instanceof ApiError && error.status === 403;
  const notReady = error instanceof ApiError && error.code === "SCREENING_NOT_READY";
  useEffect(() => {
    let active = true; setLoading(true);
    void (async () => {
      const latest = await api<ScreeningLatest>("user", "screenings/latest");
      const groups = ["OVERALL", "DISTRIBUTION"] as const;
      const pages = await Promise.all(groups.map(group => api<ScreeningResults>("user", `screenings/${encodeURIComponent(latest.id)}/results?group=${group}`)));
      if (pages.some((page, index) => page.run_id !== latest.id || page.group !== groups[index])) throw new Error("Kết quả không khớp phiên dữ liệu. Vui lòng tải lại.");
      if (active) {
        setPublication({ latest, best: pages[0].items.slice(0, 5), worst: pages[1].items.slice(0, 5) });
        setError(undefined);
      }
    })().catch(error => {
      if (!active) return;
      setError(error);
      if (error instanceof ApiError && [401,403].includes(error.status)) { setPublication(undefined); setSelected(undefined); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);
  useEffect(() => {
    if (forbidden) return;
    const refresh = () => { if (document.visibilityState === "visible") setVersion(v => v+1); };
    const timer = setTimeout(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [version, forbidden]);
  return <div className={styles.board} ref={board} tabIndex={-1} aria-label="Kết quả quét toàn sàn">
    <div className={styles.toolbar}><button className={styles.button} onClick={onReset}>← Xem lại banner</button><button className={styles.button} onClick={() => setVersion(v => v+1)} disabled={loading || forbidden}>{loading ? 'Đang cập nhật…' : 'Cập nhật kết quả ↻'}</button></div>
    {forbidden ? <section className={styles.empty}><h2>Cần gói phân tích còn hiệu lực</h2><p>Kích hoạt gói để xem kết quả quét.</p><Link href="/plans">Xem các gói phân tích</Link></section>
      : !publication ? notReady ? <section className={styles.empty} role="status"><h2>Chưa có kết quả được công bố</h2><p>Kết quả sẽ xuất hiện tại đây khi dữ liệu sẵn sàng.</p></section>
      : error ? <><ErrorNotice error={error}/><button className={styles.button} onClick={() => setVersion(v => v+1)}>Thử lại</button></>
      : <p role="status">Đang tải kết quả công bố mới nhất…</p> : null}
    {publication && <>
      <div className={styles.heading}><div><span className={styles.tag}>PHÂN TÍCH TOÀN SÀN</span><h2>5 mã tốt nhất · <em>5 mã nên tránh</em></h2><p>Dữ liệu ngày {date(publication.latest.target_session)}</p></div><span className={styles.hint}>Chọn mã để xem screening · Mở Quant để phân tích chuyên sâu</span></div>
      {(publication.latest.stale || error) && <p role="status" className={styles.notice}>Đang hiển thị kết quả gần nhất. Kết quả mới sẽ tự cập nhật khi sẵn sàng.</p>}
      {error && <button className={styles.button} onClick={() => setVersion(v => v+1)}>Thử lại</button>}
      <p className={styles.sheetNotice}>Giá: VND · GTGD: tỷ VND · Thời gian: phiên. <span>Ô — là chỉ số chưa có trong bản công bố. Xếp hạng screening không thay cho khuyến nghị Quant.</span></p>
      <ScreeningSheet kind="opportunity" title="5 mã tốt nhất" description="Xếp hạng tổng hợp từ bản quét của phiên." items={publication.best} loading={loading} onSelect={item => setSelected({ run: publication.latest, item })}/>
      <ScreeningSheet kind="caution" title="5 mã nên tránh nhất" description="5 mã có điểm phân phối cao nhất trong bản quét của phiên." items={publication.worst} loading={loading} onSelect={item => setSelected({ run: publication.latest, item })}/>
    </>}
    {selected && <StockDetail key={`${selected.run.id}:${selected.item.symbol}`} run={selected.run} item={selected.item} onClose={() => setSelected(undefined)} onDenied={onDenied}/>}
  </div>;
}
function Change({ value }: { value: number | null }) {
  return <span className={value == null || value === 0 ? undefined : value < 0 ? styles.negative : styles.positive}>{percent(value)}</span>;
}
function Score({ value, warning = false }: { value: ScreeningScore; warning?: boolean }) {
  return <div className={styles.score}><strong className={value.score == null ? styles.hint : warning && value.score >= 50 ? styles.negative : undefined}>{value.score == null ? "—" : `${number(value.score)}%`}</strong><small>{value.met_count}/{value.total_count} đạt{value.unavailable_count > 0 ? ` · thiếu ${value.unavailable_count}` : ""}</small></div>;
}
function Metric({ label, children }: { label: string; children: ReactNode }) {
  return <div className={styles.metric}><dt>{label}</dt><dd>{children ?? "Chưa đủ dữ liệu"}</dd></div>;
}
function StockDetail({ run, item, onClose, onDenied }: { run: ScreeningLatest; item: ScreeningItem; onClose: () => void; onDenied: (error: Error) => void }) {
  const memberships = watchlistMemberships(item.symbol);
  const [data, setData] = useState<ScreeningDetail>(), [error, setError] = useState<Error>(), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setError(undefined);
    void api<ScreeningDetail>("user", `screenings/${encodeURIComponent(run.id)}/symbols/${encodeURIComponent(item.symbol)}`).then(next => {
      if (next.run_id !== run.id || next.item.symbol !== item.symbol) throw new Error("Chi tiết không khớp phiên dữ liệu.");
      if (active) setData(next);
    }).catch(error => { if (active) { setError(error); if (error instanceof ApiError && [401,403].includes(error.status)) onDenied(error); } });
    return () => { active = false; };
    // The detail remains pinned to the run selected when the modal opened.
  }, [run.id, item.symbol, retry, onDenied]);
  const assessment = data?.assessment, market = data?.market;
  return <Modal title={`${item.symbol} · Chi tiết screening`} onClose={onClose} className={styles.dialog}>
    <div className={styles.detailBody}>
      <div className={styles.heading}><div><p>{item.exchange} · Dữ liệu ngày {date(run.target_session)}</p><ScreeningCompanyName item={data?.item || item} fallback={item}/><h3>{item.price_vnd == null ? "—" : money(item.price_vnd)} <Change value={item.change_ratio}/></h3></div><span className={styles.status}>{statusLabels[item.status]}</span></div>
      <section className={styles.detailSection} aria-label="Nhóm theo Watchlist"><h3>Nhóm trong Watchlist</h3>
        {memberships.length ? <ul className={styles.watchlistGroups}>{memberships.map(group => <li key={group.column}>{group.name}<small>{group.kind === "thematic" ? "Rổ theo dõi / chuyên đề" : "Nhóm ngành trong Watchlist"}</small></li>)}</ul> : <p className={styles.hint}>Mã này chưa nằm trong Watchlist đã cung cấp.</p>}
        <p className={styles.hint}>Một mã có thể thuộc nhiều nhóm. Phân ngành dùng trong kết quả Quant được giữ theo báo cáo của phiên.</p>
      </section>
      {error ? <><ErrorNotice error={error}/><button className={styles.button} onClick={() => setRetry(v => v+1)}>Thử lại</button></> : !data ? <p role="status">Đang tải đánh giá chi tiết…</p> : <>
        <p className={styles.hint}>{data.input_mode === "PROVISIONAL_DAILY" ? "Dữ liệu tạm tính trong phiên; khối lượng chưa phải cả ngày." : "Dữ liệu phiên đã hoàn tất."}{data.observed_at && ` Cập nhật lúc ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(data.observed_at))} (giờ Việt Nam).`}</p>
        <section className={styles.detailSection}><h3>Đánh giá tổng quan</h3><dl className={styles.metrics}>
          <Metric label="Tín hiệu">{assessment?.overall_signal}</Metric><Metric label="Điều chỉnh theo thị trường">{assessment?.adjusted_signal}</Metric><Metric label="Dòng tiền">{assessment?.money_flow}</Metric><Metric label="Xu hướng">{assessment?.trend}</Metric><Metric label="Sức mạnh">{assessment?.strength}</Metric>
        </dl></section>
        <div className={styles.groupCards}>{groupNames.map(group => <section key={group}><h3>{groupLabels[group]}</h3><Score value={data.item.groups[group]} warning={group === "DISTRIBUTION"}/></section>)}</div>
        <section className={styles.detailSection}><h3>Bối cảnh VNINDEX</h3><dl className={styles.metrics}>
          <Metric label="VNINDEX">{number(market?.last_close, 2)} điểm</Metric><Metric label="Trạng thái thị trường">{market?.regime_label}</Metric><Metric label="Điểm thị trường">{market?.combined_score == null ? "—" : `${number(market.combined_score)}/100`}</Metric><Metric label="Rủi ro">{market?.risk_label}</Metric>
          <Metric label="Thay đổi 5D">{percent(market?.change_5d_ratio)}</Metric><Metric label="Thay đổi 20D">{percent(market?.change_20d_ratio)}</Metric><Metric label="So với MA20">{market?.above_ma20 == null ? "—" : market.above_ma20 ? "Trên MA20" : "Dưới MA20"}</Metric><Metric label="Biến động ATR">{market?.atr_pct == null ? "—" : `${number(market.atr_pct)}%`}</Metric>
        </dl></section>
        <div className={styles.notes}><Note title="Ghi chú nhà đầu tư" text={assessment?.investor_note}/><Note title="Ghi chú môi giới" text={assessment?.broker_note}/><Note title="Chiến lược theo thị trường · Nhà đầu tư" text={market?.investor_strategy}/><Note title="Chiến lược theo thị trường · Môi giới" text={market?.broker_strategy}/></div>
      </>}
      <div className={styles.actions}><Link className={styles.button} href={`/charts?symbol=${encodeURIComponent(item.symbol)}&exchange=${encodeURIComponent(item.exchange || "")}`}>Xem biểu đồ ↗</Link><Link className={styles.primary} href={`/analysis?symbol=${encodeURIComponent(item.symbol)}`}>Phân tích Quant ↗</Link></div>
    </div>
  </Modal>;
}
function Note({ title, text }: { title: string; text: string | null | undefined }) {
  return <section className={styles.detailSection}><h3>{title}</h3><p>{text || "Chưa đủ dữ liệu để đưa ra nhận xét."}</p></section>;
}
