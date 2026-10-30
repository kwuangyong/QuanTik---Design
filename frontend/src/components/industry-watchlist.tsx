"use client";
import Link from "next/link";
import columns from "@/content/industry-watchlist.json";
import styles from "./screener.module.css";
import { watchlistGroupCounts } from "@/lib/screening-reference";

// An explicitly supplied reference list, not live prices or model recommendations.
export function IndustryWatchlist() {
  const rowCount = Math.max(...columns.map(column => column.symbols.length));
  return <section className={styles.tableSection} aria-label="Watchlist theo ngành">
    <div className={styles.heading}><div><h3>Watchlist theo ngành</h3><p>Danh sách từ Watchlist.xlsx bạn cung cấp · Giữ nguyên nhóm, thứ tự mã và ô trống.</p></div><span className={styles.hint}>{columns.length} nhóm · Không phải dữ liệu giá trực tiếp</span></div>
    <p className={styles.hint}>{watchlistGroupCounts.sectors} nhóm ngành · {watchlistGroupCounts.thematic} rổ theo dõi / chuyên đề. Một mã có thể thuộc nhiều nhóm; các rổ theo dõi không thay cho phân ngành trong kết quả Quant.</p>
    <div className={styles.tableFrame}><div className={`${styles.scroll} ${styles.watchlistScroll}`} tabIndex={0} role="region" aria-label="Bảng Watchlist; cuộn ngang để xem tất cả nhóm">
      <table className={`${styles.table} ${styles.watchlist}`}><caption className={styles.srOnly}>Mỗi cột là một nhóm ngành hoặc rổ theo dõi trong Watchlist.xlsx. Bấm mã để mở phân tích Quant.</caption>
        <thead><tr><th scope="col">STT</th>{columns.map(column => <th key={column.column} scope="col">{column.name}</th>)}</tr></thead>
        <tbody>{Array.from({ length: rowCount }, (_, index) => <tr key={index}><th scope="row">{index + 1}</th>{columns.map(column => <td key={column.column}>{column.symbols[index] ? <Link href={`/analysis?symbol=${encodeURIComponent(column.symbols[index])}`}>{column.symbols[index]}</Link> : null}</td>)}</tr>)}</tbody>
      </table>
    </div></div>
  </section>;
}
