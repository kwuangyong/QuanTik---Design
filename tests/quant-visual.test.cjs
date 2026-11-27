const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {buildSync} = require('esbuild');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
// CSS modules go through esbuild's local-css loader so class names stay readable (quant-visual_dotOn) instead of "undefined".
function load(file) {
 const result = buildSync({entryPoints: [path.join(__dirname, '..', file)], tsconfig: path.join(__dirname, '../frontend/tsconfig.json'), bundle: true, platform: 'node', format: 'cjs', write: false, outdir: path.join(__dirname, 'out'), jsx: 'automatic', loader: {'.css': 'local-css'}, external: ['react', 'react-dom', 'react/jsx-runtime']});
 const m = {exports: {}}; new Function('require', 'module', 'exports', result.outputFiles.find(f => f.path.endsWith('.js')).text)(require, m, m.exports); return m.exports;
}
const {quantReportSample, quantSampleCases} = load('frontend/tests/fixtures/quant-report-sample.ts');
const {miniFigure, deepVisual, needsText} = load('frontend/src/lib/quant-visual.ts');
const {FigureView} = load('frontend/src/components/quant-visual.tsx');
const {QuantDeepVisual} = load('frontend/src/components/quant-deep-visual.tsx');
const {QuantExplain} = load('frontend/src/components/quant-explain.tsx');
const {quantModuleNames} = load('frontend/src/lib/quant-glossary.ts');
const h = React.createElement;
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const BAD_ATTR = /\s[\w:-]+="[^"]*(NaN|undefined|Infinity|null)[^"]*"/;
const BANNED = /undefined|NaN|Infinity|\bnull\b|tín hiệu|Haiku|nên mua|nên bán|mua ngay|bán ngay|chắc chắn|!|confetti/i;
const walk = (v, where, fn) => { fn(v, where); if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`, fn)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`, fn); };
const figuresOf = (report, module) => [miniFigure(report, module), ...((deepVisual(report, module) || {figures: []}).figures)].filter(Boolean);
const dataScenarios = quantSampleCases.filter(c => c === 'complete' || c === 'partial'), emptyScenarios = quantSampleCases.filter(c => !dataScenarios.includes(c));

test('16 modules x 5 scenarios: every figure is finite, has an aria-label, a table alternative and no NaN/undefined in the SVG', () => {
 for (const scenario of quantSampleCases) {
  const report = quantReportSample(scenario), before = JSON.stringify(report);
  for (const module of quantModuleNames) {
   const id = `${scenario}/${module}`;
   for (const fig of figuresOf(report, module)) {
    walk(fig, `${id}/${fig.id}`, (v, where) => { assert.notEqual(v, undefined, where); if (typeof v === 'number') assert.ok(Number.isFinite(v), where); if (typeof v === 'string') assert.doesNotMatch(v, /NaN|undefined|Infinity/, where); });
    assert.ok(fig.aria && fig.aria.trim().length > 4, `${id}/${fig.id} aria`);
    if (fig.visual.kind !== 'facts') assert.ok(fig.table && fig.table.rows.length >= 1 && fig.table.columns.length >= 2, `${id}/${fig.id} table`);
    for (const size of ['mini', 'full']) {
     const html = renderToStaticMarkup(h(FigureView, {fig, size}));
     assert.doesNotMatch(html, BAD_ATTR, `${id}/${fig.id} ${size} attribute`);
     assert.doesNotMatch(text(html), BANNED, `${id}/${fig.id} ${size} text`);
     if (fig.visual.kind === 'facts') assert.match(html, /aria-label=/); else { assert.match(html, /<svg[^>]*role="img"[^>]*aria-label="[^"]+"/, `${id}/${fig.id}`); assert.match(html, /<table/, `${id}/${fig.id} table markup`); }
    }
   }
   const html = renderToStaticMarkup(h(QuantDeepVisual, {name: module, report}));
   assert.doesNotMatch(html, BAD_ATTR, `${id} deep attribute`);
   assert.doesNotMatch(text(html), BANNED, `${id} deep text`);
  }
  assert.equal(JSON.stringify(report), before, `${scenario}: report mutated`);
 }
});

test('Failed, unavailable and disabled reports draw no number: no figure, no SVG, no stale series', () => {
 for (const scenario of emptyScenarios) {
  const report = quantReportSample(scenario);
  for (const module of quantModuleNames) {
   const id = `${scenario}/${module}`;
   assert.equal(miniFigure(report, module), null, `${id} mini`);
   const deep = deepVisual(report, module);
   if (module === 'commentary') { assert.equal(deep, null); continue; }
   assert.equal(deep.figures.length, 0, `${id} deep figures`);
   assert.ok(deep.empty, `${id} states that nothing is drawn`);
   const html = renderToStaticMarkup(h(QuantDeepVisual, {name: module, report}));
   assert.doesNotMatch(html, /<svg|<polyline|<rect|<circle/, id);
   assert.doesNotMatch(text(html), /100\.000|102\.000|412|24,5|3\.000\.000|72\/100|\b95\b|1\.000 lần/, id);
  }
  const explain = renderToStaticMarkup(h(QuantExplain, {report}));
  assert.equal((explain.match(/data-explain-figure=/g) || []).length, 0, `${scenario}: no mini figure on a card without a result`);
 }
});

test('Backend gaps are labelled "Cần dữ liệu từ backend" in every scenario and never drawn', () => {
 const fields = {arima: 'arima.forecast.interval', garch: 'garch.vol_cone', simulation_risk: 'research.mc_paths', context: 'context.vnindex_series', costs: 'costs.components[]', trade_plan: 'exchange, price_band_pct', directional_alpha: 'directional_alpha.ic', agreement: 'agreement.models[]', distribution: 'research.returns', data_quality: 'data_quality.checks[]'};
 for (const scenario of quantSampleCases) {
  const report = quantReportSample(scenario);
  for (const [module, field] of Object.entries(fields)) {
   const html = renderToStaticMarkup(h(QuantDeepVisual, {name: module, report}));
   assert.match(text(html), new RegExp(`Cần dữ liệu từ backend: ${field.replace(/[[\].]/g, '\\$&')}`), `${scenario}/${module}`);
   assert.ok(deepVisual(report, module).needs.some(n => needsText(n).includes(field)), `${scenario}/${module} needs`);
  }
 }
 const complete = quantReportSample('complete'), arima = deepVisual(complete, 'arima');
 const line = arima.figures.find(f => f.visual.kind === 'line');
 assert.equal(line.visual.bands.length, 0, 'ARIMA: no interval band is invented');
 assert.deepEqual(line.visual.series[0].values, [102000, 102200, 102450, 102600], 'last close, then the three published forecasts');
 assert.equal(line.visual.series[0].dashed, true);
 assert.match(line.caption, /Không có khoảng dự báo từ mô hình/);
 assert.equal(deepVisual(complete, 'simulation_risk').figures.filter(f => f.visual.kind === 'line').length, 1, 'only the percentile cone, no sample paths');
 assert.equal(deepVisual(complete, 'context').figures.some(f => f.visual.kind === 'line'), false, 'no VN-Index series');
 assert.equal(deepVisual(complete, 'garch').figures.some(f => f.visual.bands && f.visual.bands.length), false, 'no volatility cone');
});

test('Complete report: figures follow the spec and the published numbers', () => {
 const r = quantReportSample('complete'), mini = m => miniFigure(r, m);
 const dots = mini('simulation_risk').visual; assert.equal(dots.filled, 62); assert.equal(dots.total, 100);
 const dotsHtml = renderToStaticMarkup(h(FigureView, {fig: mini('simulation_risk'), size: 'mini'}));
 assert.equal((dotsHtml.match(/class="[^"]*dotOn"/g) || []).length, 62); assert.equal((dotsHtml.match(/class="[^"]*dotOff"/g) || []).length, 38);
 assert.match(mini('simulation_risk').caption, /62 trong 100 lần mô phỏng/);
 const hmm = mini('hmm'); assert.equal(hmm.visual.basis, 'Xác suất lọc'); assert.deepEqual(hmm.visual.segments.map(s => s.value), [67, 24, 9]);
 const none = quantReportSample('complete'); delete none.sections.hmm.metrics.hmm.probability_kind;
 assert.equal(miniFigure(none, 'hmm').visual.basis, 'Chưa rõ loại xác suất');
 assert.match(renderToStaticMarkup(h(FigureView, {fig: miniFigure(none, 'hmm'), size: 'mini'})), /Chưa rõ loại xác suất/);
 assert.equal(deepVisual(none, 'hmm').needs[0].field, 'hmm.probability_kind');
 const fallback = quantReportSample('complete'); fallback.sections.hmm.metrics.hmm.method = 'fallback';
 assert.equal(miniFigure(fallback, 'hmm'), null);
 const bad = quantReportSample('complete'); bad.sections.hmm.metrics.hmm.state_probs = {BULL: 80, SIDEWAY: 24, BEAR: 9};
 assert.equal(miniFigure(bad, 'hmm'), null, 'probabilities that do not sum to 100 are not drawn');
 const plan = mini('trade_plan').visual; assert.deepEqual(plan.levels.map(l => l.price), [97000, 100000, 105000, 110000]); assert.equal(plan.loss, '-3%'); assert.equal(plan.gain, '+10%');
 const unordered = quantReportSample('complete'); unordered.sections.trade_plan.metrics.sl.sl_swing = 101000;
 assert.equal(miniFigure(unordered, 'trade_plan'), null, 'SL above entry: no ladder');
 const wf = mini('costs').visual; assert.deepEqual(wf.bars.map(b => [b.from, b.to]), [[0, 4.1], [4.1, 3.5], [0, 3.5]]); assert.deepEqual(wf.bars.map(b => b.text), ['+4,1%', '-0,6%', '+3,5%']);
 const g = mini('garch').visual.rows[0]; assert.equal(g.value, 0.96); assert.deepEqual(g.marks.map(m => m.at), [0.9, 1]); assert.equal(g.max, 1.2);
 const over = quantReportSample('complete'); over.sections.garch.metrics.garch.garch.persistence = 1.5;
 const o = miniFigure(over, 'garch').visual.rows[0]; assert.equal(o.value, 1.2); assert.match(o.text, /ngoài thang/);
 assert.match(deepVisual(over, 'garch').figures.find(f => f.id === 'garch-facts').visual.rows.find(x => x.label === 'Chu kỳ bán rã').text, /không hội tụ/);
 const fan = deepVisual(r, 'simulation_risk').figures.find(f => f.id === 'simulation-fan').visual;
 assert.equal(fan.labels.length, 3); assert.equal(fan.bands.length, 2); assert.equal(fan.series.length, 1);
 const broken = quantReportSample('complete'); broken.research.cone[1].p05 = 999999;
 assert.equal(deepVisual(broken, 'simulation_risk').figures.some(f => f.id === 'simulation-fan'), false, 'percentiles out of order: no fan');
 assert.equal(deepVisual(r, 'statistics').figures.find(f => f.id === 'statistics-facts').visual.rows.length, 6);
 const partial = quantReportSample('partial');
 assert.equal(deepVisual(partial, 'statistics').figures.find(f => f.id === 'statistics-facts').visual.rows[1].text, 'chưa có', 'null Sortino is "chưa có", not 0');
 assert.equal(deepVisual(partial, 'trade_plan').figures.find(f => f.id === 'trade-facts').visual.rows.find(x => x.label === 'Kelly').text, 'chưa có');
 assert.equal(mini('commentary'), null);
 assert.equal(deepVisual(r, 'commentary'), null);
});

test('Explain card: verdict, figure and three numbers visible; "Vì sao" and "Lưu ý" collapsed in <details>', () => {
 for (const scenario of dataScenarios) {
  const html = renderToStaticMarkup(h(QuantExplain, {report: quantReportSample(scenario)}));
  const cards = html.split('<article ').slice(1);
  assert.equal(cards.length, 16);
  for (const card of cards) {
   const more = card.match(/<details class="[^"]*more[^"]*"[^>]*>([\s\S]*?)<\/details>/);
   assert.ok(more, 'collapsed part'); assert.doesNotMatch(more[0], /\sopen(=|>|\s)/); assert.match(more[1], /Vì sao/); assert.match(more[1], /Lưu ý/);
   const outside = card.replace(more[0], '');
   assert.doesNotMatch(outside, /class="[^"]*(part|caut)"/);
  }
 }
 const complete = renderToStaticMarkup(h(QuantExplain, {report: quantReportSample('complete')}));
 assert.equal((complete.match(/data-explain-figure=/g) || []).length, 15, 'every card but the commentary has a small figure');
});

test('Motion is CSS-only, runs once in view, stays within 800 ms and is gated by prefers-reduced-motion', () => {
 const css = fs.readFileSync(path.join(__dirname, '../frontend/src/components/quant-visual.module.css'), 'utf8');
 const gated = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/)[1];
 const outside = css.replace(gated, '');
 assert.doesNotMatch(outside, /animation:/, 'every animation sits behind no-preference');
 for (const m of gated.matchAll(/animation:[^;]*?\.(\d+)s/g)) assert.ok(Number(`0.${m[1]}`) <= 0.8, m[0]);
 for (const m of outside.matchAll(/transition:[^;]*?\.(\d+)s/g)) assert.ok(Number(`0.${m[1]}`) <= 0.3, m[0]);
 assert.match(css, /prefers-reduced-motion: reduce\)[^}]*transition: none/);
 assert.doesNotMatch(css + fs.readFileSync(path.join(__dirname, '../frontend/src/components/quant-visual.tsx'), 'utf8'), /confetti|infinite|#[0-9a-fA-F]{3,6}\b/i, 'no infinite loops, celebration or hard-coded colours');
});

test('Price colours stay on price marks; status colours never appear in figures', () => {
 const css = fs.readFileSync(path.join(__dirname, '../frontend/src/components/quant-visual.module.css'), 'utf8');
 assert.doesNotMatch(css, /--q-status-(ok|caution|risk)/);
 assert.doesNotMatch(css, /var\(--(positive|negative|neutral|accent-soft)\)/);
 const ladder = renderToStaticMarkup(h(FigureView, {fig: miniFigure(quantReportSample('complete'), 'trade_plan'), size: 'mini'}));
 assert.match(ladder, /▼[\s\S]*-3%/); assert.match(ladder, /▲[\s\S]*\+10%/);
});
