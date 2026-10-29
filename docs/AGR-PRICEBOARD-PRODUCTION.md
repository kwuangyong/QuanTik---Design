# AGR priceboard production release

Release `20261018-agr-priceboard-01` is live at https://quantik.io.vn/dashboard
on 2026-10-18 (Asia/Ho_Chi_Minh), from frontend source commit `969bba0`.

The Linux amd64 image was built locally using the repository Dockerfile,
verified with the production runtime restrictions, transferred over SSH as a
compressed Docker archive, and loaded on the VPS. No registry upload was used.
Production pins the imported frontend image to
`sha256:9b40366d95f75685df197e03973d691f19ff945e8a2ff1ab6dc29e4f978b3617`.
The archive SHA-256 is
`c440fa6b5b85c08e2de055fe31d18df200cc09763bfe9ef7474ce2c651eba56d`.

Only `quantik-web-1` was recreated. API image remains
`sha256:7608f657c3923b5617cc9c22e292c7b7d9939873f2f3e1b50d6b1ded43461714`;
all other container IDs were preserved. No schema migration, worker restart,
provider onboarding or Quant request was issued. API/web healthchecks pass and
public `/health/ready` reports schema `0017`.

Verified pre-release backup: `backups/quantik-20261018T114556Z.dump`.
Restricted recovery copies, image metadata, deployment log and the downloaded
AGR snapshot are retained in
`/opt/quantik/releases/20261018-agr-priceboard-01/`.
The prior frontend image remains available:
`sha256:24596a1be38d29e4a56ca2853d4ae2e1fcb021e220a67976530b1fda726d903c`.
The rollout script restores the previous environment/frontend on deployment or
HTTP smoke failure. A later rollback should restore `env.before` only after
checking that subsequent releases have not changed the environment, then run
`docker compose --env-file .env.production up -d --no-deps --wait web`.

Public browser verification used anonymous sessions at 1440px and 390px with
real HTTP/WebSocket traffic and no mocked endpoints:

- `/api/market/agr` returned 200 and 1,965 raw instruments. The dashboard filters
  these to supported stock symbols/exchanges.
- AGR accepted the HOSE/HNX/UPCOM subscriptions. Desktop received a heartbeat
  pong after the negotiated 25-second interval; mobile closed before that
  interval, so mobile heartbeat was not separately observed.
- FPT matched the upstream price of 58,200 VND, displayed as `58,20` thousand VND.
  The UI identifies the latest trading session as `16/10/2026`.
- Statistics/foreign columns were selectable, neither viewport had page
  horizontal overflow, and neither produced browser JavaScript errors.

Screenshots, the verification script and JSON evidence are retained locally in
the temporary release directory `quantik-agr-priceboard-20261018-01`.
Local validation before rollout: production build, typecheck, 22 unit tests and
20 desktop/mobile browser scenarios passed, including simulated deltas,
reconnect/resynchronization and snapshot failure. Because production verification
occurred on Sunday, no new exchange trade event was observed; subscription,
snapshot and heartbeat checks do not establish in-session latency.

Market index cards and sector aggregates remain explicitly labelled sample
snapshots. AGR supplies no Quant scores; these remain empty. Sector metadata
only covers the existing local mapping; other symbols show “Chưa phân ngành”.
