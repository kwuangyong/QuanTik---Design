# Quant report readability preview

Implements the user's three-page PDF dated 28/10/2026, on an isolated frontend
branch. No changes to backend, API routes/proxy, permissions, financial models,
report schema, or the screening/Watchlist PR.

- Keep the action panel first; use larger prices, readable labels and IBM Plex Mono.
- Remove the duplicate synthesis block requested for removal.
- Place all 16 numbered, colored navigation blocks immediately after the action.
- Show one selected module at a time, retaining the full set of modules and help.
- Add a visible interpretation of the published results to every module, separately
  from the original report commentary, definitions and formulas.
- Collapse the duplicate chart gallery and provenance below the module content.
- Use at least 13px for text labels; scale SVG chart labels with their actual width.
- Autoplay and loop HMM phase history and Monte Carlo quantile playback while
  visible. Pause on request, page hiding, or reduced-motion preference. Monte Carlo
  rotates its view while playing. Published values and decisions are unchanged.

Animation replays published observations/quantiles. It does not run models or
create market data. The GARCH response surface and factor view retain their
existing interactions; they are not newly generated financial simulations.

## Standalone preview

`frontend/preview/quant-reader.tsx` is an isolated demo entry with explicit synthetic
values and a prominent demo label. No production route imports this fixture.
The portable HTML embeds the JavaScript, stylesheet, Vietnamese/Latin IBM Plex
Mono fonts and KaTeX fonts. It can be opened without a backend or login.

```bash
npm run build
node tools/export-quant-reader-preview.mjs
```

Output: `preview/QuanTik_Quant_Reader_Preview.html`.

## Validation

TypeScript, production build, and 30 Node checks (including server rendering,
missing/disabled values, read-only interpretation, glossary and API boundaries)
pass locally. Updated browser cases cover one selected module, numbered blocks,
minimum typography, navigation, continuous playback, pausing and reduced motion.
Local browser execution remains blocked by the runtime's Chromium socket error;
these browser cases have not been verified in this branch. The preview is for
user review before opening a new PR. No merge or production deployment performed.
