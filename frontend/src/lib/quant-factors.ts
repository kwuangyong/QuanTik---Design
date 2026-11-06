import type { AnalysisReport, QuantResearch } from './api/analysis';
import {radarScores} from './quant-radar-scoring';
import {factorReadingRules, type FactorGroup} from './quant-factor-readings';

// Labels follow the existing pipeline's AdaptiveScorer factor IDs.
// Display catalog; approved raw-to-display mappings live in quant-radar-scoring.
// This does not modify the engine score, forecast or trading gates.
export const factorLabels: Record<string, string> = {
  sharpe: 'Sharpe',
  forecast_ret: 'Dự báo sau phí',
  forecast_conf: 'Độ tin cậy dự báo',
  cmf: 'Dòng tiền',
  trend_quality: 'Chất lượng xu hướng',
  alpha_composite: 'Alpha tổng hợp',
  hmm_regime: 'Trạng thái HMM',
  lock_safety: 'An toàn T+2',
  vol_regime: 'Trạng thái biến động',
  distribution_quality: 'Chất lượng phân phối',
  liquidity: 'Thanh khoản',
  data_quality: 'Chất lượng dữ liệu',
};
// Curated display only; excluded factors remain untouched in the source report.
export const profileFactorIds = ['sharpe','cmf','alpha_composite','forecast_ret','forecast_conf','trend_quality','hmm_regime','vol_regime','liquidity'] as const;
const axisLabels: Record<string,string[]> = {
  sharpe:['Sharpe'],forecast_ret:['Dự báo','sau phí'],forecast_conf:['Độ tin cậy','dự báo'],
  cmf:['Dòng tiền'],trend_quality:['Chất lượng','xu hướng'],alpha_composite:['Alpha','tổng hợp'],
  hmm_regime:['Trạng thái','HMM'],vol_regime:['Trạng thái','biến động'],liquidity:['Thanh khoản'],
};
const shortLabels: Record<string,string> = {sharpe:'Sharpe',forecast_ret:'Dự báo',forecast_conf:'Tin cậy',cmf:'Dòng tiền',trend_quality:'Xu hướng',alpha_composite:'Alpha',hmm_regime:'HMM',vol_regime:'Biến động',liquidity:'Thanh khoản'};
export type PresentedFactor = {
  id: string; label: string; axisLabels: string[]; shortLabel: string; value: number | null; min: number | null; max: number | null;
  fraction: number | null; score: number | null; group: FactorGroup; status: string; formula: string; coverage?: {available:number;total:number};
};
export function presentFactors(data: QuantResearch['factors'], report?: AnalysisReport): PresentedFactor[] {
  const {scores,coverage} = radarScores(data,report);
  return profileFactorIds.map(id => {
    const item = scores[id];
    return { id, label: factorLabels[id], axisLabels: axisLabels[id], shortLabel: shortLabels[id],
      value:item.value, min:null, max:null, score:item.score, fraction:item.score==null?null:item.score/100,
      group:factorReadingRules[id].group, status:item.status, formula:item.formula,
      ...(id==='alpha_composite'?{coverage}:{}) };
  });
}
