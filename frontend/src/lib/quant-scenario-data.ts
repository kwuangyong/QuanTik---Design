import type { AnalysisReport } from "./api/analysis";
import { at, record, researchFor } from "./quant-reader";

export type ScenarioKind = "monte";
export type ScenarioPoint = { x: number; y: number; z: number; label: string };
export type ScenarioSeries = { name: string; points: ScenarioPoint[]; color: "accent" | "positive" | "negative" | "neutral" };
export type ScenarioScene = { series: ScenarioSeries[]; labels: string[]; axes: [string,string,string]; domains: [[number,number],[number,number],[number,number]] };
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Display adapters only: no fitting, random paths, new forecasts or gate changes.
export function scenarioScenes(report: AnalysisReport, kind: ScenarioKind): { history: ScenarioScene | null; probabilities: ScenarioScene | null; fallback: boolean } {
  const section = report.sections[kind === "monte" ? "simulation_risk" : "hmm"];
  const source = record(section?.metrics[kind === "monte" ? "simulation_risk" : "hmm"]);
  const empty = { history: null, probabilities: null, fallback: source.method === "fallback" };
  if (!section || section.status !== "AVAILABLE" || source.error || source.disabled === true || source.available === false) return empty;
  const research = researchFor(report);
  if (kind === "monte") {
    const rows = research.cone;
    if (rows.length < 2 || rows.some((p,i) => ![p.session,p.p05,p.p25,p.p50,p.p75,p.p95].every(finite) || p.session < 0 || (i > 0 && p.session <= rows[i-1].session) || !(0 < p.p05 && p.p05 <= p.p25 && p.p25 <= p.p50 && p.p50 <= p.p75 && p.p75 <= p.p95))) return empty;
    const levels = [5,25,50,75,95];
    const series: ScenarioSeries[] = (["p05","p25","p50","p75","p95"] as const).map((key,i) => ({name:key.toUpperCase(),color:key === "p50" ? "accent" : "positive",points:rows.map(p => ({x:p.session,y:levels[i],z:p[key],label:`Phiên +${p.session}`}))}));
    return { ...empty, history: {series,labels:rows.map(p=>`Phiên +${p.session}`),axes:["Phiên dự báo","Phân vị P05–P95","Giá (VND)"],domains:[[rows[0].session,rows.at(-1)!.session],[5,95],[Math.min(...rows.map(p=>p.p05)),Math.max(...rows.map(p=>p.p95))]]} };
  }
  return empty;
}

export type HmmState = "BULL" | "SIDEWAY" | "BEAR";
export function hmmPhaseData(report: AnalysisReport) {
  const section = report.sections.hmm, source = record(section?.metrics.hmm);
  const empty = { history: [] as {date:string;price:number;state:HmmState}[], probabilities: null as Record<HmmState,number> | null, fallback: source.method === "fallback" };
  if (!section || section.status !== "AVAILABLE" || source.error || source.disabled === true || source.available === false) return empty;
  const rows = researchFor(report).regime;
  const states: HmmState[] = ["BULL","SIDEWAY","BEAR"];
  const validHistory = rows.length >= 2 && rows.every((p,i) => finite(p.price) && p.price > 0 && typeof p.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && states.includes(p.state as HmmState) && (i === 0 || p.date > rows[i-1].date));
  const values = states.map(state => at(source,`state_probs.${state}`));
  const validProbabilities = values.every(v => finite(v) && v >= 0 && v <= 100) && Math.abs(values.reduce<number>((sum,v)=>sum+(finite(v)?v:0),0)-100) <= 1.5;
  return {history:validHistory ? rows as {date:string;price:number;state:HmmState}[] : [], probabilities:validProbabilities ? Object.fromEntries(states.map((state,i)=>[state,values[i]])) as Record<HmmState,number> : null, fallback:source.method === "fallback"};
}
