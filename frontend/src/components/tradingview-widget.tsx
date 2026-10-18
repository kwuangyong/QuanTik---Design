"use client";
import { useEffect, useRef, useState } from "react";

const scripts = {
  chart: "embed-widget-advanced-chart.js",
  quotes: "embed-widget-market-quotes.js",
  market: "embed-widget-screener.js",
};

/** Each embed owns its DOM. An iframe appearing is not proof of price availability. */
export function TradingViewWidget({ kind, config, title, fallbackUrl }: {
  kind: keyof typeof scripts; config: Record<string, unknown>; title: string; fallbackUrl: string;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "frame" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const settings = JSON.stringify(config);
  useEffect(() => {
    const node = mount.current;
    if (!node) return;
    let disposed = false;
    setState("loading");
    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.cssText = "height:100%;width:100%";
    const target = document.createElement("div");
    target.className = "tradingview-widget-container__widget";
    target.style.cssText = "height:100%;width:100%";
    container.appendChild(target);
    node.replaceChildren(container);
    const observer = new MutationObserver(() => {
      const frame = container.querySelector("iframe");
      if (frame && !disposed) {
        frame.title = title;
        setState("frame");
        clearTimeout(timer);
        observer.disconnect();
      }
    });
    observer.observe(container, { childList: true, subtree: true });
    const timer = setTimeout(() => { if (!disposed) setState("error"); }, 20000);
    const script = document.createElement("script");
    script.src = `https://s3.tradingview.com/external-embedding/${scripts[kind]}`;
    script.async = true;
    script.textContent = settings;
    script.onerror = () => { if (!disposed) { clearTimeout(timer); setState("error"); } };
    container.appendChild(script);
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      script.onerror = null;
      container.remove();
    };
  }, [kind, settings, retry, title]);
  return <div data-tv-kind={kind} data-tv-state={state}>
    <div className="relative h-[560px] min-w-0 overflow-hidden bg-[var(--background)] max-[700px]:h-[500px]">
      {state === "loading" && <p role="status" className="absolute inset-x-0 top-6 z-10 text-center text-sm text-[var(--muted)]">Đang mở {title}…</p>}
      <div ref={mount} className="h-full w-full"/>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]">
      <span role="status">{state === "error" ? "Chưa tải được widget. Kiểm tra kết nối hoặc thử lại." : "Dữ liệu và quyền hiển thị do TradingView cung cấp."}</span>
      <div className="flex items-center gap-4"><button className="text-[var(--accent)] underline" onClick={() => setRetry(value => value + 1)}>Tải lại</button><a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">Mở trên TradingView ↗</a></div>
    </div>
    <div className="tradingview-widget-copyright px-4 pb-3 text-xs text-[var(--muted)]"><a href={fallbackUrl} rel="noopener nofollow" target="_blank">{title}</a> by <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">TradingView</a></div>
  </div>;
}
