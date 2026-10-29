import type { QuantResearch } from './api/analysis';
import {factorReadingRules, type FactorGroup} from './quant-factor-readings';

// Labels follow the existing pipeline's AdaptiveScorer factor IDs.
// This is a presentation catalog, never a new score or a source of factor values.
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
  fraction: number | null; score: number | null; group: FactorGroup; status: string;
};
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export function presentFactors(data: QuantResearch['factors']): PresentedFactor[] {
  const source = new Map(data.map(f => [f.id, f]));
  return profileFactorIds.map(id => {
    const input = source.get(id);
    const value = finite(input?.value) ? input.value : null;
    const min = finite(input?.min) ? input.min : null, max = finite(input?.max) ? input.max : null;
    const validDomain = min != null && max != null && max > min;
    const inDomain = value != null && validDomain && value >= min! && value <= max!;
    return { id, label: factorLabels[id], axisLabels: axisLabels[id], shortLabel: shortLabels[id], value, min, max,
      fraction: inDomain ? (value! - min!) / (max! - min!) : null,
      score: inDomain ? Math.round((value! - min!) / (max! - min!) * 100) : null, group: factorReadingRules[id].group,
      status: value == null ? 'Thiếu dữ liệu' : !validDomain ? 'Thiếu miền hợp lệ' : !inDomain ? 'Giá trị ngoài miền' : 'Có dữ liệu' };
  });
}
