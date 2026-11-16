"use client";
import { useEffect, useRef } from "react";
import { useResource } from "@/components/account/common";
import { dailyLimit, money, type Plan } from "@/lib/api/contracts";
import { launchOffer } from "@/lib/launch-offer";
import { track } from "@/lib/analytics";
import { CtaLink } from "./ui";

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

  return <div ref={ref} className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-stretch">
    <ul className="m-0 grid list-none content-start gap-3 p-0">
      {included.map(item => <li key={item} className="flex gap-3 rounded-lg border border-line bg-panel px-4 py-3.5 text-base text-ink-muted"><span aria-hidden="true" className="text-signal">✓</span>{item}</li>)}
    </ul>
    <div className="grid gap-4">
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
  </div>;
}
