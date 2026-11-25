# VN30F1M retail strategy backtest (2018-10 to 2026-11-25)

## Data and conventions
- Source: DNSE chart API (`derivative` VN30F1M / VN30F2M, `index` VN30). Timestamps are UTC; ICT = UTC+7 (bar 02:00 UTC = 09:00 ICT).
- Depth: futures 1D/1H/15/5/1 all from 2018-10-22 (about 2,017 sessions; 458k 1-min bars). VN30 index 1D/1H/15/5/1 from 2020-05-11 (index intraday has no 09:00-09:10 bars before 2020-05, 11:30 and 14:30 bars are sparse). Intraday studies use 5-min bars (1-min cached, not needed). Raw CSV in `data/vn30f/`.
- Sessions in data: 09:00-11:30, 13:00-14:30 continuous, 14:30 ATC, 14:45 closing print. All intraday strategies exit at the close of the 14:25 bar (~14:30 price) to stay out of the ATC auction.
- Roll: F1M switches to the next contract on the first session after the 3rd-Thursday expiry (97 rolls). Check: mean |overnight gap| on roll days is 9.7 pts when computed against the old F1M close and 4.75 pts when computed against the F2M close of the previous day (non-roll days 4.2). So the roll ref = previous F2M close; the daily series is additively back-adjusted; the daily strategies pay one extra round trip when holding through a roll. Intraday strategies are unaffected. Basis strategies skip roll day and the day after.
- Costs (per contract): 5,700 VND per side (broker 3,000 + exchange 2,700) = 0.057 pt; slippage 1 tick (0.1 pt) per side in the main case, 2 ticks and 0 ticks as sensitivities; VSDC 2,550 VND per calendar night held. Round trip in the main case = 0.314 pt = 31,400 VND. Margin = 20% x notional (about 36M VND at 1,800 pts).
- Signals use the bar close; fills at the next bar open (or ATC close for daily strategies, with the signal computed from the 14:25 bar so no look-ahead).
- Sharpe: daily P&L series including zero-days, x sqrt(252). NW t: Newey-West lag 5. Bootstrap: stationary block bootstrap (mean block 10, 2,000 reps) on the Sharpe. MaxDD: additive cumulative return on margin (units of 1 margin, so -0.5 means a 50% drawdown of one margin deposit). DSR: Bailey-Lopez de Prado with **N = 21 trials** (every variant counted; the 2 vol-target/unit variants of S5 counted separately) and the cross-trial SR variance; implied annualised benchmark SR0 = 1.28.
- Walk-forward: expanding train window (min 24 months), 6-month test blocks, choose the variant with the best training Sharpe within the family (flat if best train Sharpe <= 0); OOS starts 2020-11 (S4 2022-05).

## Results, 1-tick slippage, full sample (trial list = 21)
| Variant | n | win% | avg win / loss (pts) | exp pts (VND) | PF | Sharpe | NW t | boot 95% SR | ann. ret on margin | MaxDD (margin) | DSR | yrs>0 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1A first-30m -> rest of day | 1983 | 52% | 10.0 / -9.0 | 0.89 (89k) | 1.21 | 0.83 | 2.29 | 0.11..1.61 | 74% | -2.23 | 0.10 | 7/9 |
| S1B first-30m incl. overnight -> rest | 1990 | 51% | | 0.76 | 1.17 | 0.76 | 2.05 | 0.11..1.45 | 68% | -1.24 | 0.07 | 6/9 |
| S1C first-30m -> last 30m | 1983 | 50% | | -0.05 | 0.98 | -0.26 | -0.69 | | -12% | -3.0 | 0 | 4/9 |
| S1D first-30m incl. overnight -> last 30m (Gao et al.) | 1990 | 48% | | -0.13 | 0.95 | -0.26 | -0.75 | | -12% | -1.8 | 0 | 4/9 |
| S2 ORB15, stop mid-range | 2008 | 33% | 11.7 / -4.1 | 1.05 | 1.38 | 1.66 | 4.68 | 1.07..2.26 | 107% | -0.67 | 0.89 | 9/9 |
| **S2 ORB15, stop opposite side (close-based)** | 2008 | 41% | 10.9 / -5.6 | 1.22 (122k) | 1.37 | 1.73 | 5.00 | 1.17..2.28 | 123% | -0.76 | 0.92 | 9/9 |
| S2 ORB30, stop mid | 1991 | 36% | 10.9 / -4.7 | 0.94 | 1.31 | 1.54 | 4.38 | 0.92..2.10 | 100% | -0.54 | 0.79 | 9/9 |
| **S2 ORB30, stop opposite (close-based)** | 1991 | 45% | 10.2 / -6.3 | 1.13 (113k) | 1.33 | 1.75 | 4.83 | 1.16..2.32 | 127% | -0.52 | 0.92 | 9/9 |
| S3 gap fade k=0.5 / cont k=0.5 | 313 | 47%/50% | | -0.57 / -0.06 | 0.90/0.99 | -0.16 / -0.09 | -0.5 / -0.3 | | | | 0 | 4-5/9 |
| S3 gap fade k=1.0 / cont k=1.0 | 68 | 49%/47% | | 0.02 / -0.65 | 1.00/0.91 | 0.09 / -0.18 | 0.3 / -0.6 | | | | 0 | 3-5/9 |
| S4a basis OU intraday z=2.0 (F only) | 463 | 51% | | 0.23 | 1.08 | 0.16 | 0.46 | -0.50..0.85 | 4% | -0.74 | 0.00 | 4/9 |
| S4b basis OU z=2.5 | 137 | 52% | | -0.04 | 0.99 | -0.06 | -0.18 | | | | 0 | |
| S4c basis convergence, enter T-5, exit expiry, \|b\|>1.5 | 60 | 58% | 31.2 / -29.1 | 6.1 (610k) | 1.50 | 0.49 | 1.41 | -0.17..1.11 | 21% | -0.68 | 0.01 | 6/9 |
| S5 MA20/60 unit | 43 | 30% | | 10.3 | 1.32 | 0.23 | 0.66 | -0.46..0.92 | 25% | -2.4 | 0.00 | 4/9 |
| S5 TS21 unit / vol-target | 171 | 35% | 52.6 / -21.5 | 4.0 | 1.29 | 0.28 / 0.43 | 0.83 / 1.22 | -0.28..1.18 | 31% / 47% | -2.9 / -1.9 | 0.00-0.01 | 5-6/9 |
| S5 TS63 unit / vol-target | 78 | 36% | 76.5 / -30.6 | 7.8 | 1.40 | 0.33 / 0.39 | 0.97 / 1.08 | -0.35..1.13 | 37% / 41% | -2.4 / -2.1 | 0.00-0.01 | 4-5/9 |
| Benchmark: always long 1 contract | | | | | | 0.54 | 1.53 | | 61% | | | |

Full table (all 3 cost levels, per-year Sharpes, skew/kurtosis): `results_fullsample.csv`.

Cost sensitivity (Sharpe at 0 / 1 / 2 ticks): ORB15_opp 2.03 / 1.73 / 1.43; ORB30_opp 2.04 / 1.75 / 1.46; S1A 1.07 / 0.83 / 0.59; S4c 0.50 / 0.49 / 0.47; all S3 and S4a/b near 0 at every cost level.

## Walk-forward OOS (train expanding, 6-month test blocks; `results_walkforward.csv`)
| Family | OOS from | n trades | Sharpe | NW t | boot 95% SR | exp pts (VND) | PF | DSR (N=21) | 2-tick Sharpe |
|---|---|---|---|---|---|---|---|---|---|
| S2 ORB | 2020-11 | 1487 | 1.52 | 3.82 | 0.86..2.16 | 1.13 (113k) | 1.28 | 0.73 | 1.27 (t 3.2) |
| S1 first30 momentum | 2020-11 | 1491 | 0.63 | 1.57 | -0.19..1.45 | 0.72 | 1.15 | 0.06 | 0.60 |
| S3 gap | 2020-11 | 52 | -0.24 | -0.72 | | -2.1 | 0.76 | 0 | -0.26 |
| S4 basis | 2022-05 | 55 | 0.53 | 1.22 | -0.32..1.33 | 4.6 (455k) | 1.35 | 0.05 | 0.52 |
| S5 daily trend (vol-tgt chosen) | 2020-11 | 64 | 0.31 | 0.76 | -0.58..1.14 | -0.5 | 0.98 | 0.01 | 0.29 |

ORB OOS Sharpe by year (WF series): 2020 +2.5, 2021 +2.5, 2022 +2.1, 2023 +1.2, 2024 +0.7, 2025 +1.1, 2026 +0.6.

## Findings

**1. Opening range breakout is the only strategy that survives costs and stays significant**, and it is positive in all 9 calendar years in all four variants, net of 1 tick per side. NW t is 4.4-5.0 (p < 1e-5, which clears a Bonferroni correction for 21 trials and the Harvey-Liu-Zhu t>3 bar). It also survives 2 ticks (Sharpe 1.3-1.5), a 5-10 minute execution delay (ORB30_opp 1.52 and 1.62; ORB15_opp 1.57 and 1.76; `results_orb_latency.csv`), dropping the 10 best trades (Sharpe 1.4), and shows alpha vs buy-and-hold of +10 bp/day (t 5; beta about 0 so it is not hidden long exposure). Long and short both pay (ORB30_opp: short 1.35 pts/trade, long 0.93).
Caveats, honestly stated:
 - DSR is 0.92 at best (needs 0.95), because the 21 trials span heterogeneous families and the cross-trial SR variance is large (SR0 = 1.28). Within-family honesty (4 trials) the effect is clearly real; at N=21 it is just under the 0.95 bar. Walk-forward OOS DSR 0.73 (t 3.8). Verdict: "very likely real, not yet DSR-certified".
 - The edge decays: ORB30_opp Sharpe 2.4 in 2018-22 vs 0.9 in 2023+ (t 1.9 in 2023+); ORB15_opp 1.9 vs 1.5 (2023+ NW t 2.98, CI 0.65..2.25). Expectancy per trade fell from about 1.9 pts (2021-22) to 0.35-1.0 pts (2024-26). Plan on 0.5-1.0 pts/trade (50-100k VND) not 1.2.
 - Win rate is only 41-45% (33-36% for mid stop); profit comes from trend days (top 10 trades = 26% of total pts). Needs discipline through losing streaks.
 - ORB15 and ORB30 trade the same days (not independent); S1A shares the same driver (corr of daily P&L 0.24).

**2. Intraday momentum (S1)**: the first-30-minute return does predict the rest of the day in direction (S1A: Sharpe 0.83, t 2.3 net of costs, but DSR 0.10, WF OOS t 1.6, negative in 2023-24). The Gao et al. effect on the **last 30 minutes does not exist** in VN30F (corr first30 vs last30 return 0.007; Sharpe -0.26 either definition). Reported as a negative result. (The contrarian sign is not tested to avoid an uncounted extra trial.)

**3. Gap fade / continuation (S3)** fails both ways and at both thresholds (all Sharpe within +-0.2, t<0.7, 52 OOS trades, negative expectancy after costs). Overnight gaps are information, not noise, and not exploitable either direction.

**4. Basis mean reversion (S4)**: the intraday OU z-score on F alone (index cannot be shorted by retail, so this is a directional bet) has no edge (t 0.5 / -0.2). Basis noise vs the index at 5-min is large (sd 3-8 pts) and partly stale-index timing. Convergence to expiry (enter T-5 on |basis| > 1.5, exit at expiry close) has +6.1 pts per trade (610k VND) and 58% win but only 60 trades, t 1.4, DSR 0.01: not demonstrable. WF OOS 55 trades, t 1.2. Retail cannot arbitrage this properly (no stock-basket short).

**5. Daily trend (S5)**: 20/60 MA and 21d/63d TSMOM, with and without vol targeting, are all under buy-and-hold on risk-adjusted terms (Sharpe 0.2-0.43 vs 0.54 for always long), NW t 0.7-1.2, DSR about 0; positive-year count 4-6 out of 9. VN30F had a bull drift (long-only Sharpe 0.54, t 1.5, itself not significant). Win rate 22-36%, drawdowns 2-3 margins (it is leveraged 5x). Fails.

**6. Seasonality diagnostics (`results_seasonality_*.csv`)**
 - Overnight (close to next open) mean +5.2 bp/day (t 3.9), intraday open-to-14:30 +0.3 bp (t 0.1): the entire index drift in this sample is overnight. But the holding fee and slippage make a naive "hold overnight" strategy equal to buy-and-hold with the same risk; not a trade by itself (not added as a trial).
 - Day of week (BH-corrected q): Wednesday +30 bp (q<0.001), Tuesday +19 bp (q 0.02), Monday -21 bp (intraday -21 bp, q 0.007). Not traded (would add 5+ trials; regarded as hypothesis for future out-of-sample).
 - Time of day: only 4 of 48 5-min bars have BH q<0.1 (11:05 -0.9 bp, 13:05 +0.9, 11:25 +0.8, 09:10 +0.7): sub-spread, not tradable. 13:00-14:00 block +3.2 bp (t 2.5), uncorrected.
 - Expiry week: expiry day intraday +18 bp (t 2.1), T-3 and T-5 negative intraday (-22 bp, -27 bp, t -1.8, -2.5); nothing survives multiple-testing. Volatility on expiry day is not higher (abs return 90 vs 95 bp).

## Recommendations for the desk
1. **Publish ORB as the single "validated" intraday rule, labelled "decaying edge, expect ~Sharpe 1.0-1.5, not 1.7"**: 15-min opening range (bars 09:00, 09:05, 09:10; high/low of the three bars), the first 5-min bar close above the high -> buy next bar open (below the low -> sell). Exit: close of any 5-min bar back through the opposite side of the range (execute next bar open), otherwise flat at 14:25 (14:30 price); no entries after 14:15; one trade per day; no re-entry. ORB30 (range 09:00-09:25) is the alternate; do not mix: both are the same bets.
2. Fills: use limit-or-market with at most 1 tick concession; the edge survives 2 ticks and a 5-10 min delay, so it is feasible by hand/alerts but not for "chasing". Do not trade the ATC.
3. Risk rules (VND per contract at about 1,800 pts: margin 36M): worst trade in 8 years -56 pts (5.6M VND, about 4%) with the close-based stop; 1% worst day -19 pts; max drawdown on one contract -147 to -176 pts (14.7-17.6M VND, about 40-50% of one margin deposit). Therefore: fund at least 2.5-3x margin per contract (about 90-110M VND/contract), never more than 1 contract per 90M VND; cap 2% of equity per trade with a 2% hard stop (a close-based stop can be gapped through at the +-7% limit: 17 sessions with |move| >= 6%, worst day -7.0%, so a close-based stop cannot protect at a limit-locked session); stand aside on days after a |close-to-close| move > 5% (18 days <-5%) is untested and left as a hypothesis.
4. Daily-position features should be framed as risk-management (vol targeting 20%, position cap 2), not as alpha: no daily trend rule beat buy-and-hold net of costs.
5. Do not publish gap fade, last-30-min momentum, or basis OU as signals. If the desk wants a basis page, show the basis and days-to-expiry as information, not as a trade.
6. Re-run monthly: the ORB expectancy decline is the main live risk (2024 expectancy 0.35 pts for ORB30). Kill rule: if the trailing 250-day NW t of the ORB P&L < 1 and expectancy < 0.3 pt/trade, pause.

## Limitations
- 5-min bars: stops/entries inside a bar are not simulated; the bar-open fill plus slippage is an approximation. No order-book data, so a 1-tick spread/slippage assumption could be optimistic in fast markets (the 2-tick case is given).
- Variant selection and the parameter grid are mine; DSR uses N=21 but trials explored interactively before the final grid (the S1 contrarian sign, ORB entry window, different exits) are not fully countable.
- Margin: 20% assumed (actual 17-25%, changes with exchange/broker); the broker's call level is unknown.
- Daily/limit-day fills are assumed to be at bar prices; on limit days exits may be impossible.
- Data are provider-reconstructed continuous contracts; a few early bars (2018-2019) have missing 5-min bars filled forward.
- Daily-limit +-7% is respected in the data (max |ret| = 6.9999%).

## Files
`results_fullsample.csv`, `results_walkforward.csv`, `results_orb_latency.csv`, `results_seasonality_{tod,dow,expiry}.csv`, `trades_ORB15_opp_slip1.csv`, `trades_ORB30_opp_slip1.csv`, `data/vn30f/*.csv`, `data/vn30f/daily_built.csv` (roll flags, adjusted prices), scripts in `scripts/` (`fetch.py`, `lib.py`, `strats.py`, `run.py`, `analyze.py`, `extra.py`, `extra2.py`), console logs `analyze_out.txt`, `extra_out.txt`, `extra2_out.txt`.
