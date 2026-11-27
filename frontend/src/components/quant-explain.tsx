import type { AnalysisReport } from "@/lib/api/analysis";
import { buildExplain, type ExplainCard } from "@/lib/quant-explain";
import { buildGlance } from "@/lib/quant-glance";
import { miniFigure } from "@/lib/quant-visual";
import { FigureView } from "./quant-visual";
import { QuantChip } from "./quant-glance";
import { QuantTerm } from "./quant-term";
import glance from "./quant-glance.module.css";
import styles from "./quant-explain.module.css";

// "Hiểu vì sao" layer (3 minutes): groups in the order C, A, B, D, then the trust strip; one 4-part card per module.
// Text comes only from lib/quant-explain.ts. Each card opens the matching module in the "Chuyên sâu" layer.
export function QuantExplain({ report, onOpenModule, onOpenSummary }: { report: AnalysisReport; onOpenModule?: (module: string) => void; onOpenSummary?: () => void }) {
  const groups = buildExplain(report), slots = buildGlance(report).slots;
  const term = (id: string | undefined, label: string) => id ? <QuantTerm id={id} values={slots[id]}>{label}</QuantTerm> : label;
  const card = (c: ExplainCard) => {
    // A small figure only for a card that has a result; failed, disabled or missing modules draw nothing.
    const fig = (c.state === "ready" || c.state === "partial") && c.tone !== "nodata" ? miniFigure(report, c.module) : null;
    return <article key={c.module} className={styles.mod} data-explain-module={c.module} data-explain-state={c.state} data-explain-tone={c.tone} aria-labelledby={`explain-${c.module}`}>
    <div className={styles.mh}>
      <QuantChip tone={c.tone}>{c.chip}</QuantChip>
      {c.badge && <span className={glance.badge}>{c.badge}</span>}
      <span className={styles.no} aria-label={`Module số ${c.no}`}>{c.no}</span>
    </div>
    <h3 id={`explain-${c.module}`}>{c.title}<small>{c.tech}</small></h3>
    <p className={styles.verdict}><span className={glance.sr}>Kết luận: </span>{c.verdict}</p>
    {fig && <div className={styles.fig} data-explain-figure={c.module}><FigureView fig={fig} size="mini"/></div>}
    <dl className={styles.nums} aria-label="Các số chính">{c.numbers.map(n => <div key={n.label}><dt>{term(n.term, n.label)}</dt><dd className={n.value === "—" ? styles.empty : undefined}>{n.value}{n.ref && <small>{n.ref}</small>}</dd></div>)}</dl>
    <details className={styles.more} data-explain-more={c.module}><summary>Vì sao và lưu ý</summary>
      <p className={styles.part}><span className={styles.lab}>Vì sao</span>{c.why}</p>
      <p className={styles.caut}><span className={styles.lab}>Lưu ý</span>{c.caution}</p>
    </details>
    <button type="button" className={styles.open} data-explain-open={c.module} onClick={() => onOpenModule?.(c.module)}>Xem chi tiết ở lớp Chuyên sâu<span className={glance.sr}>: {c.title}</span></button>
  </article>;
  };
  return <section aria-label="Hiểu vì sao" className={styles.explain} data-quant-explain>
    <header className={styles.head}><h2>Hiểu vì sao</h2><p>Đọc theo thứ tự rủi ro, hiện trạng, triển vọng rồi mới đến mua bán. Mỗi thẻ có kết luận, một hình nhỏ và ba số chính; phần vì sao và lưu ý mở khi cần.</p></header>
    {groups.map(g => <details key={g.id} className={styles.group} id={`explain-group-${g.id}`} data-explain-group={g.id} open>
      <summary><span className={styles.gt}>{g.id === "T" ? "" : `${g.id}. `}{g.title}</span><span className={styles.gq}>{g.question}</span><svg className={styles.car} viewBox="0 0 18 18" aria-hidden="true"><path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg></summary>
      <div className={styles.grid}>{g.cards.map(card)}</div>
    </details>)}
    <div className={styles.back}><button type="button" className={styles.open} onClick={onOpenSummary}>Quay lại Tóm tắt</button></div>
    <p className={glance.disc}>Thông tin phân tích tham khảo từ mô hình, không phải lời khuyên đầu tư. Quyết định và rủi ro thuộc về bạn.</p>
  </section>;
}
