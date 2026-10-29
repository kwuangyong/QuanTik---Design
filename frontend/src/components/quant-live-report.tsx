"use client";
import { useEffect, useId, useRef, useState } from "react";
import { analysisReason, type AnalysisReport } from "@/lib/api/analysis";
import { at, metricText, researchFor } from "@/lib/quant-reader";
import { QuantResearchVisuals } from "./quant-research";
import { QuantModelSection } from "./quant-model-section";
import { QuantModuleNavigation, quantModuleItems } from "./quant-module-navigation";
import { QuantActionSummary } from "./quant-action-summary";
import styles from "./quant-reader.module.css";

const card = "min-w-0 rounded border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6";
export function LiveQuantReport({ report, compact = false, showAction = true }: { report: AnalysisReport; compact?: boolean; showAction?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const seen = new Set<SVGSVGElement>();
    const resize = new ResizeObserver(entries => {
      for (const entry of entries) {
        const svg = entry.target as SVGSVGElement, width = entry.contentRect.width;
        if (width > 0 && svg.viewBox.baseVal.width > 0) {
          const matrix = svg.getScreenCTM();
          const renderedScale = matrix ? Math.hypot(matrix.c, matrix.d) : width / svg.viewBox.baseVal.width;
          if (!(renderedScale > 0)) continue;
          const scale = 1 / renderedScale;
          // Keep computed AND screen font sizes >= the minimum. Cancel only the
          // outer viewBox scaling around each text anchor, preserving chart geometry.
          svg.querySelectorAll("text").forEach(text => {
            const x=text.x.baseVal.length ? text.x.baseVal.getItem(0).value : 0, y=text.y.baseVal.length ? text.y.baseVal.getItem(0).value : 0;
            text.setAttribute("transform",`translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`);
          });
        }
      }
    });
    const scan = () => {
      seen.forEach(svg => { if (!element.contains(svg)) { resize.unobserve(svg); seen.delete(svg); } });
      element.querySelectorAll<SVGSVGElement>("svg").forEach(svg => {
        if (!seen.has(svg) && svg.querySelector("text")) { seen.add(svg); resize.observe(svg); }
      });
    };
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(element, { childList: true, subtree: true });
    return () => { resize.disconnect(); mutations.disconnect(); };
  }, []);
  const [selectedModule, setSelectedModule] = useState(compact ? "" : "statistics");
  const uid = useId().replaceAll(":", ""), research = researchFor(report);
  const sectionId = (name: string) => `${uid}-quant-${name}`;
  const selectModule = (name: string) => {
    setSelectedModule(name);
    requestAnimationFrame(() => {
      const section = document.getElementById(sectionId(name));
      section?.scrollIntoView({ block: "start", behavior: "instant" });
      section?.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
    });
  };
  return <div ref={root} className={`quant-report ${styles.report} grid min-w-0 gap-6 ${compact ? "is-compact" : ""}`}>
    <QuantActionSummary report={report} compact={compact} showAction={showAction}/>
    <section id={sectionId("navigation")} aria-label="Phân tích từng module" className="grid min-w-0 gap-5">
      <div><p className={styles.eyebrow}>ĐỌC HIỂU KẾT QUẢ</p><h3 className="mt-2 text-2xl font-medium">Phân tích từng mô hình</h3><p className="mt-2 text-sm leading-7 text-[var(--muted)]">Chọn một module để xem biểu đồ, kết quả và ý nghĩa đối với {report.symbol}.</p></div>
      <QuantModuleNavigation sections={report.sections} selected={selectedModule} onSelect={selectModule}/>
      {quantModuleItems.map(([name], index) => <QuantModelSection key={name} name={name} report={report} compact={compact} id={sectionId(name)} agreementId={sectionId("agreement")} navigationId={sectionId("navigation")} selected={selectedModule === name} number={index + 1} onSelect={selectModule}/>)}
    </section>
    <details className={card} aria-label="Biểu đồ bổ sung"><summary className="cursor-pointer text-base font-medium">Biểu đồ bổ sung · Đối chiếu toàn bộ báo cáo</summary><div className="mt-5"><QuantResearchVisuals report={report}/></div></details>
    <details className={`${card} text-[13px] leading-7 text-[var(--muted)]`}><summary className="cursor-pointer">Dữ liệu, nguồn và phiên bản mô hình</summary>
      <p className="mt-4">{metricText(research.observations ?? at(report.sections.statistics?.metrics, "n"))} nến ngày · {research.start && research.end ? `${research.start} → ${research.end}` : "Cửa sổ chưa công bố"} · Giá theo VND.</p>
      {!!report.warnings.length && <ul className="mt-3 list-inside list-disc">{report.warnings.map((warning, i) => <li key={i}>{analysisReason(warning)}</li>)}</ul>}
      <dl className="mt-3">{Object.entries(report.versions).filter(([, value]) => typeof value === "string" || typeof value === "number").map(([key, value]) => <div key={key} className="my-2 break-all"><dt>{key}</dt><dd className="font-mono">{String(value)}</dd></div>)}</dl>
    </details>
  </div>;
}
