import type { AnalysisReport } from './api/analysis';

// Single accessor for the decision. Canonical source: top-level `report.decision`;
// fallback: `sections.decision.metrics.action` (shape used by older fixtures/BE builds).
// Open item: confirm the real BE location (G2-quant-spec section 8, item 7).
export type QuantDecision = { action: string; executable: boolean | null; gatePass: boolean | null; reasonCodes: string[] };
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};

export function readDecision(report: AnalysisReport | undefined): QuantDecision {
  const top = obj(report?.decision);
  const nested = obj(obj(obj(report?.sections?.decision)?.metrics).action);
  const pick = (key: string): unknown => top[key] !== undefined ? top[key] : nested[key];
  const action = pick('action'), executable = pick('executable'), gate = pick('gate_pass'), codes = pick('reason_codes');
  return {
    action: typeof action === 'string' ? action : '',
    executable: typeof executable === 'boolean' ? executable : null,
    gatePass: typeof gate === 'boolean' ? gate : null,
    reasonCodes: Array.isArray(codes) ? codes.filter((c): c is string => typeof c === 'string') : [],
  };
}
