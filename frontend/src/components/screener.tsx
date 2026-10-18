"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { money } from "@/lib/api/contracts";
import type { ScreeningItem, ScreeningLatest, ScreeningResults } from "@/lib/api/screening";
import { Guard } from "./account/session";
import { ErrorNotice } from "./account/common";
import { PageHeading, Panel } from "./ui";

const percent = (v: number) => new Intl.NumberFormat("vi-VN", { style: "percent", maximumFractionDigits: 1 }).format(v);
type Publication = { latest: ScreeningLatest; best: ScreeningItem[]; avoid: ScreeningItem[] };

function ScanArtwork() {
  return <svg className="website-scan-artwork" viewBox="0 0 540 320" fill="none" aria-hidden="true">
    <defs><linearGradient id="scan-beam" x1="0" y1="320" x2="540" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#ff6a1a" stopOpacity="0"/><stop offset=".5" stopColor="#ff6a1a"/><stop offset="1" stopColor="#ff6a1a" stopOpacity="0"/></linearGradient></defs>
    <path d="M40 230 290 88 500 210 250 352Z" fill="#0f3528" fillOpacity=".42" stroke="#2d7758"/>
    <path d="M40 190 290 48 500 170 250 312Z" stroke="#2d7758" strokeOpacity=".45"/>
    <path d="M10 253 294 87 539 227" stroke="url(#scan-beam)" strokeWidth="3"/>
    {[70,118,166,214,262,310,358,406].map((x,i)=><g key={x} transform={`translate(${x} ${190-i*13})`} stroke={i===3||i===6?'#ff762b':'#45d89c'}><path d="M0-30V38"/><rect x="-6" y={i%2?-9:-17} width="12" height={i%2?30:23} fill="currentColor" className={i===3||i===6?'website-accent':'website-up'}/></g>)}
    <circle cx="292" cy="122" r="55" stroke="#7be8b7" strokeOpacity=".6"/><path d="m330 163 45 44" stroke="#ff762b" strokeWidth="8"/>
    <path d="M292 43V60M292 184V201M213 122H230M354 122H371" stroke="#7be8b7"/>
  </svg>;
}


export function Screener() {
  return <><PageHeading title="Quét toàn sàn" description="Tìm cơ hội và nhận diện rủi ro."/><section className="website-scan-hero"><div className="website-scan-copy"><span className="website-eyebrow">PHÂN TÍCH TOÀN THỊ TRƯỜNG</span><h2>Khai mở góc nhìn<br/><em>toàn sàn.</em></h2><p>Khám phá 5 mã nổi bật, 5 mã cần thận trọng và các chỉ số đánh giá. Kết quả đã công bố sẽ hiển thị khi bạn đăng nhập và có gói sử dụng phù hợp.</p></div><ScanArtwork/></section><Guard><ScreeningBoard/></Guard></>;
}
function ScreeningBoard() {
  const [version, setVersion] = useState(0);
  const [publication, setPublication] = useState<Publication>(), [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true);
    void (async () => {
      const latest = await api<ScreeningLatest>("user", "screenings/latest");
      const groups = ["OVERALL", "DISTRIBUTION"] as const;
      const pages = await Promise.all(groups.map(group => api<ScreeningResults>("user", `screenings/${encodeURIComponent(latest.id)}/results?group=${group}&limit=5`)));
      if (pages.some((page, i) => page.run_id !== latest.id || page.group !== groups[i])) throw new Error("Chưa tải được kết quả phù hợp. Vui lòng thử lại.");
      if (active) { setPublication({ latest, best: pages[0].items.slice(0,5), avoid: pages[1].items.slice(0,5) }); setError(undefined); }
    })().catch(err => { if (active) { setError(err); if (err instanceof ApiError && [401,403].includes(err.status)) setPublication(undefined); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);
  const forbidden = error instanceof ApiError && error.code === "SCREENING_SUBSCRIPTION_REQUIRED";
  const notReady = error instanceof ApiError && error.code === "SCREENING_NOT_READY";
  useEffect(() => {
    if (loading || forbidden) return;
    const refresh = () => { if (document.visibilityState === "visible") setVersion(v => v+1); };
    const timer = setTimeout(refresh,60000);
    document.addEventListener("visibilitychange",refresh);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange",refresh); };
  }, [loading, forbidden, version]);
  return <>
    <div className="grid gap-5" aria-live="polite">
      {loading && !publication && <p role="status">Đang tải kết quả công bố mới nhất…</p>}
      {forbidden ? <section className="rounded-[4px] border border-[var(--border)] p-6"><h2 className="text-xl">Cần gói phân tích còn hiệu lực</h2><p className="my-3">Kích hoạt gói để xem kết quả quét.</p><Link className="text-[var(--accent)] underline" href="/plans">Xem các gói phân tích</Link></section>
        : notReady && !publication ? <section role="status" className="rounded-[4px] border border-[var(--border)] p-6"><h2 className="text-xl">Chưa có kết quả được công bố</h2><p className="mt-3 text-[var(--muted)]">Kết quả sẽ xuất hiện tại đây khi dữ liệu sẵn sàng.</p></section>
        : error && !publication ? <ErrorNotice error={error}/> : null}
      {publication && <>
        <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-xl font-semibold">Kết quả quét</h2><p className="text-sm text-[var(--muted)]">Dữ liệu ngày {publication.latest.target_session.split("-").reverse().join("/")}</p></div>
        {(publication.latest.stale || error) && <p role="status" className="text-sm text-[var(--muted)]">Đang hiển thị kết quả gần nhất. Kết quả mới sẽ tự cập nhật khi sẵn sàng.</p>}
        <div className="grid min-w-0 gap-6 min-[900px]:grid-cols-2"><ScreeningList items={publication.best} title="5 mã nổi bật"/><ScreeningList items={publication.avoid} title="5 mã nên tránh"/></div>
      </>}
    </div>
  </>;
}
function ScreeningList({ items, title }: { items: ScreeningItem[]; title: string }) {
  return <Panel title={title}><div className="min-w-0 px-5 pb-5">{!items.length && <p className="py-5 text-[var(--muted)]">Chưa có mã phù hợp.</p>}{items.map(item => <article key={item.symbol} className="border-t border-[var(--border)] py-5 first:border-t-0">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold"><Link href={`/charts?symbol=${encodeURIComponent(item.symbol)}&exchange=${encodeURIComponent(item.exchange || "")}`}>{item.symbol}</Link><span className="ml-2 text-xs font-normal text-[var(--muted)]">{item.exchange}</span></h3><span className="text-sm">{new Intl.NumberFormat("vi-VN",{ maximumFractionDigits:1 }).format(item.score)}/100</span></div>
    <p className="my-2 flex flex-wrap gap-3 text-sm"><span>{typeof item.price_vnd === "number" ? money(item.price_vnd) : "—"}</span>{typeof item.change_ratio === "number" && <span className={item.change_ratio < 0 ? "text-[var(--negative)]" : "text-[var(--positive)]"}>{percent(item.change_ratio)}</span>}</p>
    {item.recommendation && <p className="mb-3 text-sm text-[var(--muted)]">{item.recommendation}</p>}
    <Link className="text-sm text-[var(--accent)]" href={`/analysis?symbol=${encodeURIComponent(item.symbol)}`}>Phân tích Quant ↗</Link>
  </article>)}</div></Panel>;
}
