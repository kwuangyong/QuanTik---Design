import type { ReactNode } from "react";
import type { AnalysisReport } from "@/lib/api/analysis";
import { buildGlance, type GlanceNumber, type GlanceTone } from "@/lib/quant-glance";
import { LEGAL_PLACEHOLDER } from "@/lib/quant-glossary";
import { QuantTerm } from "./quant-term";
import styles from "./quant-glance.module.css";

// "Tóm tắt" layer (30 seconds). Renders on the server too; only the tooltip buttons are interactive.
const glyph: Record<GlanceTone, ReactNode> = {
  ok: <svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="currentColor"/></svg>,
  neutral: <svg viewBox="0 0 14 14" aria-hidden="true"><rect x="2.5" y="2.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>,
  caution: <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.8 13 12H1z" fill="currentColor"/></svg>,
  risk: <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1 13 7 7 13 1 7z" fill="currentColor"/></svg>,
  nodata: <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>,
};
export function QuantChip({ tone, children }: { tone: GlanceTone; children: ReactNode }) {
  return <span className={`${styles.chip} ${styles[tone]}`}>{glyph[tone]}<span className={styles.sr}>Trạng thái: </span>{children}</span>;
}

export function QuantGlance({ report, onOpenWhy, onOpenPlan }: { report: AnalysisReport; onOpenWhy?: () => void; onOpenPlan?: () => void }) {
  const g = buildGlance(report), { verdict, risk } = g;
  const slot = (term: string) => g.slots[term];
  const term = (id: string, label: ReactNode) => id ? <QuantTerm id={id} values={slot(id)}>{label}</QuantTerm> : label;
  const figure = (n: GlanceNumber, key?: string) => <div key={key ?? n.id} className={styles.fig} data-glance-number={n.id} data-available={n.available}>
    <dt>{term(n.term, n.label)}</dt><dd className={n.available ? undefined : styles.empty}>{n.value}</dd><small>{n.note}</small>
  </div>;
  const filled = risk.frequency ? Math.min(100, risk.frequency.perHundred) : 0;
  return <section aria-label="Tóm tắt 30 giây" className={styles.glance} data-quant-glance data-glance-state={verdict.available ? "ready" : "missing"}>
    <div className={styles.top}>
      <article className={`${styles.card} ${styles.verdict} ${styles[`rail_${verdict.tone}`]}`} aria-labelledby="quant-glance-verdict">
        <p className={styles.eyebrow}>KẾT LUẬN HÔM NAY · {g.symbol}</p>
        <QuantChip tone={verdict.tone}>{verdict.chip}</QuantChip>
        <h2 id="quant-glance-verdict" className={styles.h2}>{verdict.title}</h2>
        <p className={styles.lead}>{verdict.lead}</p>
        <div className={styles.risk} data-glance-risk aria-label="Rủi ro nổi bật">
          <span className={styles.label}>Rủi ro nổi bật</span>
          {risk.frequency || risk.history != null ? <>
            {risk.frequency && <span className={styles.riskRow}>
              <span className={styles.riskText}>Trong mô phỏng, khoảng <b className={styles.num}>{risk.frequency.perHundredText}</b> trong mỗi 100 lần{risk.frequency.simulations != null ? <> (từ <span className={styles.num}>{risk.frequency.simulations.toLocaleString("vi-VN")}</span> lần mô phỏng)</> : <> (số lần mô phỏng chưa công bố)</>} lỗ hơn 3% khi chờ cổ phiếu về <span className={styles.badge}>{LEGAL_PLACEHOLDER}: T+</span>. <QuantTerm id="monte_carlo" values={slot("monte_carlo")}>Mô phỏng là gì?</QuantTerm></span>
              <span className={styles.dots} role="img" aria-label={`${filled} chấm đậm trên 100 chấm, mỗi chấm là 1 trong 100 lần`}>{Array.from({ length: 100 }, (_, i) => <i key={i} className={i < filled ? styles.on : undefined} style={{ ["--row" as string]: Math.floor(i / 10) }}/>)}</span>
            </span>}
            {risk.history != null && <span className={styles.riskText}>Lịch sử từng giảm tới <b className={styles.num}>{risk.history.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%</b> từ đỉnh trong giai đoạn quan sát. {term("max_drawdown", "Sụt giảm tối đa là gì?")}</span>}
          </> : <span className={styles.riskText}>Chưa đủ dữ liệu để nêu rủi ro nổi bật. Không có nghĩa là không có rủi ro.</span>}
        </div>
        <dl className={styles.figs} aria-label="Các số chính">{g.numbers.map(n => figure(n))}</dl>
        <div className={styles.cta}>
          <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={onOpenPlan}>Xem kế hoạch có điều kiện</button>
          <button type="button" className={styles.btn} onClick={onOpenWhy}>Vì sao có kết luận này</button>
        </div>
        <p className={styles.disc}>Thông tin phân tích tham khảo từ mô hình, không phải lời khuyên đầu tư. Quyết định và rủi ro thuộc về bạn. <span className={styles.badge}>[chờ rà soát pháp lý VN]</span></p>
      </article>
      <aside className={`${styles.card} ${styles.trust}`} aria-labelledby="quant-glance-trust" data-glance-trust>
        <p className={styles.eyebrow}>DẢI TIN CẬY</p>
        <h3 id="quant-glance-trust" className={styles.h3}>Có tin được báo cáo không?</h3>
        <ul>{g.trust.map(t => <li key={t.id} data-trust={t.id}><span>{term(t.term, t.label)}</span><span className={styles.tv}>{t.id !== "asof" && <QuantChip tone={t.tone}>{t.chip}</QuantChip>} <span className={styles.num}>{t.value}</span></span></li>)}</ul>
        <p className={styles.disc}>Độ phủ dưới 100% nghĩa là còn mô hình chưa tham gia, nên kết luận kém chắc hơn. Chi tiết ở lớp Chuyên sâu.</p>
      </aside>
    </div>
    <h2 className={styles.sr}>Bốn nhóm câu hỏi, thứ tự đọc: Rủi ro, Hiện trạng, Triển vọng, Mua bán</h2>
    <ol className={styles.groups} aria-label="Bốn nhóm câu hỏi">
      {g.groups.map(group => <li key={group.id} className={`${styles.card} ${styles.group} ${styles[`rail_${group.tone}`]}`} data-glance-group={group.id}>
        <div className={styles.gh}><span className={styles.order}>{group.id}</span><QuantChip tone={group.tone}>{group.chip}</QuantChip></div>
        <h3 className={styles.h3}>{group.title}</h3>
        <p className={styles.q}>{group.question}</p>
        <dl>{figure(group.figure, `${group.id}-fig`)}</dl>
        <p className={styles.more}>{group.coverage}</p>
      </li>)}
    </ol>
  </section>;
}
