"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import ModelVisual from "./model-visual";
import { homeModels, inspectionStages } from "@/content/home-models";
import { track } from "@/lib/analytics";
import { CtaLink, Kicker, Section, SectionHeader, buttonStyles } from "./ui";
import { SampleReport } from "./sample-report";
import { PricingTeaser } from "./pricing-teaser";

type Selection = string | string[];

const benefits: [string, string, string][] = [
  ["01", "Loại sớm mã rủi ro", "Dữ liệu lỗi, thanh khoản mỏng hay biến động bất thường bị gắn cờ trước khi bạn kịp xuống tiền."],
  ["02", "Biết khi nào nên hành động", "Mỗi kết luận đi kèm điều kiện kích hoạt cụ thể, không phải một lời hô mua."],
  ["03", "Kiểm soát số tiền có thể mất", "Vùng giá mô phỏng, điểm dừng lỗ và ngân sách rủi ro hiển thị ngay trong báo cáo."],
];
const steps: [string, string][] = [
  ["Nhập mã bạn đang quan tâm", "Mã nghe từ bạn bè, môi giới hay mạng xã hội — chỉ cần 3 ký tự."],
  ["Hệ thống kiểm tra 9 lớp", "Dữ liệu, thanh khoản, xu hướng, trạng thái thị trường, phân phối rủi ro và vốn."],
  ["Nhận hồ sơ bằng chứng", "Kết luận dễ hiểu, vùng giá, rủi ro và các mốc cần theo dõi. Bạn tự quyết định."],
];
const outcomes: [string, string, string, string][] = [
  ["AVOID", "Loại", "Dữ liệu, thanh khoản hoặc rủi ro không đạt điều kiện.", "text-[#f08088]"],
  ["WATCH", "Theo dõi", "Bằng chứng chưa đủ; giữ mã trong tầm quan sát.", "text-ink-muted"],
  ["BUY_SETUP", "Chờ xác nhận", "Có cơ hội, cần chờ điều kiện kích hoạt.", "text-caution"],
  ["BUY_NOW", "Lập kế hoạch", "Đối chiếu điều kiện, vốn và giới hạn rủi ro trước khi thực hiện.", "text-signal"],
];
const faqs: [string, string][] = [
  ["QuanTik có phải khuyến nghị mua bán không?", "Không. QuanTik đưa ra hồ sơ bằng chứng, điều kiện hành động và giới hạn rủi ro. Quyết định cuối cùng và rủi ro đi kèm thuộc về bạn."],
  ["Dữ liệu lấy từ đâu?", "Bảng điện và chỉ số cập nhật realtime từ AGR, biểu đồ từ VPS. Báo cáo Quant tính trên dữ liệu giá lịch sử theo phiên bản mô hình được công bố."],
  ["Một lượt phân tích được tính thế nào?", "Mỗi yêu cầu phân tích được hệ thống nhận thành công tính một lượt trong hạn mức ngày. Hạn mức đặt lại lúc 00:00 giờ Việt Nam."],
  ["Thanh toán ra sao?", "Chuyển khoản ngân hàng qua mã QR. Hệ thống tự xác nhận và kích hoạt gói khi nhận được giao dịch đúng số tiền và nội dung."],
  ["Mua thêm khi gói còn hạn thì sao?", "Kỳ mới được nối tiếp ngay sau kỳ hiện tại, bạn không mất ngày nào còn lại."],
  ["Mô hình có đảm bảo thắng không?", "Không mô hình nào chắc thắng. Mỗi mô hình trong QuanTik đều ghi rõ đầu vào, đầu ra và giới hạn áp dụng để bạn hiểu mức độ tin cậy."],
];

export function Explanation({ selection, onClose, paused }: { selection: Selection; onClose: () => void; paused: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (!el.open) el.showModal();
    return () => { if (el.open) el.close(); };
  }, []);
  const model = typeof selection === "string" ? homeModels.find(m => m.id === selection) : null;
  return <dialog ref={dialog} aria-labelledby="home-explanation-title" onCancel={onClose} onClose={onClose}
    onClick={e => {
      if (e.target !== dialog.current) return;
      const r = e.currentTarget.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
    }}
    className="home-explanation m-auto max-h-[calc(100dvh-48px)] w-[min(960px,calc(100vw-32px))] rounded-xl border border-line-strong bg-panel p-7 font-sans text-base leading-relaxed text-ink shadow-[0_30px_140px_#0009] backdrop:bg-[#020b07cc] backdrop:backdrop-blur-sm max-md:p-5">
    <header className="mb-6 flex items-start justify-between gap-5 border-b border-line pb-5">
      <div><Kicker>{model ? model.code : "Lớp kiểm tra " + selection[0]}</Kicker><h2 id="home-explanation-title" className="mt-2 text-2xl font-semibold leading-snug">{model ? model.name : selection[1]}</h2></div>
      <button type="button" autoFocus onClick={onClose} aria-label="Đóng giải thích" className="grid size-10 shrink-0 place-items-center rounded-md border border-line-strong bg-panel-raised text-2xl text-ink-muted hover:text-ink">×</button>
    </header>
    {model ? <>
      <div className="grid gap-7 md:grid-cols-2">
        <div className="min-w-0"><ModelVisual model={model.id} paused={paused || model.soon} large /><p className="mt-4 text-sm leading-relaxed text-ink-muted">{model.meaning}</p></div>
        <div className="min-w-0 text-sm leading-relaxed text-ink-muted [&_h3]:mb-1 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_h3:first-of-type]:mt-0">
          {model.soon && <span className="mb-3 inline-block font-mono text-xs text-caution">Sắp ra mắt · chưa khả dụng</span>}
          <h3>Đầu vào</h3><p className="m-0">{model.input}</p>
          <h3>Đầu ra thể hiện điều gì?</h3><p className="m-0">{model.output}</p>
          <div className="my-5 overflow-x-auto rounded-md bg-panel-raised px-4 py-3 font-mono text-sm text-[#f3bd91] [overflow-wrap:anywhere]">{model.formula}</div>
          <h3>Giới hạn áp dụng</h3><p className="m-0">{model.limit}</p>
        </div>
      </div>
      <p className="m-0 mt-6 border-t border-line pt-4 text-xs text-ink-subtle">Dữ liệu minh họa cố định · Không phải kết quả phân tích của một cổ phiếu.</p>
    </> : <>
      <p className="m-0 text-ink-muted">{selection[3]}</p>
      {selection[0] === "02" && <p className="mt-3 text-ink-muted">Cờ bước nhảy giá là dấu hiệu cần kiểm tra thêm; không thay thế xác minh thông báo doanh nghiệp.</p>}
      <p className="m-0 mt-6 border-t border-line pt-4 text-xs text-ink-subtle">Một bước trong quy trình; cần đối chiếu cùng các lớp bằng chứng còn lại.</p>
    </>}
  </dialog>;
}

function InspectForm({ id, onInspect, compact = false }: { id: string; onInspect: (symbol: string, location: string) => void; compact?: boolean }) {
  const [symbol, setSymbol] = useState(""), [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,5}$/.test(value)) { setError("Nhập mã cổ phiếu gồm 3–5 ký tự, ví dụ FPT hoặc HPG."); return; }
    setError("");
    onInspect(value, id);
  }
  return <div className={compact ? "mx-auto w-full max-w-lg" : "w-full max-w-xl"}>
    <form onSubmit={submit} className="flex items-center gap-2 rounded-lg border border-line-strong bg-panel-raised p-1.5 pl-4 focus-within:border-brand">
      <label htmlFor={id} className="sr-only">Mã cổ phiếu cần kiểm định</label>
      <span aria-hidden="true" className="text-xl text-ink-subtle">⌕</span>
      <input id={id} value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="Nhập mã cổ phiếu, ví dụ FPT" maxLength={5} autoComplete="off" spellCheck="false"
        className="min-w-0 flex-1 bg-transparent py-3 font-sans text-base text-ink outline-none placeholder:text-ink-subtle" aria-describedby={error ? `${id}-error` : undefined} />
      <button type="submit" className={`${buttonStyles.primary} min-h-11 px-4 max-sm:px-3`}>Kiểm định <span aria-hidden="true">→</span></button>
    </form>
    {error && <p id={`${id}-error`} role="alert" className="m-0 mt-2 text-sm text-[#f9a4aa]">{error}</p>}
  </div>;
}

export default function HomePage() {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(null), [paused, setPaused] = useState(false);
  const [menu, setMenu] = useState(false), [allModels, setAllModels] = useState(false);
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    setMenu(false);
  };
  const inspect = (symbol: string, location: string) => {
    track("inspect_submit", { symbol, location });
    router.push(`/analysis?symbol=${encodeURIComponent(symbol)}`);
  };
  const models = allModels ? homeModels : homeModels.slice(0, 3);
  const nav: [string, () => void][] = [
    ["Cách hoạt động", () => scrollTo("home-process")],
    ["Báo cáo mẫu", () => scrollTo("home-sample")],
    ["Bảng giá", () => scrollTo("home-pricing")],
  ];

  return <div className="quantik-home min-h-screen bg-page font-sans text-base leading-relaxed text-ink antialiased">
    <a href="#home-content" className="absolute left-4 top-0 z-50 -translate-y-[200%] bg-brand p-3 text-brand-ink focus:translate-y-0">Đến nội dung</a>

    <header className="home-nav sticky top-0 z-40 border-b border-line bg-page/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-6 px-7 py-4 max-lg:gap-4 max-md:px-5 max-md:py-3">
        <button onClick={() => window.scrollTo({ top: 0 })} aria-label="QuanTik — Trang chủ" className="flex items-center gap-3 text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/quantik-logo.jpg" width={36} height={36} alt="" className="rounded-md max-sm:size-8" />
          <span className="text-2xl font-semibold leading-none tracking-tight max-sm:text-xl">Quan<span className="text-brand">Tik</span></span>
        </button>
        <nav id="home-navigation" aria-label="Điều hướng trang chủ" className={`${menu ? "flex" : "hidden"} order-last w-full flex-col md:order-none md:ml-6 md:flex md:w-auto md:flex-row md:items-center md:gap-7`}>
          {nav.map(([label, go]) => <button key={label} onClick={go} className="border-t border-line py-3 text-left text-base text-ink-muted hover:text-ink md:border-0 md:py-2 md:text-sm">{label}</button>)}
          <Link href="/dashboard" className="border-t border-line py-3 text-base text-ink-muted hover:text-ink md:border-0 md:py-2 md:text-sm">Thị trường ↗</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <CtaLink href="/login" variant="ghost" location="nav_login" className="min-h-10 text-sm max-sm:hidden" onClickCapture={() => track("login_start", { location: "nav" })}>Đăng nhập</CtaLink>
          <button onClick={() => scrollTo("home-pricing")} className={`${buttonStyles.primary} min-h-10 px-4 text-sm max-sm:px-3`}><span className="max-sm:hidden">Xem bảng giá</span><span className="sm:hidden">Bảng giá</span></button>
          <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="home-navigation" className="rounded-md border border-line-strong bg-panel-raised px-3 py-2 text-sm md:hidden">{menu ? "Đóng" : "Menu"}</button>
        </div>
      </div>
    </header>

    <main id="home-content" className="mx-auto max-w-[1336px] px-7 max-md:px-5">
      {/* Hero */}
      <section className="grid grid-cols-1 items-center gap-14 py-20 lg:grid-cols-[1fr_1.05fr] [&>*]:min-w-0 max-lg:gap-10 max-md:py-12">
        <div>
          <Kicker>Kiểm định cổ phiếu Việt Nam</Kicker>
          <h1 className="my-6 text-display font-semibold [&_em]:not-italic [&_em]:text-brand">Nghe một mã.<br />Đừng bỏ tiền<br /><em>khi chưa hiểu.</em></h1>
          <p className="m-0 mb-8 max-w-xl text-lg leading-relaxed text-ink-muted max-md:text-base">
            <strong className="font-semibold text-ink">Nhập một mã, nhận hồ sơ bằng chứng trong một báo cáo:</strong> nên loại, theo dõi, chờ xác nhận hay lập kế hoạch — kèm vùng giá và giới hạn rủi ro để bạn tự quyết định.
          </p>
          <InspectForm id="home-symbol" onInspect={inspect} />
          <ul className="m-0 mt-7 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-sm text-ink-muted">
            <li><b className="font-semibold text-ink">1.600+</b> mã HOSE · HNX · UPCOM</li>
            <li><b className="font-semibold text-ink">9</b> lớp kiểm tra</li>
            <li><b className="font-semibold text-ink">4</b> kết luận rõ ràng</li>
          </ul>
        </div>

        <div className="home-hero-terminal min-w-0 overflow-hidden rounded-xl border border-line-strong bg-[linear-gradient(130deg,#12251a,#101b14)] shadow-[0_26px_100px_#0005]">
          <div className="flex justify-between gap-3 border-b border-line px-5 py-3 font-mono text-xs text-ink-subtle"><span>QUANTIK / MODEL EXPLORER</span><span>3D</span></div>
          <div className="home-live-heading flex items-center justify-between gap-4 px-6 pb-1 pt-5 max-md:px-4">
            <div><Kicker>Phân phối & rủi ro</Kicker><button onClick={() => setSelection("monte")} className="mt-1 flex items-center gap-3 text-left text-xl font-semibold">GARCH–t Monte Carlo <span className="text-brand">↗</span></button></div>
            <span className="whitespace-nowrap rounded border border-caution/40 px-2 py-1 font-mono text-xs text-caution">MÔ PHỎNG</span>
          </div>
          <ModelVisual model="monte" paused={paused} large />
          <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3 text-sm text-ink-muted">
            <span>Nhiều kịch bản. Một ngân sách rủi ro.</span>
            <button onClick={() => setPaused(!paused)} aria-pressed={paused} className="px-1 text-sm text-ink-muted hover:text-ink">{paused ? "▶ Tiếp tục" : "Ⅱ Tạm dừng"}</button>
          </div>
          <div className="flex border-t border-line">
            {["hmm", "garch", "hurst"].map(id => { const m = homeModels.find(x => x.id === id)!; return <button key={id} onClick={() => setSelection(id)} className="flex-1 border-r border-line bg-panel px-2 py-3.5 text-sm text-ink-muted last:border-r-0 hover:bg-panel-raised hover:text-ink">{m.name} <span className="text-brand">↗</span></button>; })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <Section>
        <SectionHeader kicker="Vì sao cần kiểm định" title={<>Hơn 1.600 mã. Bạn cần <em>bằng chứng</em>, không cần thêm lời đồn.</>}
          lead="Phần lớn quyết định mua đến từ một cái tên nghe được và một nhịp tăng giá. QuanTik đặt mã đó qua cùng một quy trình kiểm tra, mỗi lần như nhau." />
        <div className="grid gap-5 md:grid-cols-3 max-sm:-mx-5 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:px-5 max-sm:pb-2 max-sm:[scrollbar-width:none] max-sm:[&>*]:w-[84%] max-sm:[&>*]:shrink-0 max-sm:[&>*]:snap-start">
          {benefits.map(([n, title, body]) => <article key={n} className="rounded-xl border border-line bg-panel p-7 max-md:p-5">
            <span className="font-mono text-sm text-signal">{n}</span>
            <h3 className="mb-2 mt-3 text-xl font-semibold text-ink">{title}</h3>
            <p className="m-0 text-base leading-relaxed text-ink-muted">{body}</p>
          </article>)}
        </div>
      </Section>

      {/* Process */}
      <Section id="home-process">
        <SectionHeader kicker="Cách hoạt động" title="Hiểu trước. Quyết định sau." lead="Ba bước, một báo cáo. Quyết định cuối cùng luôn thuộc về bạn." />
        <ol className="m-0 mb-12 grid list-none gap-5 p-0 md:grid-cols-3 max-sm:-mx-5 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:px-5 max-sm:pb-2 max-sm:[scrollbar-width:none] max-sm:[&>*]:w-[84%] max-sm:[&>*]:shrink-0 max-sm:[&>*]:snap-start">
          {steps.map(([title, body], i) => <li key={title} className="relative rounded-xl border border-line bg-panel p-7 max-md:p-5">
            <span className="grid size-10 place-items-center rounded-full bg-brand font-semibold text-brand-ink">{i + 1}</span>
            <h3 className="mb-2 mt-4 text-xl font-semibold text-ink">{title}</h3>
            <p className="m-0 text-base leading-relaxed text-ink-muted">{body}</p>
          </li>)}
        </ol>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="m-0 text-lg font-semibold text-ink">9 lớp kiểm tra bên trong</h3>
          <span className="text-sm text-ink-subtle">Bấm từng lớp để xem cách kiểm tra</span>
        </div>
        <div className="home-architecture grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-3">
          {inspectionStages.map(stage => <button key={stage[0]} onClick={() => setSelection(stage)} className="flex items-center gap-4 bg-panel px-5 py-4 text-left transition-colors hover:bg-panel-raised max-sm:gap-2 max-sm:px-3 max-sm:py-3">
            <span className="font-mono text-sm text-ink-subtle max-sm:text-xs">{stage[0]}</span><b className="text-base font-medium text-ink max-sm:text-sm">{stage[1]}</b><i aria-hidden="true" className="ml-auto not-italic text-brand max-sm:hidden">↗</i>
          </button>)}
        </div>
      </Section>

      {/* Sample report */}
      <Section id="home-sample">
        <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeader kicker="Báo cáo mẫu" title={<>Một báo cáo. <em>Bốn hướng hành động.</em></>} lead="Mỗi báo cáo kết thúc bằng một trong bốn kết luận, kèm lý do và điều kiện cụ thể." />
            <ul className="m-0 grid list-none gap-0 p-0">
              {outcomes.map(([code, label, desc, tone]) => <li key={code} className="grid grid-cols-[120px_1fr] gap-x-5 border-b border-line py-4 first:pt-0 max-sm:grid-cols-1 max-sm:gap-y-1">
                <span className="pt-1 font-mono text-xs text-ink-subtle">{code}</span>
                <div><b className={`text-lg font-semibold ${tone}`}>{label}</b><p className="m-0 mt-1 text-sm leading-relaxed text-ink-muted">{desc}</p></div>
              </li>)}
            </ul>
          </div>
          <SampleReport />
        </div>
      </Section>

      {/* Models */}
      <Section id="home-models">
        <SectionHeader kicker="Bên trong hệ thống" title="Nhìn thấy cơ chế, không phải hộp đen." lead="Mỗi mô hình ghi rõ đầu vào, đầu ra và giới hạn áp dụng."
          aside={<button onClick={() => setPaused(!paused)} aria-pressed={paused} className={`${buttonStyles.secondary} min-h-10 text-sm`}>{paused ? "▶ Tiếp tục mô phỏng" : "Ⅱ Tạm dừng mô phỏng"}</button>} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-sm:-mx-5 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:px-5 max-sm:pb-2 max-sm:[scrollbar-width:none] max-sm:[&>*]:w-[84%] max-sm:[&>*]:shrink-0 max-sm:[&>*]:snap-start">
          {models.map(m => <article key={m.id} className={`home-model-card overflow-hidden rounded-xl border border-line bg-panel ${m.soon ? "home-future" : ""}`}>
            <div className="flex justify-between gap-3 border-b border-line px-5 py-3 font-mono text-xs text-ink-subtle"><span>{m.code}</span><span className={m.soon ? "text-caution" : ""}>{m.soon ? "SẮP RA MẮT" : m.type + " / MINH HỌA"}</span></div>
            <ModelVisual model={m.id} paused={paused || m.soon} />
            <div className="border-t border-line p-6 max-md:p-5">
              <span className={`text-sm ${m.soon ? "text-caution" : "text-signal"}`}>{m.tag}</span>
              <h3 className="mb-2 mt-1"><button onClick={() => setSelection(m.id)} className="flex w-full items-center justify-between gap-3 text-left text-xl font-semibold text-ink">{m.name}<i aria-hidden="true" className="not-italic text-brand">↗</i></button></h3>
              <p className="m-0 mb-4 text-base leading-relaxed text-ink-muted">{m.description}</p>
              <button onClick={() => setSelection(m.id)} className="text-sm text-ink-muted hover:text-brand">{m.soon ? "Xem tính năng dự kiến →" : "Hiểu mô hình →"}</button>
            </div>
          </article>)}
        </div>
        {!allModels && <div className="mt-8 text-center"><button onClick={() => setAllModels(true)} className={buttonStyles.secondary}>Xem thêm {homeModels.length - 3} mô hình</button></div>}
      </Section>

      {/* Pricing */}
      <Section id="home-pricing">
        <SectionHeader kicker="Bảng giá" title={<>Rẻ hơn <em>một lệnh mua sai.</em></>} lead="Một gói, đủ để kiểm định mọi mã bạn quan tâm mỗi ngày." />
        <PricingTeaser />
      </Section>

      {/* FAQ */}
      <Section id="home-faq">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="self-start lg:sticky lg:top-24"><SectionHeader kicker="Câu hỏi thường gặp" title="Trước khi bạn bắt đầu." /></div>
          <div className="divide-y divide-line rounded-xl border border-line bg-panel">
            {faqs.map(([q, a]) => <details key={q} className="group px-6 max-md:px-4" onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open) track("faq_open", { question: q }); }}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-medium text-ink [&::-webkit-details-marker]:hidden max-md:text-base">{q}<span aria-hidden="true" className="text-2xl leading-none text-brand transition-transform group-open:rotate-45">+</span></summary>
              <p className="m-0 pb-5 text-base leading-relaxed text-ink-muted">{a}</p>
            </details>)}
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="border-t border-line bg-[radial-gradient(ellipse_at_center,#4e7c3422,transparent_65%)] px-5 py-24 text-center max-md:py-16">
        <Kicker>Vốn của bạn. Quyết định của bạn.</Kicker>
        <h2 className="mx-auto mb-8 mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight max-md:text-3xl">Bắt đầu từ mã bạn đang quan tâm.</h2>
        <InspectForm id="home-symbol-bottom" onInspect={inspect} compact />
        <p className="m-0 mt-5 text-sm text-ink-subtle">Hoặc <button onClick={() => scrollTo("home-pricing")} className="text-ink-muted underline underline-offset-4 hover:text-brand">xem bảng giá</button></p>
      </section>
    </main>

    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-start justify-between gap-6 px-7 py-10 text-sm text-ink-subtle max-md:flex-col max-md:px-5">
        <div className="max-w-md">
          <span className="text-lg font-semibold text-ink">Quan<span className="text-brand">Tik</span></span>
          <p className="m-0 mt-2 leading-relaxed">QuanTik cung cấp công cụ phân tích định lượng, không phải khuyến nghị đầu tư. Hình minh họa trên trang mô tả cơ chế; kết quả thực tế xem trong ứng dụng.</p>
        </div>
        <nav aria-label="Liên kết cuối trang" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/plans" className="hover:text-ink">Bảng giá</Link>
          <Link href="/dashboard" className="hover:text-ink">Thị trường</Link>
          <Link href="/login" className="hover:text-ink">Đăng nhập</Link>
          <button onClick={() => window.scrollTo({ top: 0 })} className="hover:text-ink">Về đầu trang ↑</button>
        </nav>
      </div>
    </footer>
    {selection && <Explanation selection={selection} paused={paused} onClose={() => setSelection(null)} />}
  </div>;
}
