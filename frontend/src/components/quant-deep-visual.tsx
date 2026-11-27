"use client";
import { useMemo, type ReactNode } from "react";
import type { AnalysisReport } from "@/lib/api/analysis";
import { deepVisual } from "@/lib/quant-visual";
import { QuantGarchView } from "./quant-report-views";
import { QuantScenarioView } from "./quant-scenario-3d";
import { FigureView, NeedsView } from "./quant-visual";
import s from "./quant-visual.module.css";

// "Chuyên sâu" main figure of a module in the V2 reader. Only published fields are drawn; what the API lacks is a labelled
// "Cần dữ liệu từ backend" cell. The existing 3D scenes (GARCH response surface, Monte Carlo percentiles) are reused behind
// a 2D default with the table alternative; no new 3D code or dependency. Returns null for modules that keep their own visual.
export function QuantDeepVisual({ name, report }: { name: string; report: AnalysisReport }) {
  const deep = useMemo(() => deepVisual(report, name), [report, name]);
  if (!deep) return null;
  const view = (id: string): ReactNode => { const f = deep.figures.find(x => x.id === id); return f ? <FigureView key={f.id} fig={f}/> : null; };
  const wrapped = name === "garch" ? "garch-forecast" : name === "simulation_risk" ? "simulation-fan" : "";
  const main = wrapped ? view(wrapped) : null;
  return <div className={s.deep} data-deep-visual={name}>
    {deep.empty && <p className={s.empty} role="status" data-deep-empty>{deep.empty}</p>}
    {!!deep.figures.length && <div className={s.deepGrid}>
      {main && (name === "garch" ? <QuantGarchView report={report}>{main}</QuantGarchView> : <QuantScenarioView report={report} kind="monte">{main}</QuantScenarioView>)}
      {deep.figures.filter(f => f.id !== wrapped).map(f => view(f.id))}
    </div>}
    {deep.notes.map(n => <p key={n} className={s.note}>{n}</p>)}
    <NeedsView needs={deep.needs}/>
  </div>;
}
