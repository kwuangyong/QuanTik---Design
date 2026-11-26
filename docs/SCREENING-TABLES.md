# Screening tables: 34 visible columns

`/screener` retains the two five-row tables from PR #15, including full company
names, compact rows, the frozen identity column, glossary popups, expandable
notes, screening details and Quant links.

The approved review removes eight of the 42 reference columns:

| Label | Source key |
| --- | --- |
| Chất lượng dữ liệu | data_quality_status |
| Điểm dữ liệu | data_quality_score |
| Cảnh báo dữ liệu | data_quality_flags |
| Biến động mô phỏng | mc_volatility_source |
| Lợi nhuận gộp (%) | gross_forecast_pct |
| Đồng thuận (%) | agreement_pct |
| Đạt bộ lọc | gate_pass |
| RiskPctNAV | risk_pct_nav |

`visibleSheetColumns` is the shared presentation projection. All 34 remaining
columns preserve their relative Google Sheet order. `Model Agreement (%)`
(`trade_model_agreement_pct`) remains visible. The complete source definitions
and optional API values remain intact; hiding fields does not change the data,
action gate, score or analysis report.

Counts in table captions, footers and the page description use the visible
projection length. Prices remain VND; ADV20 value is displayed in billions of
VND. Percentage-point fields are not multiplied by 100. Missing values remain
`—`; a published numeric zero remains `0` or `0%`.

## Data and ranking boundaries

This frontend repository does not implement the production screening/Quant
engine. Both groups continue reading the same published run:

- `GET /api/v1/screenings/latest` — polled every `refresh_after_seconds` (min 30 s); free.
  It also carries `screening_quota`, `stale_reasons`, `expected_session`/`expected_slot`
  and `latest_attempt`, which the board shows when the publication is stale.
- `GET /api/v1/screenings/{run_id}/board` — both top-five lists in **one metered read**,
  with the viewer's own Quant columns from reports on the same data manifest
  (quantik-server `1493277`, branch `fix/screening-session-status`).
- Fallback: when the server has no `/board` route (FastAPI 404 without a
  `NOT_FOUND` code), the board reads
  `GET /api/v1/screenings/{run_id}/results?group=OVERALL|DISTRIBUTION` (two metered
  reads) and stops trying `/board` for the rest of the page session. This keeps the
  frontend releasable before or after the backend change.
- `GET /api/v1/screenings/{run_id}/symbols/{symbol}` when opening details (metered).

Every metered read is charged by `screening_access.consume_view`, so results are
re-read only when `/latest` returns a new run id, and results/details are kept for
the tab. Quant columns are per-user: "Cập nhật cột Quant · dùng 1 lượt xem"
re-reads `/board` on purpose after the viewer runs a new analysis. Quant links
from the board and the detail modal carry `target_session` so the request uses the
scan session; when that session is not ready for the symbol, the request panel
offers `GET /api/v1/analyses/previous-session?symbol=&before=` (quantik-server
`cc16bb6`; older servers get a plain "not supported" note).

Checked with `tools/screening-e2e.mjs` against real quantik-server code on
26/11/2026: `fix/screening-session-status@cc16bb6` used one `/board` read per
viewport; `main@02a2894` used the `/results` fallback. On `main`, the fixture plan
(`screening_quota` default 5) runs out on the second viewport because each load
costs two reads plus one detail read; `/board` removes that.

The frontend preserves backend membership and rank order and caps each group at
five rows. It does not sort five already-selected rows and claim to have found
the highest Quant scores across the entire universe. The existing OVERALL and
DISTRIBUTION screening groups are not equivalent to a Quant score ranking or
Quant AVOID action.

The backend must publish the corresponding Quant fields for the same session
to populate the remaining live columns. Selecting the global top five Quant
scores requires ranking the complete valid source universe before limiting it.
This UI change does not implement that backend pipeline or read Google Sheets
at runtime. No sample prices, scores, recommendations, authentication bypass or
preview-only ranking are imported into production routes.

## Review and release

Visual review: https://quantik-screener-review-nov07.ducduy14ngochoi.chatgpt.site
The review uses explicitly labelled synthetic data and demonstrates the layout;
it is not evidence of live financial-model parity.

Browser regressions check the independently specified 34-column order, absence
of the eight removed headers, both five-row limits, company names, units,
missing/zero values, frozen identity, help, notes and navigation. Existing API,
authorization, stale-publication and pinned-detail checks remain in place.

A GitHub merge updates source only. The current checks workflow builds/tests but
does not deploy to the production VPS. A release must build the approved commit,
update the serving frontend image and verify that the served screener bundle
contains the 34-column presentation. This PR does not deploy the production site.
