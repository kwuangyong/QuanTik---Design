"use client";
import Link from "next/link";
import { ArrowUpRight, CircleHelp } from "lucide-react";
import { sheetColumns, type SheetColumn } from "@/content/screening-sheet";
import { analysisMessages } from "@/lib/api/analysis";
import type { ScreeningItem } from "@/lib/api/screening";
import TermHint from "./term-hint";
import styles from "./screener.module.css";

const nf = (value: number, digits = 2) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(value);
const actionLabels: Record<string, string> = { BUY_NOW: "Mua ngay", BUY_SETUP: "Canh mua", WATCH: "Theo dõi", AVOID: "Tránh", SELL: "Bán" };
const textKeys = new Set(["gate_reasons", "data_quality_flags", "commentary"]);

function valueOf(item: ScreeningItem, column: SheetColumn) {
  const value = item[column.key];
  if (value == null || value === "") return null;
  if (column.format === "boolean") return typeof value === "boolean" ? value : null;
  if (["number", "pct", "price", "billions", "sessions"].includes(column.format)) {
    return typeof value === "number" && Number.isFinite(value) && (column.format !== "price" || value > 0) ? value : null;
  }
  return typeof value === "string" || Array.isArray(value) && value.every(v => typeof v === "string") ? value : null;
}
function display(value: NonNullable<ReturnType<typeof valueOf>>, column: SheetColumn) {
  if (typeof value === "boolean") return value ? "Đã đạt" : "Chưa đạt";
  if (Array.isArray(value)) return value.length ? value.map(v => analysisMessages[v] || v).join(" · ") : column.key === "data_quality_flags" ? "Không có cảnh báo" : "Không có điều kiện chặn";
  if (typeof value === "number") {
    const n = column.format === "billions" ? value / 1e9 : value;
    return nf(n, ["price", "sessions"].includes(column.format) || column.key === "capacity_shares" ? 0 : 2) + (column.format === "pct" ? "%" : column.format === "sessions" ? " phiên" : "");
  }
  return column.key === "action" ? actionLabels[value] || value : value;
}
function Cell({ item, column }: { item: ScreeningItem; column: SheetColumn }) {
  const value = valueOf(item, column);
  if (value == null) return <span className={styles.missing} aria-label="Chưa có dữ liệu">—</span>;
  const content = display(value, column);
  if (textKeys.has(column.key)) return <details className={styles.cellDetail}><summary>{column.key === "commentary" ? "Đọc nhận xét" : column.key === "gate_reasons" ? "Xem điều kiện" : "Xem cảnh báo"}<span>{content}</span></summary><p>{content}</p></details>;
  const badge = column.key === "action" || column.key === "gate_pass" || column.key === "data_quality_status";
  const favorable = value === true || value === "BUY_NOW" || value === "PASS";
  const adverse = value === false || value === "AVOID" || value === "FAIL" || value === "SELL";
  const numericTone = typeof value === "number" && ["net_forecast_pct", "ensemble_return_pct", "gross_forecast_pct", "annual_return_pct", "sector_return_20d_pct"].includes(column.key);
  const tone = favorable || numericTone && Number(value) > 0 ? styles.positive : adverse || numericTone && Number(value) < 0 ? styles.negative : "";
  return <span className={`${badge ? styles.badge : ""} ${tone} ${column.key === "score" ? styles.quantScore : ""}`}>{content}</span>;
}

function Value({ item, column }: { item: ScreeningItem; column: SheetColumn }) {
  return <div data-sheet-key={column.key}><Cell item={item} column={column}/></div>;
}

export function ScreeningSheet({ kind, title, description, items, loading, onSelect }: {
  kind: "opportunity" | "caution"; title: string; description: string; items: ScreeningItem[];
  loading: boolean; onSelect: (item: ScreeningItem) => void;
}) {
  return <section className={`${styles.tableSection} ${styles[kind]}`} aria-label={title}>
    <div className={styles.heading}><div><span className={styles.sheetEyebrow}>{kind === "opportunity" ? "CƠ HỘI TRONG PHIÊN" : "KIỂM SOÁT RỦI RO"}</span><h3>{title}</h3><p>{description}</p></div><span className={styles.rowCount}><b>{items.length.toString().padStart(2, "0")}</b> / 05 mã</span></div>
    <div className={styles.tableFrame} aria-busy={loading}>
      <div className={`${styles.scroll} ${styles.sheetScroll}`} tabIndex={0} role="region" aria-label={`${title} · cuộn ngang để xem đầy đủ`}>
        <table className={`${styles.table} ${styles.sheet}`} style={{ width: `calc(var(--screening-identity-width, 220px) + ${sheetColumns.slice(1).reduce((sum, column) => sum + (textKeys.has(column.key) ? 260 : 160), 0)}px)` }}>
          <caption className={styles.srOnly}>{title}: 42 cột theo đúng thứ tự Google Sheet lọc cổ phiếu. Bấm tiêu đề cột để xem định nghĩa và cách tính. Giá VND, tỷ suất phần trăm, GTGD tỷ VND.</caption>
          <colgroup><col className={styles.identityCol}/>{sheetColumns.slice(1).map(column => <col key={column.key} className={textKeys.has(column.key) ? styles.wideCol : styles.metricCol}/>)}</colgroup>
          <thead>
            <tr className={styles.columnRow}>{sheetColumns.map(column => <th key={column.key} scope="col" data-sheet-group={sheetColumns.find(c => c.group === column.group)?.key === column.key ? column.group : undefined}><TermHint id={column.definition.id} definition={column.definition}>{column.label} <CircleHelp size={11}/></TermHint>{column.format === "price" && <span className={styles.unitNote}>VND</span>}</th>)}</tr>
          </thead>
          <tbody>{items.map((item, index) => <tr key={item.symbol}>
            <th scope="row"><div className={styles.symbolLine}><small>{String(index + 1).padStart(2, "0")}</small><button className={styles.symbol} onClick={() => onSelect(item)}>{item.symbol}</button><Link className={styles.quantAction} href={`/analysis?symbol=${encodeURIComponent(item.symbol)}`} aria-label={`Kích hoạt phân tích quant chi tiết ${item.symbol}`} title="Phân tích Quant chi tiết"><ArrowUpRight size={13}/></Link></div><span className={styles.companyName}>{item.company_name?.trim() || item.name?.trim() || ""}</span></th>
            {sheetColumns.slice(1).map(column => <td key={column.key} data-sheet-column={column.key} className={textKeys.has(column.key) || column.format === "text" ? styles.textCell : undefined}><Value item={item} column={column}/></td>)}
          </tr>)}</tbody>
        </table>
      </div>
      {!items.length && <p role="status" className={styles.empty}>Chưa có mã phù hợp trong nhóm này.</p>}
    </div>
    <div className={styles.sheetFooter}><span>42 cột · Đúng thứ tự Google Sheet · Cuộn ngang để xem toàn bộ <span aria-hidden="true">↔</span></span><span><CircleHelp size={13}/> Bấm tên cột để xem định nghĩa & cách tính</span></div>
  </section>;
}
