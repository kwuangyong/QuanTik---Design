# Quant: a simpler report with interactive visuals

The default reader answers everyday questions before showing model names or
diagnostics. Sixteen initially expanded model sections are replaced by a short
conclusion and four illustrated cards: current price/trend, simulated price
ranges, historical/forecast risk and the backend's conditional trade levels.
Each chart explains what its axes, colors and values mean in plain Vietnamese.

The original commentary is under “Đọc nhận định đầy đủ”.
“Xem phân tích chuyên sâu” lazily opens the original sixteen module readers,
all collapsed, plus research charts/tables, warnings and version details. The
full page and compact chart sidebar share the reader; compact cards stay in a
single column. Request submission, idempotency, quota and report access are
unchanged. No backend or API schema changes are required.

## Data semantics

- Scenario 3D projects the five reported P05/P25/P50/P75/P95 curves from
  `research.cone`. Height is VND price, the horizontal axis is the reported
  session and depth separates percentile layers. Connecting those aggregates
  does not create individual Monte Carlo paths. A session slider selects an
  existing report point; the 2D view uses the same aggregate values.
- The HMM 3D scene uses `hmm.state_probs` only when all three probabilities are
  finite, in 0–100 and total approximately 100. A fallback never gets invented
  probability bars. Classification confidence is explicitly distinguished from
  the probability of a profitable trade.
- P05–P95 contains approximately 90% of simulated outcomes at a given session.
  It is conditional on model assumptions, and the median is not a guaranteed
  price. Historical drawdown is labelled historical; forecast volatility is
  described as magnitude, not price direction.
- Section UNAVAILABLE/DISABLED, nested `available=false`/errors and invalid
  numeric data cannot become primary metrics. Missing/invalid/wrong-unit or
  cross-symbol research never falls back to demo data. Positive and ordered
  percentile prices and strictly increasing sessions are checked before plotting.
- BUY_NOW with executable=false reads “Chờ hoàn tất điều kiện”. Forecasts and
  probabilities never override the backend action. Entry/stop/target levels are
  conditional; reference sizing remains explicitly labelled.

## Interaction

SVG scenes use a 3D projection with mouse/touch dragging, arrow keys, a native
rotation slider and reset. There is no autoplay, animation loop, rendering
dependency or fabricated GARCH surface. ResizeObserver keeps the geometry within
the page/sidebar; CSS theme colors support dark/light mode. Vertical touch
scrolling remains available. The scene requires no new provider call or model
run and does not consume an additional Quant request.

## Verification scope

Existing report/browser fixtures exercise the simple default, advanced disclosure,
both 3D models, rotation, selected-session values, 2D alternative, reopened report
URLs, missing/invalid research, fallback probabilities, disabled metrics and a
non-executable BUY_NOW. Existing request/idempotency/access checks are retained.
The sidebar case verifies the same reader without mixing sample price candles
with report data. Browser fixtures verify UI behavior, not model/live-market
acceptance.

The final Linux production image (`quantik-web:quant-simple-preview`) built
successfully, including TypeScript checks. Six focused browser checks against
that image passed across desktop/mobile: the full report, compact sidebar and
unavailable/fallback/non-executable cases. They also cover rotation, synchronized
2D/3D session selection, advanced disclosure and light/dark rendering. The
earlier full 16-case report/sidebar suite passed before the final layout refinements.
Native Windows builds intermittently exhausted Node's native allocator during
worker/tracing finalization; the final validation used Linux with two build
workers. No system memory settings or repository build configuration changed.

## Production release — 2026-10-18

Deployed to https://quantik.io.vn/analysis as
`20261018-quant-simple-reader-01`, from frontend commit `d4761af`.
The imported frontend image is pinned to
`sha256:24596a1be38d29e4a56ca2853d4ae2e1fcb021e220a67976530b1fda726d903c`.
Only the web service was recreated. The API image remains
`sha256:7608f657c3923b5617cc9c22e292c7b7d9939873f2f3e1b50d6b1ded43461714`;
no migrations, model runs or provider calls were requested by this release.

The database backup `quantik-20261018T111440Z.dump` was verified before the
switch. Restricted environment/Compose recovery copies and pinned image
metadata are retained on the VPS in
`/opt/quantik/releases/20261018-quant-simple-reader-01/`.
Both application containers are healthy, `/health/ready` reports ready with
schema `0017`, and the public analysis page responds successfully.

Authenticated browser checks used an existing completed SSI report at 1440px
and 390px. Scenario 3D rotation, session selection, switching to 2D, actual HMM
probability bars, sixteen lazily loaded advanced sections, reopening the report
and light theme passed. Neither viewport had horizontal overflow or JavaScript
errors. Anonymous report access returned 401. No analysis submissions occurred;
quota counters were unchanged and the audited temporary session was revoked.
Screenshots and verification metadata are retained locally outside the repository
because authenticated screenshots can contain account details. These checks
verify presentation of an existing report, not model or market acceptance.
