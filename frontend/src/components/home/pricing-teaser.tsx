"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useResource } from "@/components/account/common";
import { dailyLimit, money, type Plan } from "@/lib/api/contracts";
import { launchOffer } from "@/lib/launch-offer";
import { track } from "@/lib/analytics";
import { CtaLink } from "./ui";
import { proPerks, perkStatusLabel, proPerksNote } from "@/content/pro-perks";
import { PerkVisual } from "@/components/pro-perks";

const perDay = (plan: Plan) => Math.round(plan.price_vnd / Math.max(1, plan.duration_days) / 100) * 100;
const included = ["Quét toàn sàn: 5 mã tốt nhất và 5 mã nên tránh", "Báo cáo Quant đầy đủ: kết luận, vùng giá, rủi ro", "Hạn mức lượt phân tích đặt lại mỗi ngày lúc 00:00", "Gia hạn nối tiếp, không mất ngày còn lại"];

/** Paid plans from the public catalogue. Prices always come from the server. */
export function PricingTeaser() {
  const { data, loading } = useResource<{ payments_enabled: boolean; items: Plan[] }>("plans", "public");
  const seen = useRef(false), ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && !seen.current) { seen.current = true; track("view_pricing", { location: "home" }); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const paid = (data?.items || []).filter(p => p.price_vnd > 0 && p.available !== false);

  return <div ref={ref}><div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-stretch">
    <div>
    <h3 className="m-0 mb-3 text-sm font-medium uppercase tracking-wider text-ink-subtle">Đã bao gồm</h3>
    <ul className="m-0 grid list-none content-start gap-3 p-0">
      {included.map(item => <li key={item} className="flex gap-3 rounded-lg border border-line bg-panel px-4 py-3.5 text-base text-ink-muted"><span aria-hidden="true" className="text-signal">✓</span>{item}</li>)}
      <li className="flex gap-3 rounded-lg border border-brand/40 bg-brand/5 px-4 py-3.5 text-base text-ink"><span aria-hidden="true" className="text-brand">★</span>Truy cập sớm {proPerks.length} mô hình mới: danh mục, quyền chọn, phái sinh…</li>
    </ul>
    </div>
    <div className="grid content-start gap-4">
      {loading && !data && <div className="h-72 animate-pulse rounded-xl border border-line bg-panel" aria-label="Đang tải bảng giá" />}
      {paid.map(plan => {
        const discounted = launchOffer.enabled && plan.price_vnd === launchOffer.priceVnd;
        return <article key={plan.id} className="relative rounded-xl border-2 border-brand bg-panel p-7 shadow-[0_0_80px_#ff914d14] max-sm:p-5">
          <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-0.5 text-xs font-semibold text-brand-ink">Đề xuất</span>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="m-0 text-xl font-semibold text-ink">{plan.name}</h3>
            <span className="text-sm text-ink-subtle">{plan.duration_days} ngày</span>
          </div>
          {discounted && <div className="mt-4 flex flex-wrap items-center gap-3 text-sm"><del className="text-ink-subtle">{money(launchOffer.listPriceVnd)}</del><span className="rounded border border-brand px-2 py-0.5 text-brand">Giảm {Math.round((1 - launchOffer.priceVnd / launchOffer.listPriceVnd) * 100)}% đợt này</span></div>}
          <p className="m-0 mt-2 flex items-baseline gap-2"><strong className="text-5xl font-semibold tracking-tight text-brand max-sm:text-4xl">{money(plan.price_vnd)}</strong></p>
          <p className="m-0 mt-2 text-base text-ink-muted">Chỉ khoảng <b className="font-semibold text-ink">{money(perDay(plan))}/ngày</b> · {dailyLimit(plan)} lượt phân tích mỗi ngày</p>
          <ul aria-label="Truy cập sớm" className="m-0 mt-5 flex list-none flex-wrap gap-2 p-0">
            {proPerks.map(perk => <li key={perk.id} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-panel-raised py-1 pl-1.5 pr-3 text-sm text-ink-muted"><PerkVisual id={perk.id} className="h-4 w-6" />{perk.short}</li>)}
          </ul>
          <CtaLink href={`/plans?selected=${plan.id}`} location="home_pricing" className="mt-6 w-full" onClickCapture={() => track("select_plan", { plan: plan.name, price: plan.price_vnd, location: "home" })}>Chọn {plan.name} <span aria-hidden="true">→</span></CtaLink>
          {!data?.payments_enabled && <p className="m-0 mt-3 text-sm text-ink-subtle">Cổng thanh toán đang tạm đóng; bạn vẫn có thể xem chi tiết gói.</p>}
        </article>;
      })}
      {!loading && !paid.length && <div className="rounded-xl border border-line-strong bg-panel p-7">
        <h3 className="m-0 text-xl font-semibold text-ink">Các gói phân tích</h3>
        <p className="mt-2 text-base text-ink-muted">Xem giá, hạn mức lượt phân tích và thời hạn của từng gói.</p>
        <CtaLink href="/plans" location="home_pricing_fallback" className="mt-5">Xem bảng giá <span aria-hidden="true">→</span></CtaLink>
      </div>}
      <p className="m-0 text-center text-sm text-ink-subtle">Thanh toán chuyển khoản QR · Hệ thống tự kích hoạt khi nhận tiền</p>
    </div>
  </div>

  <div className="mt-14">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/50 bg-brand/10 px-3 py-1 text-sm font-medium text-brand">★ Đặc quyền Pro</span>
        <h3 className="m-0 mt-3 text-2xl font-semibold tracking-tight text-ink">Truy cập sớm các mô hình mới</h3>
      </div>
      <p className="m-0 max-w-md text-sm leading-relaxed text-ink-subtle">{proPerksNote}</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 max-sm:-mx-5 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:px-5 max-sm:pb-2 max-sm:[scrollbar-width:none] max-sm:[&>*]:w-[72%] max-sm:[&>*]:shrink-0 max-sm:[&>*]:snap-start">
      {proPerks.map(perk => <article key={perk.id} className="flex flex-col overflow-hidden rounded-xl border border-line bg-panel transition-colors hover:border-line-strong">
        <div className="relative border-b border-line bg-[radial-gradient(circle_at_30%_20%,#1c3324,transparent_70%)] px-4 pb-3 pt-4">
          <span className={`absolute right-3 top-3 rounded px-2 py-0.5 text-xs ${perk.status === "beta" ? "border border-signal/40 bg-signal/10 text-signal" : "border border-caution/40 bg-caution/10 text-caution"}`}>{perkStatusLabel[perk.status]}</span>
          <PerkVisual id={perk.id} className="mt-4 h-20 w-full" />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h4 className="m-0 text-lg font-semibold leading-snug text-ink">{perk.name}</h4>
          <p className="m-0 mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{perk.description}</p>
          {perk.href && <Link href={perk.href} className="mt-4 text-sm text-ink-muted hover:text-brand" onClick={() => track("cta_click", { location: "home_perk", target: perk.href })}>Xem bản thử nghiệm →</Link>}
        </div>
      </article>)}
    </div>
  </div>
  </div>;
}
