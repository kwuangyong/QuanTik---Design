"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { needsText, type Figure, type Need, type ScaleRow, type Visual } from "@/lib/quant-visual";
import { number } from "@/lib/quant-reader";
import { reducedMotionNow } from "./quant-motion";
import s from "./quant-visual.module.css";

// SVG renderers for the V2 chart layer. Geometry is derived here from already validated figure data (lib/quant-visual.ts).
// Every figure has role="img" with an aria-label and a table alternative; motion runs once, on first view, and is off for reduced motion.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const PAD = 10;
const fin = (v: number) => (Number.isFinite(v) ? v : 0);
const r1 = (v: number) => Math.round(fin(v) * 10) / 10;
const frac = (v: number, lo: number, hi: number) => (hi > lo ? (v - lo) / (hi - lo) : 0.5);

function useFrame() {
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<"static" | "armed" | "run">("static"), [width, setWidth] = useState(320);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(240, Math.floor(el.clientWidth || 320)));
    measure();
    let resize: ResizeObserver | undefined, io: IntersectionObserver | undefined;
    try { if (typeof ResizeObserver !== "undefined") { resize = new ResizeObserver(measure); resize.observe(el); } } catch { /* fixed width */ }
    try {
      if (typeof IntersectionObserver !== "undefined" && !reducedMotionNow()) {
        setPhase("armed");
        io = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setPhase("run"); io?.disconnect(); } }, { threshold: 0.15 });
        io.observe(el);
      }
    } catch { setPhase("static"); }
    return () => { resize?.disconnect(); io?.disconnect(); };
  }, []);
  return { ref, phase, width };
}

function Scales({ rows, W }: { rows: ScaleRow[]; W: number }) {
  const rowH = 64, x0 = PAD + 4, x1 = W - PAD - 4, x = (r: ScaleRow, v: number) => r1(x0 + frac(v, r.min, r.max) * (x1 - x0));
  return <>{rows.map((r, i) => {
    const base = i * rowH, px = x(r, r.value), from = x(r, r.fillFrom ?? r.min), near = (v: number) => r.marks.some(m => Math.abs(frac(m.at, r.min, r.max) - frac(v, r.min, r.max)) < 0.2);
    return <g key={r.id} data-scale={r.id}>
      <text x={x0} y={base + 14}>{r.label}</text>
      <text x={x1} y={base + 14} textAnchor="end" className={s.val}>{r.text}</text>
      <rect x={x0} y={base + 28} width={r1(x1 - x0)} height="8" rx="4" className={s.track}/>
      {r.fillFrom != null && <rect x={r1(Math.min(from, px))} y={base + 28} width={r1(Math.abs(px - from))} height="8" className={`${s.fill} ${s.growx}`}/>}
      {r.marks.map(m => { const mx = x(r, m.at); return <g key={m.label}><line x1={mx} x2={mx} y1={base + 22} y2={base + 42} className={s.tick}/><text x={mx} y={base + 58} textAnchor={mx < x0 + 14 ? "start" : mx > x1 - 14 ? "end" : "middle"}>{m.label}</text></g>; })}
      {!near(r.min) && <text x={x0} y={base + 58}>{number(r.min)}</text>}
      {!near(r.max) && <text x={x1} y={base + 58} textAnchor="end">{number(Math.round(r.max * 100) / 100)}</text>}
      <g className={s.marker} style={{ transform: `translateX(${px}px)` }}><circle cx="0" cy={base + 32} r="7" className={s.marker}/></g>
    </g>;
  })}</>;
}

function Dots({ filled, total }: { filled: number; total: number }) {
  return <>{Array.from({ length: total }, (_, i) => <circle key={i} cx={8 + (i % 10) * 15} cy={8 + Math.floor(i / 10) * 15} r="5.5" className={i < filled ? s.dotOn : s.dotOff} style={{ ["--row" as string]: Math.floor(i / 10) }}/>)}</>;
}

function Ribbon({ v, W, pid }: { v: Extract<Visual, { kind: "ribbon" }>; W: number; pid: string }) {
  const sum = v.segments.reduce((a, b) => a + b.value, 0) || 1, x0 = PAD, width = W - 2 * PAD;
  let at = x0;
  const fills = [`var(--q-band)`, `url(#${pid}h)`, `url(#${pid}d)`];
  return <>
    <defs>
      <pattern id={`${pid}h`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="var(--surface)"/><line x1="0" y1="0" x2="0" y2="8" stroke="var(--q-band)" strokeWidth="3"/></pattern>
      <pattern id={`${pid}d`} width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="var(--surface)"/><circle cx="3.5" cy="3.5" r="1.6" fill="var(--q-band)"/></pattern>
    </defs>
    {v.segments.map((seg, i) => { const w = r1(seg.value / sum * width), x = r1(at); at += seg.value / sum * width; return <rect key={seg.id} x={x} y="4" width={w} height="26" fill={fills[i]} className={`${s.ribbonSeg} ${s.growx}`} data-state={seg.id}/>; })}
  </>;
}

function Ladder({ v, W }: { v: Extract<Visual, { kind: "ladder" }>; W: number }) {
  const lo = v.levels[0].price, hi = v.levels[v.levels.length - 1].price, x0 = PAD + 6, x1 = W - PAD - 6, y = 58;
  const x = (p: number) => r1(x0 + frac(p, lo, hi) * (x1 - x0)), by = Object.fromEntries(v.levels.map(l => [l.id, l.price]));
  return <>
    <rect x={x(by.sl)} y={y - 5} width={r1(x(by.entry) - x(by.sl))} height="10" className={`${s.down} ${s.growx}`}/>
    <rect x={x(by.entry)} y={y - 5} width={r1(x(by.tp2) - x(by.entry))} height="10" className={`${s.up} ${s.growx}`}/>
    {v.levels.map((l, i) => { const px = x(l.price), up = i % 2 === 0, anchor = px < x0 + 40 ? "start" : px > x1 - 40 ? "end" : "middle", ty = up ? y - 32 : y + 26;
      return <g key={l.id} data-level={l.id}><line x1={px} x2={px} y1={y - 12} y2={y + 12} className={s.tick}/><text x={px} y={ty} textAnchor={anchor}>{l.label}</text><text x={px} y={ty + 16} textAnchor={anchor} className={s.num}>{l.text}</text></g>; })}
  </>;
}

function Waterfall({ v, W }: { v: Extract<Visual, { kind: "waterfall" }>; W: number }) {
  const vals = v.bars.flatMap(b => [b.from, b.to, 0]), lo = Math.min(...vals), hi = Math.max(...vals), padv = Math.max((hi - lo) * 0.12, 0.01);
  const top = 30, bottom = 150, y = (val: number) => r1(bottom - frac(val, lo - padv, hi + padv) * (bottom - top)), col = (W - 2 * PAD) / v.bars.length;
  const cls = { up: s.up, down: s.down, ref: s.refc };
  return <>
    <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} className={s.axis}/>
    {v.bars.map((b, i) => { const cx = PAD + col * (i + 0.5), w = Math.min(70, col * 0.6), yt = Math.min(y(b.from), y(b.to)), h = Math.max(2, Math.abs(y(b.from) - y(b.to)));
      return <g key={b.id} data-bar={b.id}><rect x={r1(cx - w / 2)} y={yt} width={r1(w)} height={r1(h)} className={`${cls[b.tone]} ${s.growy}`} style={{ ["--i" as string]: i }}/><text x={r1(cx)} y={Math.max(14, yt - 6)} textAnchor="middle" className={s.val}>{b.text}</text><text x={r1(cx)} y="176" textAnchor="middle">{b.label}</text></g>; })}
  </>;
}

function Line({ v, W }: { v: Extract<Visual, { kind: "line" }>; W: number }) {
  const n = v.labels.length, L = v.unit === "VND" ? 64 : 48, R = 14, T = 14, laneH = v.regime ? 56 : 0, plotB = 186, H = plotB + laneH + 30;
  const all = [...v.series.flatMap(a => a.values), ...v.bands.flatMap(b => [...b.lo, ...b.hi]), ...(v.ref ? [v.ref.value] : []), ...(v.zero ? [0] : [])];
  const lo = Math.min(...all), hi = Math.max(...all), padv = Math.max((hi - lo) * 0.08, Math.abs(hi) * 0.001, 0.01);
  const x = (i: number) => r1(L + (n > 1 ? i / (n - 1) : 0) * (W - L - R)), y = (val: number) => r1(plotB - frac(val, lo - padv, hi + padv) * (plotB - T));
  const pts = (a: number[]) => a.map((val, i) => `${x(i)},${y(val)}`).join(" "), poly = (b: { lo: number[]; hi: number[] }) => `${pts(b.hi)} ${b.lo.map((val, i) => `${x(i)},${y(val)}`).reverse().join(" ")}`;
  const fmt = (val: number) => (v.unit === "VND" ? number(Math.round(val)) : number(Math.round(val * 100) / 100));
  const lanes = ["Pha tăng", "Đi ngang", "Pha giảm"], laneShort = ["Tăng", "Ngang", "Giảm"], step = (W - L - R) / Math.max(1, n - 1);
  return <>
    <text x={L} y="10">{v.unit}</text>
    {[0, 1, 2, 3].map(k => { const val = lo - padv + (hi - lo + 2 * padv) * k / 3; return <g key={k}><line x1={L} x2={W - R} y1={y(val)} y2={y(val)} className={s.grid}/><text x={L - 6} y={y(val) + 4} textAnchor="end">{fmt(val)}</text></g>; })}
    {v.bands.map(b => <polygon key={b.id} points={poly(b)} className={`${s.band} ${s.fade}`} opacity={b.strong ? 0.3 : 0.14}/>)}
    {v.zero && <><polygon points={`${x(0)},${y(0)} ${pts(v.series[0].values)} ${x(n - 1)},${y(0)}`} className={`${s.areaDown} ${s.fade}`}/><line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className={s.axis}/></>}
    {v.ref && <g><line x1={L} x2={W - R} y1={y(v.ref.value)} y2={y(v.ref.value)} className={s.refLine}/><text x={W - R} y={y(v.ref.value) - 5} textAnchor="end" className={s.refText}>{v.ref.label}</text></g>}
    {v.series.map(a => <polyline key={a.id} points={pts(a.values)} pathLength={a.dashed ? undefined : 1} className={a.dashed ? `${s.lineDash} ${s.fade}` : `${v.zero ? s.lineDown : s.lineMain} ${s.draw}`}/>)}
    {v.anchor != null && <circle cx={x(v.anchor)} cy={y(v.series[0].values[v.anchor])} r="5" className={s.marker}/>}
    {v.regime && lanes.map((lane, k) => <g key={lane} data-lane={lane}><rect x={L} y={plotB + 16 + k * 14} width={W - L - R} height="12" className={s.laneBg}/><text x={L - 6} y={plotB + 26 + k * 14} textAnchor="end">{laneShort[k]}</text>
      {v.regime!.map((st, i) => st === lane ? <rect key={i} x={r1(Math.max(L, x(i) - step / 2))} y={plotB + 16 + k * 14} width={r1(Math.max(1, Math.min(W - R, x(i) + step / 2) - Math.max(L, x(i) - step / 2)))} height="12" className={s.lane}/> : null)}</g>)}
    <text x={L} y={H - 6}>{v.labels[0]}</text><text x={W - R} y={H - 6} textAnchor="end">{v.labels[n - 1]}</text>
  </>;
}

function Bars({ v, W }: { v: Extract<Visual, { kind: "bars" }>; W: number }) {
  const L = 44, R = 14, T = 16, B = 150, H = 184, lo = v.bars[0].lo, hi = v.bars[v.bars.length - 1].hi, max = Math.max(...v.bars.map(b => b.pct), 1);
  const x = (val: number) => r1(L + (hi > lo ? (val - lo) / (hi - lo) : 0.5) * (W - L - R));
  return <>
    {[0, 0.5, 1].map(p => <g key={p}><line x1={L} x2={W - R} y1={B - p * (B - T)} y2={B - p * (B - T)} className={s.grid}/><text x={L - 6} y={B - p * (B - T) + 4} textAnchor="end">{number(Math.round(max * p * 10) / 10)}%</text></g>)}
    {v.bars.map((b, i) => { const h = b.pct / max * (B - T); return <rect key={i} x={x(b.lo) + 0.5} y={r1(B - h)} width={r1(Math.max(1, x(b.hi) - x(b.lo) - 1))} height={r1(h)} className={`${s.band} ${s.growy}`} opacity=".75"><title>{`${number(b.lo)}% đến ${number(b.hi)}%: ${number(b.pct)}%`}</title></rect>; })}
    {lo < 0 && hi > 0 && <line x1={x(0)} x2={x(0)} y1={T} y2={B} className={s.refLine}/>}
    <text x={L} y={H - 6}>{number(Math.round(lo * 10) / 10)}%</text><text x={W - R} y={H - 6} textAnchor="end">{number(Math.round(hi * 10) / 10)}%</text>
  </>;
}

function height(v: Visual): number {
  switch (v.kind) {
    case "scales": return v.rows.length * 64;
    case "dots": return 158;
    case "ribbon": return 34;
    case "ladder": return 112;
    case "waterfall": return 184;
    case "line": return 186 + (v.regime ? 56 : 0) + 30;
    case "bars": return 184;
    default: return 0;
  }
}

export function FigureView({ fig, size = "full" }: { fig: Figure; size?: "mini" | "full" }) {
  const { ref, phase, width } = useFrame(), pid = useId().replace(/[^a-zA-Z0-9]/g, ""), v = fig.visual, mini = size === "mini";
  const W = v.kind === "dots" ? 158 : width;
  let body: ReactNode = null;
  if (v.kind === "scales") body = <Scales rows={v.rows} W={W}/>;
  else if (v.kind === "dots") body = <Dots filled={v.filled} total={v.total}/>;
  else if (v.kind === "ribbon") body = <Ribbon v={v} W={W} pid={pid}/>;
  else if (v.kind === "ladder") body = <Ladder v={v} W={W}/>;
  else if (v.kind === "waterfall") body = <Waterfall v={v} W={W}/>;
  else if (v.kind === "line") body = <Line v={v} W={W}/>;
  else if (v.kind === "bars") body = <Bars v={v} W={W}/>;
  const H = height(v);
  return <figure ref={ref} className={`${s.fig} ${mini ? s.mini : ""}`} data-phase={phase} data-figure={fig.id} data-visual={v.kind}>
    {!mini && <p className={s.figTitle}>{fig.title}</p>}
    {v.kind === "facts"
      ? <dl className={s.facts} aria-label={fig.aria}>{v.rows.map(r => <div key={r.label}><dt>{r.label}</dt><dd>{r.text}</dd></div>)}</dl>
      : <svg className={s.svg} viewBox={`0 0 ${W} ${H}`} width={v.kind === "dots" ? W : undefined} role="img" aria-label={fig.aria}>{body}</svg>}
    {v.kind === "ribbon" && <>
      <span className={s.basis}>{v.basis}</span>
      <ul className={s.legend} aria-hidden="true">{v.segments.map((seg, i) => <li key={seg.id}><svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill={i === 0 ? "var(--q-band)" : `url(#${pid}${i === 1 ? "h" : "d"})`} stroke="var(--q-band)" strokeWidth="1.5"/></svg>{seg.label} <b>{seg.text}</b></li>)}</ul>
    </>}
    {v.kind === "ladder" && <ul className={s.legend}><li><span aria-hidden="true">▼</span> Phần lỗ tới cắt lỗ <b>{v.loss}</b></li><li><span aria-hidden="true">▲</span> Phần lãi tới mục tiêu 2 <b>{v.gain}</b></li></ul>}
    {fig.caption && <figcaption className={s.cap}>{fig.caption}</figcaption>}
    {fig.table && (mini
      ? <div className={s.sr}><table><caption>{fig.title}</caption><thead><tr>{fig.table.columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{fig.table.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>
      : <details className={s.tableBox}><summary>Xem bảng số</summary><div className={s.scroll}><table className={s.table}><caption className={s.sr}>{fig.title}</caption><thead><tr>{fig.table.columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{fig.table.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div></details>)}
  </figure>;
}

export function NeedsView({ needs }: { needs: Need[] }) {
  if (!needs.length) return null;
  return <ul className={s.needs} aria-label="Dữ liệu báo cáo chưa có">{needs.map(n => <li key={n.field} data-need={n.field}><strong>{needsText(n)}</strong><span>{n.what}</span></li>)}</ul>;
}
