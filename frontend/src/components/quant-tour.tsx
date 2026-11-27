"use client";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useDialog } from "./quant-dialog";
import styles from "./quant-tour.module.css";

// 4-step tour for the first visit (G2-ux-spec 7.2): anchored popover, no dimmed overlay, "Bỏ qua" from step 1.
export const tourSeenKey = "quantik.quant.tourSeen";
let seenThisSession = false;
export function tourSeen(): boolean {
  if (seenThisSession) return true;
  try { return window.localStorage.getItem(tourSeenKey) === "1"; } catch { return false; }
}
export function markTourSeen() {
  seenThisSession = true;
  try { window.localStorage.setItem(tourSeenKey, "1"); } catch { /* not persisted; the in-memory flag still stops a repeat */ }
}

type Step = { anchor: string; title: string; text: string };
export const tourSteps: readonly Step[] = [
  { anchor: "[data-glance-verdict]", title: "Kết luận", text: "Kết luận của mô hình nằm ở đây. Đây là nhãn của mô hình, không phải lệnh mua bán." },
  { anchor: "[data-glance-risk]", title: "Rủi ro trước", text: "Xem rủi ro trước khi xem cơ hội: bạn có thể mất bao nhiêu và trong tình huống nào." },
  { anchor: "[data-quant-levels]", title: "Ba lớp đọc", text: "Đổi giữa Tóm tắt, Hiểu vì sao và Chuyên sâu bất cứ lúc nào. Tóm tắt đọc trong 30 giây." },
  { anchor: "[data-quant-glance] [data-quant-term]", title: "Thuật ngữ", text: "Từ có gạch chân là thuật ngữ. Rê chuột, chạm hoặc nhấn Enter để xem nghĩa bằng lời thường." },
];

export function QuantTour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0), [style, setStyle] = useState<CSSProperties>({});
  const box = useRef<HTMLDivElement>(null), uid = useId(), step = tourSteps[index];
  const finish = useCallback(() => { markTourSeen(); onClose(); }, [onClose]);
  useDialog(true, box, finish);
  const place = useCallback(() => {
    const el = document.querySelector<HTMLElement>(step.anchor), pop = box.current;
    if (!pop) return;
    if (!el) { setStyle({ bottom: 16, right: 16 }); return; }
    const vw = window.innerWidth, vh = window.innerHeight, r = el.getBoundingClientRect();
    if (vw < 640) { setStyle({}); return; }
    const w = Math.min(380, vw - 16), h = pop.offsetHeight, clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(lo, v), Math.max(lo, hi));
    const left = clamp(r.left, 8, vw - w - 8);
    // Prefer below the anchor, then above, then beside it (tall anchors), so the pointed-at element stays readable.
    if (r.bottom + 12 + h <= vh - 8) setStyle({ top: r.bottom + 12, left, width: w });
    else if (r.top - h - 12 >= 8) setStyle({ top: r.top - h - 12, left, width: w });
    else if (r.right + 12 + w <= vw - 8) setStyle({ top: clamp(r.top, 8, vh - h - 8), left: r.right + 12, width: w });
    else if (r.left - 12 - w >= 8) setStyle({ top: clamp(r.top, 8, vh - h - 8), left: r.left - 12 - w, width: w });
    else setStyle({ top: clamp(r.top + 12, 8, vh - h - 8), left, width: w });
  }, [step]);
  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(step.anchor);
    if (!el) { place(); return; }
    const r = el.getBoundingClientRect(), vh = window.innerHeight;
    if (window.innerWidth < 640) window.scrollBy({ top: r.top - 72, behavior: "instant" });
    else if (r.top < 64 || r.bottom > vh - 200) window.scrollBy({ top: r.top - Math.max(80, (vh - r.height) / 3), behavior: "instant" });
    el.setAttribute("data-tour-active", "true");
    place();
    return () => el.removeAttribute("data-tour-active");
  }, [step, place]);
  useEffect(() => {
    window.addEventListener("resize", place); window.addEventListener("scroll", place, { passive: true });
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place); };
  }, [place]);
  const last = index === tourSteps.length - 1;
  return <div ref={box} role="dialog" aria-modal="true" aria-labelledby={`${uid}-t`} aria-describedby={`${uid}-d`} tabIndex={-1} className={styles.tour} style={style} data-quant-tour data-tour-step={index + 1}>
    <p className={styles.count}>Bước {index + 1}/{tourSteps.length}</p>
    <h2 id={`${uid}-t`} className={styles.title}>{step.title}</h2>
    <p id={`${uid}-d`} className={styles.text}>{step.text}</p>
    <div className={styles.row}>
      <button type="button" className={styles.skip} onClick={finish}>Bỏ qua</button>
      <span className={styles.nav}>
        {index > 0 && <button type="button" className={styles.btn} onClick={() => setIndex(index - 1)}>Quay lại</button>}
        <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => last ? finish() : setIndex(index + 1)}>{last ? "Xong" : "Tiếp"}</button>
      </span>
    </div>
  </div>;
}
