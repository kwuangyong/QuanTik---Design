# AGR market indices — 2026-10-19

Release `20261019-agr-indices-02` is live at https://quantik.io.vn/dashboard.
All four index cards now use AGR data, with no fixture fallback.

Initial values come from `/datafeed/indexsnaps/HOSE,30,UPCOM,HNX`, fetched in
parallel with stock prices by the existing Next route. The existing WebSocket
also subscribes to `idx:HOSE`, `idx:30`, `idx:UPCOM`, and `idx:HNX`; `idx` update
messages use `MC` for identity, `MI` for index points and `IPC` for percent change.
Index values and percentages are not divided by 1,000 or 100. Sparse updates,
zero percentages and timestamps are preserved; older data cannot overwrite
newer index values during reconnection. Failed index retrieval leaves stock
prices working and retries; missing initial values display a dash.

Source change: `9b81c20`, applied to production base `6b607bb`, preserving the
launch offer and scan-banner release. The isolated build manifest records the
eight overlaid files. An initial build based on the earlier chart release was
rolled back to preserve that concurrent launch-offer deployment; release 02
contains both changes. No database rollback was performed.

Production web image:
`sha256:d652f52e344e71516f66b85059076ad917f95850117e3fecd603cee15e8e0020`.
Only web was recreated. API remains
`sha256:7608f657c3923b5617cc9c22e292c7b7d9939873f2f3e1b50d6b1ded43461714`;
other container IDs and schema `0017` were preserved. Both application
healthchecks and public readiness passed. No analysis or payment was submitted.

Verified backup: `backups/quantik-20261018T174327Z.dump`.
Recovery files, prior environment/image, deployment logs and build manifest are
in `/opt/quantik/releases/20261019-agr-indices-02/`. The prior web image is
`sha256:5ce9a333406d528b911de5ec965cd7581362989a29f04a2c1292f6e746915de7`.

Validation: five focused unit checks, typecheck, Linux production build and ten
desktop/mobile browser scenarios passed. Tests cover identity/unit mapping,
WebSocket index events, partial updates, zero change, stale data, reconnection,
missing index data and preservation of stock/chart behavior. Public unmocked
checks at 1440px and 390px matched all four cards against both the deployed API
and AGR directly:

| Index | Points | Change |
| --- | ---: | ---: |
| VN-INDEX | 1,705.91 | +0.45% |
| VN30 | 1,855.41 | +0.63% |
| UPCOM | 124.87 | +0.58% |
| HNX-INDEX | 259.13 | -0.06% |

The provider identified its latest session as 2026-10-16. Verification occurred
outside market hours: subscription acknowledgements passed, but no new live
index tick was observed. Tick handling is covered by the deterministic tests;
these checks do not establish in-session latency. Neither viewport overflowed
or produced JavaScript errors. Public plan checks also confirmed the 149,000 VND
offer, crossed-out 229,000 VND list price and first-month Free copy were retained.
Local scripts/screenshots/JSON are in temporary `quantik-agr-indices-20261019-02`.

Sector aggregates are unchanged by this release and remain reference data.
