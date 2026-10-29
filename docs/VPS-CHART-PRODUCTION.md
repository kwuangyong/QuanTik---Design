# VPS chart and interface wording release

Release `20261018-vps-chart-01` is live on https://quantik.io.vn/dashboard and
https://quantik.io.vn/charts?symbol=ABW, from source commit `b8e0b74`.
Deployed on 2026-10-18 (Asia/Ho_Chi_Minh).

`ChartSurface` now embeds `https://chart.vps.com.vn/tv/` with the selected
symbol, `allowFullscreen=true`, `resolution=1D|1W|1M`, and `lang=vi`.
It supports symbols outside the local metadata list without an exchange hint.
The Dashboard modal and full chart page retain their Quant sidebar and an
external chart link. The synthetic candle component is no longer rendered.

Dashboard labels no longer expose snapshot/sample/mock terminology or the
trading-session identifier. Search and missing-chart messages use customer
wording. Existing index/sector fixtures are still identified as reference data;
this release does not turn them into live market data. Mathematical simulation
terminology in Quant explanations retains its scientific meaning.

The Docker image was built locally, verified, transferred by SSH, and loaded
on the VPS. Production pins the imported frontend to
`sha256:9629cf29f3825bc3e738e11bd6773c296d24e76c6af72e4aeecb575d54b901d2`.
Only the web container changed. API image remains
`sha256:7608f657c3923b5617cc9c22e292c7b7d9939873f2f3e1b50d6b1ded43461714`;
other container IDs were preserved. No migration or Quant request was issued.
Public readiness reports schema `0017`; API and web are healthy.

Pre-release backup: `backups/quantik-20261018T115607Z.dump`. Restricted recovery
copies, the deployment script/log and image metadata are under
`/opt/quantik/releases/20261018-vps-chart-01/`. The previous frontend image is
`sha256:9b40366d95f75685df197e03973d691f19ff945e8a2ff1ab6dc29e4f978b3617`.

Validation: typecheck and Linux production build passed. Twenty desktop/mobile
browser scenarios passed against the final Docker image, with external chart
content intercepted only in those deterministic tests. Separate unmocked
production checks at 1440px and 390px confirmed AGR connectivity, removal of
development labels, VPS chart HTTP 200, actual FPT chart canvases, iframe
fullscreen permission, weekly-resolution URL updates and the ABW chart route.
Neither viewport had page horizontal overflow or browser JavaScript errors.
The VPS chart's own controls, history availability and data timing remain
controlled by VPS. Verification scripts, JSON and screenshots are retained
locally in the temporary `quantik-vps-chart-20261018-01` directory.

## Chart page follow-up

Release `20261018-chart-page-01`, source `7da5a9d`, replaces the Dashboard chart
modal with normal links to `/charts?symbol=...`. Both the symbol and chart icon
open the dedicated page in the same tab; browser Back returns to Dashboard.
VPS chart controls and the Quant sidebar are preserved.

Production frontend is pinned to
`sha256:3df5206d1610ae23b30372c1747c7f65cbf1dff1884b7f7f6d66a6d362f4fc04`.
Only web was recreated; API/other containers and schema `0017` were preserved.
Recovery artifacts are in `/opt/quantik/releases/20261018-chart-page-01/`, with
verified backup `backups/quantik-20261018T120552Z.dump` and the prior image above.
Typecheck, Linux build and twenty desktop/mobile browser scenarios passed.
Unmocked public checks at 1440px and 390px verified both navigation links,
browser Back, absence of the chart modal, real VPS chart canvases, weekly URL
selection and ABW access. Neither viewport had overflow or JavaScript errors.
Local evidence is retained in temporary `quantik-chart-page-20261018-01`.
