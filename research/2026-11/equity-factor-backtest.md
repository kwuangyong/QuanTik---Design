# Vietnam equities: price/volume factor test (weekly, long-only, net of costs)

Research output only. Not investment advice. Data: DNSE chart API, 1,505 symbols (HOSE 412 / HNX 299 / UPCOM ~794 with data) + VNINDEX, daily, 2016-01-04 to 2026-11-25. Scripts: `research/scripts/{fetch,prep,factors,evalf}.py`; all result CSVs in `research/results_*.csv`, `research/current_*.csv`.

## 1. Headline (honest version)
- Several factors rank stocks significantly (cross-sectional rank IC) and the signal replicates out of sample, but it is mostly a **"avoid the lottery/illiquid junk"** effect (the bottom quintile is terrible), not a "buy winners" effect. Long-only after costs, the edge over the equal-weight universe is small and statistically insignificant, and the Deflated Sharpe Ratio is far below 0.95.
- Passing the Harvey-Liu-Zhu t>3 hurdle (1w rank IC, Newey-West lag 4) in **both** in-sample (2017-2020) and out-of-sample (2021-2026): **idiosyncratic vol 63d (negative), Amihud illiquidity (negative: prefers more liquid names within the >=1bn universe), MAX5 (negative)**. 52-week-high proximity passes in-sample (t=4.0), full sample (t=4.1) but only t=2.3 OOS. Ceiling-hit frequency: full-sample t=-3.2 (IS -2.2, OOS -2.4; passes t>2 only).
- **Momentum (12-1, 6-1), residual momentum, frog-in-pan, MA200 distance, trend quality, beta, reversal, CMF, turnover change do not survive OOS** (t<2 in OOS for the momentum family; OOS IC ~0.00-0.01). IS momentum t~2.0 was a weak in-sample result that vanished.
- Best OOS strategy: IC-weighted composite B, "hidden gem" top-10/20 (lower two ADV terciles), net OOS Sharpe 0.56-0.59, ann +8-10% vs equal-weight universe -4.1% net and VNINDEX +6.3%. But excess vs EW t = 0.7-1.0, **DSR = 0.16-0.22** (N=94/201 trials), so not distinguishable from selection luck. Do not treat as validated alpha.
- Regime filter (VNINDEX>MA200/MA100): halves max drawdown in-sample, but OOS it did not improve Sharpe for the best strategies (0.59 -> 0.56 for gem top10; 0.29 -> 0.27 for top decile) and cost return. No robust benefit.

## 2. Data, adjustment and cleaning
- Prices in thousand VND (FPT 60.65 = 60,650 VND). **Series are back-adjusted** (HPG starts at 2.57k in 2016; no unadjusted split jumps in HPG/VNM/SSI/MWG). Consequences: (i) the 5,000 VND price floor on adjusted history would wrongly drop real stocks (HPG 2016), so I applied the floor only for dates after 2025-06-01 (where adjusted ~ nominal); history relies on the ADV floor only; (ii) historical value-traded = adjusted close x raw volume, which **understates** past liquidity (eligible names/week: 2017 147, 2018 144, 2019 162, 2020 207, 2021 376, 2022 363, 2023 317, 2024 329, 2025 338, 2026 276), i.e. the early universe is biased toward large names; IS therefore skews large-cap. Volume adjustment status unknown.
- Overnight jumps beyond exchange limit +5%: 19,517 stock-days (mostly UPCOM thin names, a one-day 2021-02-05 artefact in several tickers e.g. FPT +15.1%, RIC/NOS/HES, and unadjusted-looking drops of -45% to -90% e.g. TH1 -91% then +1045%). I treated |daily return| > 15.75% (above any limit) as data errors (12,165 flagged, set to 0% return, prices rebuilt from cleaned returns). Some may be genuine multi-day-gap returns of suspended names; they are set to 0, which slightly flatters negative tails but also removes spikes. Smaller errors (<15.75%) in HOSE/HNX not filtered.
- Missing days: forward-filled <=10 days with zero volume. Names whose price series simply ends (delisted) get 0 for the missing exit return (not -100%), which flatters results.
- Ceiling/floor lock proxy: close==high and return >= 97% of the limit (7/10/15% by *current* exchange). No entry on a ceiling-locked day (T+1); a floor-locked exit is pushed to the next unlocked day (up to 5 days). Actual order-book fills not observable.

## 3. Method / exact parameters
- Signal: last trading day of each week (563 signals). Entry at close of T+1, exit at close of next week's T+1 (hold = 1 week >=5 trading days, satisfies T+2). 4w forward return = T+1 to T+1 four weeks later (overlapping IC, NW lag 4).
- Universe filter at signal date: ADV20 (value) >= 1bn VND (robustness 5bn), >=250 days history, traded in last 5 days, entry day not ceiling-locked. About 240 names per week on average (OOS ~ 330).
- Costs: 0.15% per side + 0.10% sell tax + slippage 0.10% per side (0.30% when ADV20 < 5bn), applied to drifted-weight turnover. Equal weight. No cash yield. Sharpe = mean/sd of weekly net x sqrt(52), rf=0.
- Factors (16; daily data <= signal date): mom_12_1 (P[t-21]/P[t-252]-1); mom_6_1; resid_mom (252d market-model residual sum over days t-251..t-21 / residual vol; VNINDEX market); high52 = P/max252; trend_q = R2 x sign(slope) of log P 126d; max5 = mean of top-5 daily returns in 21d; ivol63 = residual sd vs VNINDEX 63d; rev5, rev21; amihud = mean(|r|/value bn) 63d; turn_chg = ADV20/ADV120; cmf20; fip = sign(mom12-1)x(%pos-%neg days, t-251..t-21); beta252; dist_ma200; ceil_freq63 (count of ceiling-locked days in 63d). Factors are raw; direction for portfolios = sign of in-sample mean IC.
- Periods: IS = signals <= 2020-12-31 (factor warm-up means effective IS is 2017-2020, ~4 years, 259 weeks incl. ~209 with a usable 1w IC), OOS = 2021-01 to 2026-11 (303 weeks, includes the 2022 crash).
- Composites (weights fixed from IS only): **A** = equal-weight rank-normal z of factors with IS |NW-t|>2 (10 factors: mom_12_1, mom_6_1, high52, trend_q, beta252, dist_ma200 (+); max5, ivol63, amihud, ceil_freq63 (-)); **B** = all 16 factors weighted by IS mean IC (normalised to sum|w|=1).
- Hidden gem = lower two ADV terciles (still >=1bn), top-decile / top-20 / top-10 by composite.

## 4. Trial count (counted honestly)
- 16 factors x 2 horizons x 2 ADV floors = 64 IC tests (+48 tercile IC tests, descriptive).
- Portfolio configurations evaluated: **201** (16 factors x 5 quintiles x 2 floors = 160, plus composites/regimes/gems/terciles/composite quintiles/benchmark). **94** net return series registered as "trials" for DSR variance and CSCV (Q1 and Q5 of each factor x 2 floors = 64, plus 30 composite variants). Weekly-SR cross-trial variance (OOS) = 0.00266. Trials are highly correlated, so effective N is lower; I show DSR for N=5..201.
- Hurdle: HLZ t>3 (and t>2 reported).

## 5. Factor rank IC, 1-week forward (ADV>=1bn)
| factor | IC IS | t IS | IC OOS | t OOS | IC ALL | NW-t ALL | ICIR(ann) ALL | hit ALL |
|---|---|---|---|---|---|---|---|---|
| amihud | -0.037 | -4.2 | -0.040 | -5.1 | -0.039 | -6.6 | -2.00 | 0.39 |
| beta252 | +0.029 | +2.0 | +0.012 | +0.8 | +0.019 | +1.8 | +0.57 | 0.55 |
| ceil_freq63 | -0.017 | -2.2 | -0.017 | -2.4 | -0.017 | -3.2 | -0.92 | 0.45 |
| cmf20 | -0.012 | -1.3 | -0.019 | -2.2 | -0.016 | -2.5 | -0.80 | 0.48 |
| dist_ma200 | +0.032 | +2.4 | -0.001 | -0.1 | +0.012 | +1.4 | +0.47 | 0.55 |
| fip | -0.009 | -1.2 | -0.001 | -0.1 | -0.004 | -0.9 | -0.31 | 0.47 |
| high52 | +0.053 | +4.0 | +0.031 | +2.3 | +0.040 | +4.1 | +1.43 | 0.60 |
| ivol63 | -0.057 | -5.9 | -0.064 | -5.3 | -0.061 | -7.4 | -2.34 | 0.35 |
| max5 | -0.036 | -4.1 | -0.040 | -4.2 | -0.039 | -5.7 | -1.53 | 0.42 |
| mom_12_1 | +0.022 | +2.0 | +0.002 | +0.2 | +0.010 | +1.3 | +0.44 | 0.55 |
| mom_6_1 | +0.025 | +2.1 | +0.006 | +0.5 | +0.014 | +1.6 | +0.59 | 0.55 |
| resid_mom | -0.006 | -0.6 | +0.011 | +1.4 | +0.004 | +0.7 | +0.21 | 0.51 |
| rev21 | +0.020 | +2.0 | -0.008 | -0.8 | +0.003 | +0.5 | +0.14 | 0.53 |
| rev5 | -0.008 | -1.0 | -0.017 | -2.0 | -0.013 | -2.1 | -0.64 | 0.47 |
| trend_q | +0.036 | +3.0 | +0.007 | +0.8 | +0.019 | +2.6 | +0.95 | 0.59 |
| turn_chg | -0.001 | -0.2 | -0.022 | -2.6 | -0.014 | -2.2 | -0.69 | 0.46 |

## 5b. Factor rank IC, 4-week forward (ADV>=1bn)
| factor | IC IS | t IS | IC OOS | t OOS | IC ALL | NW-t ALL | ICIR(ann) ALL | hit ALL |
|---|---|---|---|---|---|---|---|---|
| amihud | -0.039 | -2.4 | -0.051 | -3.7 | -0.046 | -4.4 | -2.35 | 0.35 |
| beta252 | +0.034 | +1.4 | +0.004 | +0.2 | +0.016 | +0.9 | +0.50 | 0.55 |
| ceil_freq63 | -0.019 | -1.5 | -0.034 | -3.1 | -0.028 | -3.4 | -1.73 | 0.40 |
| cmf20 | +0.001 | +0.1 | -0.021 | -1.6 | -0.012 | -1.3 | -0.62 | 0.48 |
| dist_ma200 | +0.048 | +2.2 | -0.001 | -0.0 | +0.019 | +1.3 | +0.70 | 0.56 |
| fip | -0.015 | -1.3 | -0.002 | -0.2 | -0.008 | -1.0 | -0.55 | 0.48 |
| high52 | +0.083 | +3.5 | +0.053 | +2.3 | +0.066 | +3.8 | +2.14 | 0.64 |
| ivol63 | -0.079 | -4.1 | -0.102 | -4.7 | -0.092 | -6.1 | -3.35 | 0.31 |
| max5 | -0.044 | -2.7 | -0.062 | -3.6 | -0.055 | -4.5 | -2.29 | 0.38 |
| mom_12_1 | +0.024 | +1.3 | +0.001 | +0.0 | +0.010 | +0.8 | +0.45 | 0.56 |
| mom_6_1 | +0.028 | +1.4 | +0.006 | +0.3 | +0.015 | +1.0 | +0.59 | 0.56 |
| resid_mom | -0.023 | -2.1 | +0.016 | +1.4 | +0.000 | +0.0 | +0.01 | 0.46 |
| rev21 | +0.038 | +2.6 | -0.008 | -0.5 | +0.011 | +1.0 | +0.49 | 0.57 |
| rev5 | +0.026 | +2.6 | +0.004 | +0.5 | +0.013 | +1.9 | +0.66 | 0.57 |
| trend_q | +0.049 | +2.4 | +0.002 | +0.1 | +0.021 | +1.7 | +0.95 | 0.58 |
| turn_chg | +0.001 | +0.1 | -0.037 | -2.7 | -0.021 | -2.1 | -1.09 | 0.44 |

Notes: ADV>=5bn floor (1w): ivol63 t=-5.5 ALL / -3.8 OOS, amihud -4.1 / -3.1, max5 -3.4 / -2.3, high52 +3.0 / +1.5, momentum t<1; the same ranking holds but smaller IC (-0.054 ivol) in larger names. By ADV tercile (1w, ALL): ivol63 IC small -0.068 (t -7.8), mid -0.064, large -0.048 (t -4.6); max5 small -0.056 / large -0.019; amihud -0.051/-0.052/-0.031; high52 +0.046/+0.046/+0.027; momentum weak everywhere (small tercile 6-1 t=2.2). The effects are strongest in small/mid ADV names ("where hidden gems live", but also where costs and capacity bite). See `results_ic_tercile.csv`.

## 6. Single-factor long-only quintile portfolios (net, ADV>=1bn, equal weight)
Q5 = highest raw factor value, Q1 = lowest. Net of costs. Benchmarks (net weekly rebalanced): VNINDEX buy-and-hold IS +16.3% / OOS +6.3% (Sharpe 0.85 / 0.39); equal-weight eligible universe gross IS +10.0% / OOS -1.1%, net IS +4.9% / OOS -4.1% (Sharpe 0.35 / 0.00, maxDD -65% OOS).
| factor | Q1 net ann OOS | Q1 Sharpe OOS | Q5 net ann OOS | Q5 Sharpe OOS | Q5 net ann IS | Q5 Sharpe IS | Q5 maxDD OOS | Q5 turnover/yr |
|---|---|---|---|---|---|---|---|---|
| mom_12_1 | -12.6% | -0.25 | -12.6% | -0.29 | -0.7% | 0.07 | -75% | 8.0x |
| mom_6_1 | -15.9% | -0.35 | -12.7% | -0.30 | -6.9% | -0.22 | -75% | 10.2x |
| resid_mom | -14.2% | -0.36 | -23.6% | -0.71 | -16.3% | -0.74 | -85% | 20.0x |
| high52 | -20.0% | -0.37 | -0.7% | 0.09 | +6.2% | 0.45 | -50% | 13.3x |
| trend_q | -9.4% | -0.19 | -6.5% | -0.11 | +8.1% | 0.50 | -63% | 6.8x |
| max5 | -12.9% | -0.62 | -18.4% | -0.36 | -11.5% | -0.39 | -86% | 14.6x |
| ivol63 | +1.6% | 0.18 | -22.8% | -0.49 | -20.7% | -0.83 | -90% | 8.6x |
| rev5 | -34.9% | -1.11 | -29.5% | -0.97 | -18.5% | -0.93 | -93% | 36.6x |
| rev21 | -26.4% | -0.73 | -13.2% | -0.30 | -1.1% | 0.05 | -80% | 18.8x |
| amihud | -0.7% | 0.12 | -17.1% | -0.48 | -13.5% | -0.61 | -84% | 10.9x |
| turn_chg | -11.1% | -0.22 | -18.1% | -0.50 | -3.0% | -0.04 | -82% | 12.0x |
| cmf20 | -14.4% | -0.32 | -15.6% | -0.62 | -8.0% | -0.50 | -78% | 15.3x |
| fip | -10.5% | -0.27 | -9.6% | -0.21 | +1.1% | 0.16 | -65% | 9.0x |
| beta252 | -11.1% | -0.60 | -6.7% | 0.04 | +10.5% | 0.51 | -77% | 4.5x |
| dist_ma200 | -17.0% | -0.35 | -9.9% | -0.21 | +3.4% | 0.27 | -73% | 9.8x |
| ceil_freq63 | +2.7% | 0.39 | -17.9% | -0.39 | -6.5% | -0.18 | -81% | 10.0x |

Interpretation: for ivol63 / amihud / max5 the useful side is the *low* quintile (Q1 for ivol: net OOS ~+0.02 ann vs universe -4%); the high quintiles lose 15-22% per year net. Full sample ivol63 Q1 +5.0% net (gross 10.6%), Q5 -21.8% net. Momentum/reversal quintiles are all negative net after costs (turnover 8-37x per year). Full table: `results_quintiles.csv`.

## 7. Composite results (1bn floor, net of costs)
Composite rank IC (1w): A IS 0.064 (t 5.2), OOS 0.043 (t 4.0); B IS 0.070 (t 5.7), OOS 0.053 (t 4.4) (B is mildly in-sample-optimised; A and B IC are OOS-validated because weights come from IS only). Composite quintile gross ann OOS: A Q1 -13.2% .. Q5 +4.2%; B Q1 -14.4% .. Q5 +8.9% (monotone-ish spread of ~13-23 pts, mostly on the unimplementable short side). Net Q5 OOS: A -1.5% (Sharpe 0.06), B +3.2% (0.25).
| composite | portfolio | regime | period | net ann | vol | Sharpe | maxDD | turnover/yr | excess vs EW (t) | excess vs VNI (t) |
|---|---|---|---|---|---|---|---|---|---|---|
| A_EW_signif | top_decile | none | IS | +8.4% | 19.2% | 0.52 | -48% | 8.5x | +0.6% (0.1) | -7.3% (-1.5) |
| A_EW_signif | top_decile | none | OOS | -2.0% | 24.9% | 0.05 | -57% | 9.4x | -1.8% (-0.3) | -7.3% (-1.1) |
| A_EW_signif | top_decile | MA200 | IS | +12.0% | 15.4% | 0.81 | -31% | 6.4x | +3.8% (0.4) | -4.7% (-0.6) |
| A_EW_signif | top_decile | MA200 | OOS | -1.5% | 21.9% | 0.04 | -49% | 8.1x | -2.1% (-0.2) | -7.6% (-1.0) |
| A_EW_signif | top_decile | MA100 | IS | +11.7% | 14.7% | 0.83 | -36% | 7.1x | +3.4% (0.4) | -5.0% (-0.7) |
| A_EW_signif | top_decile | MA100 | OOS | -1.1% | 20.4% | 0.05 | -46% | 8.8x | -2.0% (-0.2) | -7.5% (-0.9) |
| A_EW_signif | top20 | none | IS | +7.7% | 19.0% | 0.49 | -51% | 7.5x | -0.2% (-0.0) | -8.0% (-1.7) |
| A_EW_signif | top20 | none | OOS | +1.7% | 24.8% | 0.20 | -51% | 9.6x | +1.9% (0.2) | -3.7% (-0.5) |
| A_EW_signif | top20 | MA200 | IS | +11.7% | 15.2% | 0.81 | -33% | 5.8x | +3.6% (0.4) | -4.9% (-0.7) |
| A_EW_signif | top20 | MA200 | OOS | +1.6% | 22.4% | 0.19 | -43% | 8.5x | +1.1% (0.1) | -4.4% (-0.6) |
| A_EW_signif | top20 | MA100 | IS | +12.0% | 14.5% | 0.85 | -37% | 6.4x | +3.7% (0.4) | -4.8% (-0.7) |
| A_EW_signif | top20 | MA100 | OOS | +1.5% | 20.9% | 0.18 | -41% | 9.1x | +0.8% (0.1) | -4.8% (-0.6) |
| B_ICw_all | top_decile | none | IS | +9.2% | 18.0% | 0.58 | -50% | 8.5x | +1.3% (0.2) | -6.8% (-1.4) |
| B_ICw_all | top_decile | none | OOS | +3.9% | 21.7% | 0.29 | -44% | 9.5x | +3.2% (0.5) | -2.3% (-0.4) |
| B_ICw_all | top_decile | MA200 | IS | +13.7% | 14.9% | 0.94 | -32% | 6.3x | +5.7% (0.6) | -3.2% (-0.4) |
| B_ICw_all | top_decile | MA200 | OOS | +3.3% | 19.0% | 0.27 | -31% | 8.4x | +2.1% (0.2) | -3.4% (-0.5) |
| B_ICw_all | top_decile | MA100 | IS | +14.8% | 14.3% | 1.04 | -32% | 6.9x | +6.7% (0.7) | -2.3% (-0.3) |
| B_ICw_all | top_decile | MA100 | OOS | +2.5% | 18.1% | 0.23 | -32% | 9.1x | +1.1% (0.1) | -4.4% (-0.6) |
| B_ICw_all | top20 | none | IS | +11.2% | 18.3% | 0.67 | -45% | 7.2x | +3.6% (0.5) | -4.8% (-1.1) |
| B_ICw_all | top20 | none | OOS | +2.3% | 22.1% | 0.22 | -45% | 10.3x | +1.8% (0.2) | -3.7% (-0.6) |
| B_ICw_all | top20 | MA200 | IS | +14.1% | 15.0% | 0.95 | -28% | 5.7x | +6.1% (0.6) | -2.8% (-0.4) |
| B_ICw_all | top20 | MA200 | OOS | +1.0% | 19.9% | 0.15 | -41% | 9.2x | -0.0% (-0.0) | -5.5% (-0.7) |
| B_ICw_all | top20 | MA100 | IS | +14.4% | 14.2% | 1.02 | -32% | 6.3x | +6.3% (0.7) | -2.7% (-0.4) |
| B_ICw_all | top20 | MA100 | OOS | +0.4% | 19.0% | 0.12 | -42% | 9.8x | -0.8% (-0.1) | -6.3% (-0.8) |
| A_EW_signif | gem_top_decile | none | IS | +15.5% | 17.7% | 0.91 | -33% | 11.1x | +8.2% (1.1) | -1.2% (-0.2) |
| A_EW_signif | gem_top_decile | none | OOS | +2.8% | 21.2% | 0.24 | -54% | 12.2x | +2.1% (0.3) | -3.4% (-0.5) |
| A_EW_signif | gem_top_decile | MA200 | IS | +17.2% | 14.2% | 1.19 | -22% | 8.1x | +9.3% (0.9) | -0.3% (-0.0) |
| A_EW_signif | gem_top_decile | MA200 | OOS | +3.6% | 18.8% | 0.29 | -48% | 10.1x | +2.4% (0.3) | -3.2% (-0.4) |
| A_EW_signif | gem_top20 | none | IS | +18.2% | 16.2% | 1.12 | -25% | 8.6x | +10.7% (1.8) | +0.8% (0.1) |
| A_EW_signif | gem_top20 | none | OOS | +2.7% | 21.4% | 0.23 | -55% | 12.2x | +2.0% (0.3) | -3.5% (-0.5) |
| A_EW_signif | gem_top20 | MA200 | IS | +15.8% | 12.8% | 1.22 | -21% | 6.4x | +7.6% (0.8) | -1.7% (-0.2) |
| A_EW_signif | gem_top20 | MA200 | OOS | +3.8% | 19.1% | 0.29 | -48% | 10.3x | +2.6% (0.3) | -2.9% (-0.3) |
| A_EW_signif | gem_top10 | none | IS | +15.8% | 17.2% | 0.94 | -35% | 11.3x | +8.3% (1.1) | -1.1% (-0.2) |
| A_EW_signif | gem_top10 | none | OOS | +1.8% | 23.6% | 0.20 | -58% | 13.6x | +1.6% (0.2) | -3.9% (-0.4) |
| A_EW_signif | gem_top10 | MA200 | IS | +17.6% | 14.2% | 1.21 | -23% | 8.4x | +9.7% (1.0) | +0.0% (0.0) |
| A_EW_signif | gem_top10 | MA200 | OOS | +1.0% | 21.8% | 0.16 | -59% | 11.7x | +0.4% (0.0) | -5.1% (-0.5) |
| A_EW_signif | terc_small_top_decile | none | IS | +8.0% | 18.3% | 0.51 | -37% | 14.9x | +0.0% (0.0) | -7.8% (-0.9) |
| A_EW_signif | terc_small_top_decile | none | OOS | -6.9% | 20.6% | -0.24 | -60% | 15.8x | -8.0% (-1.1) | -13.5% (-1.9) |
| A_EW_signif | terc_mid_top_decile | none | IS | +20.6% | 22.5% | 0.95 | -35% | 13.3x | +14.7% (1.3) | +4.1% (0.5) |
| A_EW_signif | terc_mid_top_decile | none | OOS | +3.3% | 23.9% | 0.26 | -54% | 14.0x | +3.1% (0.4) | -2.4% (-0.3) |
| A_EW_signif | terc_large_top_decile | none | IS | +6.6% | 22.9% | 0.40 | -62% | 10.3x | -0.4% (-0.0) | -8.1% (-1.3) |
| A_EW_signif | terc_large_top_decile | none | OOS | +3.0% | 27.4% | 0.25 | -55% | 10.4x | +3.8% (0.4) | -1.8% (-0.3) |
| B_ICw_all | gem_top_decile | none | IS | +18.3% | 16.8% | 1.08 | -31% | 11.0x | +10.9% (1.4) | +1.0% (0.2) |
| B_ICw_all | gem_top_decile | none | OOS | +7.2% | 18.3% | 0.47 | -40% | 11.7x | +5.6% (0.8) | +0.1% (0.0) |
| B_ICw_all | gem_top_decile | MA200 | IS | +18.2% | 13.7% | 1.29 | -19% | 8.2x | +10.3% (1.1) | +0.5% (0.1) |
| B_ICw_all | gem_top_decile | MA200 | OOS | +6.9% | 16.2% | 0.50 | -29% | 9.9x | +5.0% (0.6) | -0.5% (-0.1) |
| B_ICw_all | gem_top20 | none | IS | +17.3% | 15.6% | 1.10 | -27% | 8.6x | +9.7% (1.6) | +0.0% (0.0) |
| B_ICw_all | gem_top20 | none | OOS | +7.9% | 18.2% | 0.51 | -40% | 11.5x | +6.3% (0.9) | +0.8% (0.1) |
| B_ICw_all | gem_top20 | MA200 | IS | +15.7% | 12.2% | 1.26 | -20% | 6.7x | +7.4% (0.8) | -1.8% (-0.2) |
| B_ICw_all | gem_top20 | MA200 | OOS | +7.9% | 16.1% | 0.56 | -27% | 9.8x | +6.0% (0.7) | +0.4% (0.1) |
| B_ICw_all | gem_top10 | none | IS | +18.0% | 16.4% | 1.09 | -31% | 10.8x | +10.5% (1.4) | +0.7% (0.1) |
| B_ICw_all | gem_top10 | none | OOS | +9.8% | 18.8% | 0.59 | -35% | 13.7x | +8.1% (1.0) | +2.6% (0.3) |
| B_ICw_all | gem_top10 | MA200 | IS | +18.5% | 13.5% | 1.33 | -21% | 8.3x | +10.5% (1.1) | +0.7% (0.1) |
| B_ICw_all | gem_top10 | MA200 | OOS | +8.4% | 17.3% | 0.56 | -27% | 11.6x | +6.6% (0.7) | +1.1% (0.1) |
| B_ICw_all | terc_small_top_decile | none | IS | +11.8% | 16.8% | 0.75 | -25% | 14.3x | +4.0% (0.4) | -4.6% (-0.5) |
| B_ICw_all | terc_small_top_decile | none | OOS | -0.4% | 16.3% | 0.06 | -39% | 14.9x | -2.1% (-0.3) | -7.6% (-1.3) |
| B_ICw_all | terc_mid_top_decile | none | IS | +10.6% | 21.0% | 0.58 | -45% | 14.2x | +3.5% (0.4) | -4.9% (-0.7) |
| B_ICw_all | terc_mid_top_decile | none | OOS | +7.2% | 20.0% | 0.45 | -43% | 13.3x | +6.0% (0.7) | +0.5% (0.1) |
| B_ICw_all | terc_large_top_decile | none | IS | +3.1% | 21.9% | 0.25 | -65% | 10.5x | -4.9% (-0.5) | -11.7% (-1.8) |
| B_ICw_all | terc_large_top_decile | none | OOS | +1.0% | 24.8% | 0.17 | -51% | 11.2x | +1.1% (0.1) | -4.4% (-0.7) |

Capacity (hidden-gem top-20, OOS, position = 10% of ADV20): median per-name 0.6-0.7 bn VND, 25th pct 0.25-0.27 bn, 10th pct 0.14-0.15 bn; implied portfolio AUM of ~12-13 bn VND (median) or ~5 bn VND (25th pct) for 20 names (about USD 0.2-0.5m). Turnover 10-14x per year means these costs are probably understated at larger size (slippage not scaled for size).

## 8. Deflated Sharpe, PBO
- DSR (OOS, selection across all trials) for best candidates, N = number of trials assumed:
| strategy | SR OOS (ann) | DSR N=5 | N=10 | N=30 | N=94 | N=201 |
|---|---|---|---|---|---|---|
| B gem top10 | 0.59 | 0.63 | 0.51 | 0.35 | 0.22 | 0.16 |
| B gem top20 MA200 | 0.56 | 0.60 | 0.48 | 0.32 | 0.20 | 0.15 |
| B top-decile | 0.29 | 0.36 | 0.24 | 0.13 | 0.07 | 0.04 |
| A top-20 | 0.20 | 0.28 | 0.18 | 0.09 | 0.04 | 0.02 |
Required DSR >0.95: none passes at any N. Full list `results_dsr.csv`, `results_dsr_sens.csv`.
- CSCV (16 blocks, 12,870 combinations, 94 strategies, 562 weeks): **PBO = 17.5%**. This is flattering, because the trial set contains many strategies that are obviously bad (best-IS strategies are typically low-vol/liquidity ones, which keep doing well); it says the *ranking* of simple factor portfolios is fairly stable, not that absolute returns are significant.

## 9. Current lists (as of 2026-11-25 close; composite B, weights fixed from IS; research output, not advice)
Eligibility: ADV20>=1bn, price>=5k, not ceiling-locked. The factor columns show the favourable-signed z (higher = better by IS direction). Caution: the composite largely rewards low-vol, liquid, near-52w-high stocks; OOS evidence is a weak long-only edge, so these are screens, not buy signals. VIC dominates because it is near the 52w high with 12-1 momentum and very high liquidity; check for price limits and fundamentals. Composite A lists in `current_*_A.csv`.

### Top-20 "strong" (composite B)
| # | sym | exch | px (k VND) | ADV20 (bn) | comp z | mom12-1 | /52w-high | strongest z factors | weakest z factors |
|---|---|---|---|---|---|---|---|---|---|
| 1 | VIC | HOSE | 245.4 | 446.3 | 1.15 | +116% | 96% | amihud +2.9, beta252 +2.5, mom_12_1 +2.1 | max5 -0.2, ceil_freq63 -1.0 |
| 2 | SBG | HOSE | 14.7 | 1.76 | 1.05 | +18% | 100% | high52 +2.9, trend_q +2.3, mom_6_1 +1.8 | amihud -0.4, beta252 -1.3 |
| 3 | BAF | HOSE | 30.6 | 50.58 | 1.02 | +17% | 98% | high52 +2.2, ivol63 +1.7, trend_q +1.6 | ceil_freq63 +0.3, beta252 -0.9 |
| 4 | MSB | HOSE | 16.25 | 135.26 | 1.00 | +51% | 98% | high52 +2.3, dist_ma200 +2.0, trend_q +1.9 | max5 -0.0, beta252 -0.3 |
| 5 | HDB | HOSE | 21.7 | 323.11 | 0.91 | +23% | 94% | trend_q +2.2, amihud +1.9, high52 +1.6 | ceil_freq63 +0.3, max5 +0.1 |
| 6 | VTZ | HNX | 20.4 | 15.31 | 0.89 | +9% | 98% | ivol63 +2.2, high52 +2.1, max5 +1.5 | trend_q +0.1, beta252 -1.3 |
| 7 | ABB | UPCOM | 16.9 | 10.76 | 0.87 | +50% | 93% | mom_6_1 +1.6, high52 +1.6, mom_12_1 +1.5 | amihud +0.3, beta252 -0.7 |
| 8 | KDC | HOSE | 50.0 | 3.72 | 0.84 | -1% | 95% | max5 +2.5, ivol63 +2.5, high52 +1.8 | mom_12_1 +0.3, beta252 -1.6 |
| 9 | NAF | HOSE | 48.8 | 13.22 | 0.75 | +42% | 91% | ivol63 +2.9, max5 +2.1, amihud +1.5 | trend_q -0.2, beta252 -2.9 |
| 10 | MCP | HOSE | 31.35 | 1.01 | 0.73 | +6% | 99% | high52 +2.5, trend_q +1.4, dist_ma200 +1.4 | amihud -0.8, beta252 -1.5 |
| 11 | QNS | UPCOM | 47.2 | 5.53 | 0.67 | +26% | 89% | max5 +2.3, ivol63 +1.1, trend_q +1.1 | amihud +0.0, beta252 -1.8 |
| 12 | SCG | HNX | 64.2 | 1.54 | 0.65 | +1% | 87% | ivol63 +2.3, max5 +1.8, high52 +0.8 | amihud -0.3, beta252 -1.4 |
| 13 | VPL | HOSE | 97.0 | 65.45 | 0.65 | +19% | 91% | beta252 +1.7, dist_ma200 +1.5, high52 +1.2 | mom_6_1 +0.0, ivol63 -0.1 |
| 14 | VEA | UPCOM | 31.0 | 20.38 | 0.63 | +5% | 89% | trend_q +1.4, ivol63 +1.1, high52 +1.0 | ceil_freq63 +0.3, beta252 -1.1 |
| 15 | TLG | HOSE | 52.2 | 9.29 | 0.62 | +26% | 91% | trend_q +1.7, mom_6_1 +1.2, high52 +1.1 | amihud -0.1, beta252 -0.5 |
| 16 | LHG | HOSE | 25.8 | 1.16 | 0.60 | -6% | 90% | max5 +1.9, ivol63 +1.6, high52 +1.1 | amihud -0.8, beta252 -0.8 |
| 17 | VAB | HOSE | 9.0 | 4.6 | 0.60 | -11% | 84% | max5 +2.9, ivol63 +2.1, high52 +0.7 | beta252 -0.3, trend_q -0.4 |
| 18 | DHC | HOSE | 35.45 | 16.41 | 0.59 | +31% | 90% | trend_q +1.5, mom_6_1 +1.3, dist_ma200 +1.1 | beta252 +0.1, ivol63 +0.0 |
| 19 | VLB | UPCOM | 48.0 | 2.55 | 0.57 | +19% | 93% | trend_q +1.6, high52 +1.5, dist_ma200 +1.2 | beta252 -0.8, amihud -0.9 |
| 20 | HTN | HOSE | 6.95 | 1.36 | 0.55 | +23% | 90% | trend_q +2.1, dist_ma200 +1.9, mom_6_1 +1.8 | amihud -0.9, ceil_freq63 -1.0 |

### Top-10 "hidden gem" (lower two ADV terciles, composite B)
| # | sym | exch | px (k VND) | ADV20 (bn) | comp z | mom12-1 | /52w-high | strongest z factors | weakest z factors |
|---|---|---|---|---|---|---|---|---|---|
| 1 | SBG | HOSE | 14.7 | 1.76 | 1.05 | +18% | 100% | high52 +2.9, trend_q +2.3, mom_6_1 +1.8 | amihud -0.4, beta252 -1.3 |
| 2 | VTZ | HNX | 20.4 | 15.31 | 0.89 | +9% | 98% | ivol63 +2.2, high52 +2.1, max5 +1.5 | trend_q +0.1, beta252 -1.3 |
| 3 | ABB | UPCOM | 16.9 | 10.76 | 0.87 | +50% | 93% | mom_6_1 +1.6, high52 +1.6, mom_12_1 +1.5 | amihud +0.3, beta252 -0.7 |
| 4 | KDC | HOSE | 50.0 | 3.72 | 0.84 | -1% | 95% | max5 +2.5, ivol63 +2.5, high52 +1.8 | mom_12_1 +0.3, beta252 -1.6 |
| 5 | NAF | HOSE | 48.8 | 13.22 | 0.75 | +42% | 91% | ivol63 +2.9, max5 +2.1, amihud +1.5 | trend_q -0.2, beta252 -2.9 |
| 6 | MCP | HOSE | 31.35 | 1.01 | 0.73 | +6% | 99% | high52 +2.5, trend_q +1.4, dist_ma200 +1.4 | amihud -0.8, beta252 -1.5 |
| 7 | QNS | UPCOM | 47.2 | 5.53 | 0.67 | +26% | 89% | max5 +2.3, ivol63 +1.1, trend_q +1.1 | amihud +0.0, beta252 -1.8 |
| 8 | SCG | HNX | 64.2 | 1.54 | 0.65 | +1% | 87% | ivol63 +2.3, max5 +1.8, high52 +0.8 | amihud -0.3, beta252 -1.4 |
| 9 | VEA | UPCOM | 31.0 | 20.38 | 0.63 | +5% | 89% | trend_q +1.4, ivol63 +1.1, high52 +1.0 | ceil_freq63 +0.3, beta252 -1.1 |
| 10 | TLG | HOSE | 52.2 | 9.29 | 0.62 | +26% | 91% | trend_q +1.7, mom_6_1 +1.2, high52 +1.1 | amihud -0.1, beta252 -0.5 |

(Composite A top-20: VIC, MSB, SBG, HDB, BAF, ABB, KDC, DHC, VTZ, VPL, TLG, NAF, PET, VPB, QNS, VEA, HCM, HTN, MCP, GMD.)
Full per-factor z in `current_top20_B.csv`, `current_gem10_B.csv`.

## 10. Caveats
1. **Survivorship**: only currently listed symbols (1,505) are included. Delisted/suspended/ bankrupt names (concentrated in small, high-vol, illiquid, lottery-like stocks) are missing. Direction: absolute returns of all portfolios overstated, most for small/illiquid/high-vol buckets and for the hidden-gem bucket; the *low-vol/anti-lottery* premium is probably **understated** (junk that died is missing), and momentum spread understated (dead losers missing). Net: hidden-gem OOS numbers are upward biased; I cannot size it.
2. Adjusted-price artefacts (section 2): early-period ADV understated, IS universe skews large; price floor not applied pre-2025-06; unadjusted-looking spikes zeroed (12,165).
3. Short sample: effective IS = 4 years, OOS = 5.9 years with one dominant regime (2022 crash, Vingroup-driven VNINDEX). Equal-weight universe lost money OOS while VNINDEX (cap-weighted) rose, so the benchmark choice changes conclusions.
4. Slippage/impact assumptions are flat; no price-limit queue modelling, ceiling/floor lock approximated; ADV-20 capacity numbers are rough; no short selling (so IC mostly captured on the short side is not harvestable). T+2 handled via >=5-day holding only.
5. Weekly IC tests use NW lag 4 as instructed; 4w IC with overlap 3 weeks is only roughly corrected. Cross-factor correlation (ivol/max5/amihud/ceil_freq overlap) means HLZ counts overstate independent evidence; the 4-5 "significant" factors are probably 1-2 underlying effects (low-vol/lottery and liquidity).
6. Composite B uses IS mean IC of all factors and A selects factors by IS t>2: both OOS-evaluated honestly, but I looked at many OOS variants (regime x portfolio size x tercile) and that is what DSR penalises.
7. Index (VNINDEX) used both for betas/residuals and regime filter; DNSE index series assumed correct.
