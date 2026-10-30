// Reading references ONLY. These never feed forecasts, scores or action gates.
// No universal good/bad cutoff is assigned to a forecast, AIC, beta, or quality score.
export const interpretationThresholds = {
  statistics: { sharpeFair: 1, sharpeStrong: 2, sortinoReference: 1 },
  distribution: { symmetric: 0, normalExcessKurtosis: 0 },
  arima: { adfSignificance: .05 },
  garch: { persistent: .9, stationaryLimit: 1 },
  hmm: { majorityPct: 50 },
  technical: { neutralFlow: 0, noisyER: .3 },
  directional_alpha: { neutralMomentum: 0, randomHurst: .5 },
  context: { independentCorrelation: 0 },
  agreement: { fullCoveragePct: 100 },
  simulation_risk: { balancedUpPct: 50 },
  costs: { breakEvenPct: 0 },
  trade_plan: { minPrice: 0 },
  liquidity: { unchangedVolumeRatio: 1 },
  data_quality: { minScore: 0, maxScore: 100 },
  decision: { minScore: 0, maxScore: 100 },
  commentary: {},
} as const;
