"use client";
import { useId, useRef } from "react";
import { quantGlossary } from "@/lib/quant-glossary";
import { backendNeeds } from "@/lib/quant-visual";
import { QuantChip } from "./quant-glance";
import { useDialog } from "./quant-dialog";
import styles from "./quant-guide.module.css";

// "Cách đọc báo cáo" (G2-ux-spec 7.3): about one minute, 8 sections. Used as a drawer inside the report and as the page /analysis/guide.
// Glossary text comes only from quant-glossary.ts; legal/market entries keep their neutral placeholder.
export const guideSections: readonly { id: string; title: string }[] = [
  { id: "guide-1", title: "Báo cáo trả lời 4 câu hỏi nào" },
  { id: "guide-2", title: "Ba mức đọc" },
  { id: "guide-3", title: "Nhãn trạng thái nghĩa là gì" },
  { id: "guide-4", title: "Đọc rủi ro trước cơ hội" },
  { id: "guide-5", title: "Xác suất trong báo cáo" },
  { id: "guide-6", title: "Vì sao mô hình có thể sai" },
  { id: "guide-7", title: "Bảng thuật ngữ" },
  { id: "guide-8", title: "Miễn trừ trách nhiệm" },
];
const tones = [
  { tone: "ok", chip: "Ổn theo mốc", use: "Một kiểm tra cụ thể đã đạt, ví dụ dữ liệu qua kiểm tra hoặc thanh khoản đạt. Không dùng cho dự báo." },
  { tone: "neutral", chip: "Mô tả", use: "Module chỉ mô tả, hoặc chưa có mốc để phân loại tốt hay xấu." },
  { tone: "caution", chip: "Thận trọng", use: "Có điều kiện đáng chú ý, ví dụ cú sốc biến động kéo dài hoặc độ phủ mô hình dưới 100%." },
  { tone: "risk", chip: "Rủi ro cao", use: "Vượt một giới hạn cứng, ví dụ dữ liệu không đạt kiểm tra hoặc dự báo sau chi phí âm." },
  { tone: "nodata", chip: "Chưa đủ dữ liệu", use: "Báo cáo thiếu, tắt hoặc lỗi phần này. Không có nghĩa là an toàn." },
] as const;

export function QuantGuideBody({ headingLevel = 2, onReplayTour }: { headingLevel?: 1 | 2; onReplayTour?: () => void }) {
  const H = `h${headingLevel}` as "h1" | "h2", S = `h${headingLevel + 1}` as "h2" | "h3";
  return <div className={styles.body} data-quant-guide-body>
    <nav aria-label="Mục lục Cách đọc" className={styles.toc}>
      <ol>{guideSections.map(s => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ol>
    </nav>
    <H className={styles.lead}>Cách đọc báo cáo Quant trong 1 phút</H>
    <p className={styles.p}>Báo cáo là kết quả của mô hình trên dữ liệu quá khứ. Nó giúp bạn đặt câu hỏi đúng, không thay bạn quyết định.</p>
    {onReplayTour && <p className={styles.p}><button type="button" className={styles.btn} data-guide-replay onClick={onReplayTour}>Xem lại hướng dẫn 4 bước</button></p>}

    <section id="guide-1" aria-labelledby="guide-1-h"><S id="guide-1-h">1. Báo cáo trả lời 4 câu hỏi nào</S>
      <ul className={styles.list}>
        <li><b>Kết luận:</b> mô hình nói gì hôm nay?</li>
        <li><b>C. Rủi ro:</b> có thể mất bao nhiêu? Đọc nhóm này trước.</li>
        <li><b>A. Hiện trạng:</b> cổ phiếu đang thế nào?</li>
        <li><b>B. Triển vọng:</b> giá có thể đi đâu, theo mô hình?</li>
        <li><b>D. Mua bán:</b> nếu bạn hành động thì kế hoạch có điều kiện là gì? Đây không phải lệnh.</li>
      </ul>
      <p className={styles.p}>Cạnh đó có dải tin cậy: dữ liệu đầu vào có sạch không, bao nhiêu mô hình tham gia.</p>
    </section>

    <section id="guide-2" aria-labelledby="guide-2-h"><S id="guide-2-h">2. Ba mức đọc</S>
      <ul className={styles.list}>
        <li><b>Tóm tắt (30 giây):</b> kết luận, rủi ro nổi bật, bốn nhóm và dải tin cậy.</li>
        <li><b>Hiểu vì sao (3 phút):</b> mỗi module một thẻ: kết luận, vì sao, vài con số và lưu ý.</li>
        <li><b>Chuyên sâu:</b> toàn bộ 16 module, biểu đồ, bảng số và cách tính.</li>
      </ul>
      <p className={styles.p}>Bạn đổi mức đọc bất cứ lúc nào bằng ba nút ở đầu báo cáo. Lựa chọn được nhớ cho lần sau.</p>
    </section>

    <section id="guide-3" aria-labelledby="guide-3-h"><S id="guide-3-h">3. Nhãn trạng thái nghĩa là gì</S>
      <table className={styles.table}><thead><tr><th scope="col">Nhãn</th><th scope="col">Dùng khi</th></tr></thead>
        <tbody>{tones.map(t => <tr key={t.tone} data-guide-tone={t.tone}><th scope="row"><QuantChip tone={t.tone}>{t.chip}</QuantChip></th><td>{t.use}</td></tr>)}</tbody></table>
      <p className={styles.p}>Mỗi nhãn có biểu tượng và chữ, không chỉ có màu. Thẻ nhóm không bao giờ hiện nhãn xanh để một dòng xanh không bị đọc là gợi ý mua.</p>
    </section>

    <section id="guide-4" aria-labelledby="guide-4-h"><S id="guide-4-h">4. Đọc rủi ro trước cơ hội</S>
      <p className={styles.p}>Hãy xem bạn có thể mất bao nhiêu và trong tình huống nào, rồi mới xem giá có thể lên bao nhiêu. Một dự báo dương đi cùng rủi ro lớn vẫn là một kế hoạch rủi ro lớn.</p>
      <p className={styles.p}>Giá tăng hay giảm được tô màu riêng, chỉ trên số giá và đường giá. Màu đó không nói tốt hay xấu.</p>
    </section>

    <section id="guide-5" aria-labelledby="guide-5-h"><S id="guide-5-h">5. Xác suất trong báo cáo</S>
      <p className={styles.p}>Câu “khoảng 62 trong mỗi 100 lần, từ 1.000 lần mô phỏng” nghĩa là: trong 1.000 đường giá mà máy tạo ra theo giả định về dao động, khoảng 62% có giá cuối kỳ cao hơn hôm nay.</p>
      <p className={styles.p}><b>Không phải</b> xác suất bạn có lãi, không phải xác suất giá chạm mục tiêu trước khi chạm cắt lỗ, và không phải 100 giao dịch thật. Điểm Quant và độ đồng thuận cũng không phải xác suất lãi.</p>
    </section>

    <section id="guide-6" aria-labelledby="guide-6-h"><S id="guide-6-h">6. Vì sao mô hình có thể sai</S>
      <ul className={styles.list}>
        <li>Mô hình học từ quá khứ; thị trường có thể đổi cách vận hành.</li>
        <li>Giá có thể nhảy qua mức cắt lỗ, và thanh khoản thấp có thể làm lệnh khó khớp.</li>
        <li>Nhiều chỉ báo chỉ mô tả, chưa được kiểm chứng ngoài mẫu.</li>
        <li>Dữ liệu thiếu thì kết luận kém chắc hơn. Chỗ thiếu được ghi rõ, không được điền bằng số mẫu.</li>
      </ul>
      <details className={styles.more} data-guide-needs><summary>Dữ liệu báo cáo chưa có ({backendNeeds.length} trường)</summary>
        <p className={styles.p}>Các trường sau chưa có trong API, nên lớp Chuyên sâu ghi “Cần dữ liệu từ backend” thay vì vẽ.</p>
        <ul className={styles.list}>{backendNeeds.map(n => <li key={n.field}><code>{n.field}</code>: {n.what}</li>)}</ul>
      </details>
    </section>

    <section id="guide-7" aria-labelledby="guide-7-h"><S id="guide-7-h">7. Bảng thuật ngữ</S>
      <p className={styles.p}>Trong báo cáo, từ có gạch chân là thuật ngữ trong bảng này.</p>
      <dl className={styles.terms}>{quantGlossary.map(g => <div key={g.id} id={`term-${g.id}`} className={styles.term} data-guide-term={g.id}>
        <dt>{g.plain} <span>({g.term})</span></dt><dd>{g.meaning}</dd></div>)}</dl>
    </section>

    <section id="guide-8" aria-labelledby="guide-8-h"><S id="guide-8-h">8. Miễn trừ trách nhiệm</S>
      <p className={styles.p}>Thông tin phân tích tham khảo từ mô hình, không phải lời khuyên đầu tư. Quyết định và rủi ro thuộc về bạn. <span className={styles.badge}>[chờ rà soát pháp lý VN]</span></p>
    </section>
  </div>;
}

export function QuantGuideDrawer({ open, onClose, onReplayTour }: { open: boolean; onClose: () => void; onReplayTour?: () => void }) {
  const box = useRef<HTMLDivElement>(null), uid = useId();
  useDialog(open, box, onClose);
  if (!open) return null;
  return <div className={styles.scrim} onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={box} role="dialog" aria-modal="true" aria-labelledby={`${uid}-t`} tabIndex={-1} className={styles.drawer} data-quant-guide>
      <div className={styles.head}><p id={`${uid}-t`} className={styles.title}>Cách đọc báo cáo</p><button type="button" className={styles.close} onClick={onClose}>Đóng</button></div>
      <QuantGuideBody onReplayTour={onReplayTour}/>
    </div>
  </div>;
}
