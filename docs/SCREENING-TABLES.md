# Screening sheets and industry Watchlist

## Corrected presentation

`/screener` shows two five-row result tables after activation. The default view
has **42 separate columns**, with exactly the header order from the supplied
Google Sheet `LỌC CỔ PHIẾU`, tab `16-09-26 (sáng)` (gid 1959261131).
The previous implementation merged these into 34 visible columns and added tall
company/action cards. Those merges and cards are removed. Rows are compact,
with a frozen ticker and one frozen header row. Eight jump buttons navigate the
wide table. Column help, expandable long text, detail modals and Quant links remain.
Prices continue to use explicit VND units from the API; the reference Sheet's
Entry/SL/TP numbers are in thousands. Do not copy the old session's values as live data.

A separate **Watchlist theo ngành** view uses `frontend/src/content/industry-watchlist.json`,
transcribed from the user's supplied `Watchlist.xlsx`, sheet `Trang tính1`.
It retains all 23 named source columns, their order, all 278 populated ticker
entries (including duplicates), and internal blank positions. Unnamed spreadsheet
spacer columns are omitted; a frozen row-number column helps navigation. This is
a reference list, not live prices or model recommendations. Clicking a ticker
only navigates to the existing Quant request page; it does not submit an analysis.

## Why the previous table appeared empty

The previous change added optional Quant properties to the frontend's
`ScreeningItem` type. A TypeScript declaration does not make the server return
those properties. The existing screening contract guarantees prices, volumes,
group scores and eligibility, while most of the 42 reference fields are Quant
report output. Rendering only optional properties hid the useful published
screening data behind dashes. This is a presentation/source mismatch; the repo
inspection does not establish deletion of production data.

The default Sheet view retains missing values as `—`. When no valid reference
metrics are present it explains the missing Quant data. The **Dữ liệu quét hiện có**
button exposes the published price, change, volume, average volume and three group
scores. It never substitutes screening eligibility for Quant gate status or a
group score for the Quant score. False, zero and explicit empty lists retain their
meaning. Missing values are never fabricated from the reference spreadsheet.

## Cross-repository deployment check

The inspected `QuanTik-website` main exposes `/api/v1/scans/latest/highlights`
in `backend/server.py` and enriches saved Quant output through
`backend/scan_presentation.py`. This Design frontend calls `/screenings/...`
instead. These are different API contracts. Do not assume that deploying this
frontend connects it to the former endpoint. Verify the actual production
backend version, proxy target (`QUANTIK_API_URL`) and response fields against
local before diagnosing model failure. Production configuration/traffic was
not available for inspection in this task. This PR does not switch endpoints
or alter access controls.

## Data boundaries

Only frontend presentation, reference content, tests and documentation change.
No backend, API routes, proxy, ranking, subscription, quota or job changes.
Existing reads remain:

- `GET /api/v1/screenings/latest`
- `GET /api/v1/screenings/{run_id}/results?group=OVERALL|DISTRIBUTION`
- `GET /api/v1/screenings/{run_id}/symbols/{symbol}` on opening a ticker

To populate all 42 live columns, the published source must actually contain the
corresponding Quant fields for that session. This PR does not provide that data
pipeline. It does not access Google Sheets at runtime or automatically run Quant.
Refreshes and modal details retain their actual publication/run identity.

## Validation

Local TypeScript, 25 Node checks, production build and preview export pass.
Desktop/mobile browser tests cover 42 columns, missing vs false values, unit
formatting, frozen ticker, group navigation, glossary, refresh/access states,
existing-data view and Watchlist navigation. Local Chromium cannot launch in
this runtime (`socket() failed: Operation not permitted`), so browser execution
must be verified by the repository's existing GitHub Actions workflow.
