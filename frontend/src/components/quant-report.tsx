"use client";
import type { AnalysisReport } from "@/lib/api/analysis";
import { LiveQuantReport } from "./quant-live-report";
import { ModelDisclaimer } from "./model-disclaimer";

export function QuantReport({ result, compact = false, showAction = true }: {
  result: AnalysisReport; compact?: boolean; showAction?: boolean;
}) {
  return <><ModelDisclaimer kind="quant" className="[margin-bottom:12px]"/><LiveQuantReport report={result} compact={compact} showAction={showAction}/></>;
}
