"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { QuantResearch } from "@/lib/api/analysis";
import { number } from "@/lib/quant-reader";
import styles from "./quant-simple.module.css";

type Point = [number, number, number];
type Project = (point: Point) => string;
const states = [["BULL", "Tăng", "var(--positive)"], ["SIDEWAY", "Đi ngang", "var(--neutral)"], ["BEAR", "Giảm", "var(--negative)"]] as const;

function Space({ title, description, children }: { title: string; description: string; children: (project: Project) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null), drag = useRef<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(540), [yaw, setYaw] = useState(-.5), [pitch, setPitch] = useState(.5);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setWidth(Math.max(240, node.clientWidth)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const rotate = (x: number, y = 0) => {
    setYaw(value => Math.max(-1.1, Math.min(1.1, value + x)));
    setPitch(value => Math.max(.1, Math.min(.9, value + y)));
  };
  const project: Project = ([x, y, z]) => {
    const horizontal = x * Math.cos(yaw) - z * Math.sin(yaw), depth = x * Math.sin(yaw) + z * Math.cos(yaw);
    return `${width / 2 + horizontal * width * .26},${185 + depth * 60 * Math.sin(pitch) - y * 72 * Math.cos(pitch)}`;
  };
  const line = (a: Point, b: Point) => `${project(a)} ${project(b)}`;
  return <div ref={ref} className={styles.space}>
    <div className={styles.spaceTools}><span>Kéo hoặc dùng phím mũi tên để xoay</span><button className={styles.smallButton} onClick={() => { setYaw(-.5); setPitch(.5); }}>Đặt lại góc nhìn</button></div>
    <svg role="img" tabIndex={0} aria-label={title} viewBox={`0 0 ${width} 250`} className={styles.scene}
      onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault(); rotate(event.key === "ArrowLeft" ? -.12 : event.key === "ArrowRight" ? .12 : 0, event.key === "ArrowUp" ? .08 : event.key === "ArrowDown" ? -.08 : 0);
      }}
      onPointerDown={event => { drag.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => {
        if (!drag.current) return;
        rotate((event.clientX - drag.current.x) * .007, event.pointerType === "mouse" ? (event.clientY - drag.current.y) * .004 : 0);
        drag.current = { x: event.clientX, y: event.clientY };
      }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      <title>{title}</title><desc>{description}</desc>
      <g fill="none" stroke="var(--border)" strokeWidth="1">{[-1, -.5, 0, .5, 1].map(value => <g key={value}><polyline points={line([value, 0, -1], [value, 0, 1])}/><polyline points={line([-1, 0, value], [1, 0, value])}/></g>)}<polyline points={line([-1, 0, -1], [-1, 2, -1])}/></g>
      {children(project)}
    </svg>
    <details className={styles.reading}><summary>Chỉnh góc xoay</summary><label className={styles.rotateControl}>Góc xoay<input aria-label={`Góc xoay ${title}`} type="range" min={-1.1} max={1.1} step={.01} value={yaw} onChange={event => setYaw(Number(event.target.value))}/></label></details>
  </div>;
}

/** Render reported percentile curves, never invent individual simulation paths. */
export function ScenarioSpace({ rows, symbol, selected }: { rows: QuantResearch["cone"]; symbol: string; selected: number }) {
  const keys = ["p05", "p25", "p50", "p75", "p95"] as const;
  const minimum = Math.min(...rows.map(row => row.p05)), maximum = Math.max(...rows.map(row => row.p95));
  const pad = Math.max((maximum - minimum) * .08, maximum * .005, 1);
  const point = (index: number, layer: number): Point => [
    -1 + (rows[index].session - rows[0].session) / (rows.at(-1)!.session - rows[0].session) * 2,
    (rows[index][keys[layer]] - minimum + pad) / (maximum - minimum + 2 * pad) * 1.8,
    -1 + layer * .5,
  ];
  return <>
    <Space title={`Dải kịch bản 3D ${symbol}`} description="Ngang là số phiên, cao là giá theo VND, sâu là các phân vị từ 5% đến 95% của cùng mô phỏng trong báo cáo.">
      {project => <>
        {[0, 1, 2, 3].map(layer => <polygon key={layer} points={[...rows.map((_, i) => project(point(i, layer))), ...rows.map((_, i) => project(point(i, layer + 1))).reverse()].join(" ")} fill="var(--positive)" fillOpacity={.08 + layer * .02} stroke="none"/>)}
        {keys.map((key, layer) => <polyline key={key} points={rows.map((_, i) => project(point(i, layer))).join(" ")} fill="none" stroke={layer === 2 ? "var(--accent)" : "var(--positive)"} opacity={layer === 2 ? 1 : .55} strokeWidth={layer === 2 ? 3 : 1.5}/>) }
        <polyline data-testid="scenario-slice" points={keys.map((_, layer) => project(point(selected, layer))).join(" ")} fill="none" stroke="var(--text)" strokeWidth="2" strokeDasharray="4 4"/>
        <g fill="var(--muted)" fontSize="11"><text x="12" y="24">Giá (VND)</text><text x="12" y="42">{number(minimum)} → {number(maximum)}</text><text x="12" y="240">Phiên +{rows[0].session} → +{rows.at(-1)!.session}</text></g>
      </>}
    </Space>
    <p className={styles.copy}>Chiều ngang: số phiên · Chiều cao: giá · Chiều sâu: các lớp giá của mô phỏng.</p>
    <div className={styles.legend}><span><i className={styles.greenDot}/>Các lớp giá của mô phỏng</span><span><i className={styles.orangeDot}/>Mốc giữa</span><span>Đường đứt: phiên đang xem</span></div>
  </>;
}

export function StateSpace({ probabilities, symbol }: { probabilities: Record<"BULL" | "SIDEWAY" | "BEAR", number>; symbol: string }) {
  return <>
    <Space title={`Trạng thái thị trường 3D ${symbol}`} description="Chiều cao ba cột là xác suất phân loại tăng, đi ngang và giảm do HMM trong báo cáo trả về, theo thang 0 đến 100%.">
      {project => <>{states.map(([key, label, color], index) => {
        const x = -.8 + index * .8, w = .22, h = probabilities[key] / 100 * 1.8;
        const front: Point[] = [[x-w, 0, .25], [x+w, 0, .25], [x+w, h, .25], [x-w, h, .25]];
        const side: Point[] = [[x+w, 0, -.25], [x+w, 0, .25], [x+w, h, .25], [x+w, h, -.25]];
        const top: Point[] = [[x-w, h, -.25], [x+w, h, -.25], [x+w, h, .25], [x-w, h, .25]];
        return <g key={key}><title>{label}: {number(probabilities[key])}%</title><polygon points={front.map(project).join(" ")} fill={color} fillOpacity=".7"/><polygon points={side.map(project).join(" ")} fill={color} fillOpacity=".35"/><polygon points={top.map(project).join(" ")} fill={color} fillOpacity=".9"/></g>;
      })}<text x="12" y="24" fill="var(--muted)" fontSize="11">Độ tin cậy phân loại · 0–100%</text></>}
    </Space>
    <dl className={styles.stateLegend}>{states.map(([key, label, color]) => <div key={key}><dt style={{ color }}>{label}</dt><dd>{number(probabilities[key])}%</dd></div>)}</dl>
  </>;
}
