const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const katex = require('katex');
const {buildSync} = require('esbuild');
function load(file) {
  const output = buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,loader:{".css":"empty",".module.css":"empty"},external:['react','react-dom','katex']});
  const module = {exports:{}};
  new Function('require','module','exports',output.outputFiles[0].text)(require,module,module.exports);
  return module.exports;
}
const {moduleGuides} = load('frontend/src/lib/quant-reader.ts');
const {glossary} = load('frontend/src/content/legacy/glossary.ts');
const {quantModuleTerms,moduleMetricTerms} = load('frontend/src/content/quant-module-terms.ts');
const {readableMetrics} = load('frontend/src/components/quant-model-section.tsx');
const {garchResponseScene} = load('frontend/src/components/quant-report-views.tsx');
const {reportFixture} = load('frontend/tests/fixtures/analysis.ts');

test('Every generic module metric has a resolvable, specific explanation; all original terms coexist', () => {
  const ids = glossary.map(term=>term.id);
  assert.equal(new Set(ids).size,ids.length);
  for (const [name,guide] of Object.entries(moduleGuides)) {
    if (name === 'directional_alpha') continue; // Bespoke evidence cards link their own terms.
    for (const [,metric] of guide.metrics) assert.ok(ids.includes(moduleMetricTerms[metric]),metric);
  }
  for (const name of ['garch','hmm']) {
    const linked = moduleGuides[name].metrics.map(([,metric])=>moduleMetricTerms[metric]);
    assert.equal(new Set(linked).size,6,`${name} must not reuse one generic explanation`);
  }
  assert.equal(quantModuleTerms.length,43);
  for (const term of quantModuleTerms) {
    assert.match(katex.renderToString(term.formulaLatex,{throwOnError:true,trust:false,displayMode:true}),/katex/);
    assert.ok(term.short && term.variables && term.example && term.conditions && term.usage && term.limitations,term.id);
  }
});

test('Unavailable numerical output stays missing while valid zero and false survive', () => {
  const section = {status:'AVAILABLE',metrics:{valid:{value:0,active:false},failed:{error:'fit failed',value:999},disabled:{disabled:true,value:999},missing:{available:false,reason:'need_data',value:999}},reason_codes:[],units:{}};
  assert.deepEqual(readableMetrics(section),{valid:{value:0,active:false},failed:{},disabled:{},missing:{available:false,reason:'need_data'}});
  assert.deepEqual(readableMetrics({...section,status:'DISABLED'}),{});
});

test('GARCH response uses only published parameters and labels it as variance, without changing the report', () => {
  const report=reportFixture();
  report.sections.garch.metrics={garch:{garch:{current_vol_pct:2,simulation_params:{omega_pct2:.1,alpha:.09,beta:.87}}}};
  const before=JSON.stringify(report),scene=garchResponseScene(report);
  assert.ok(scene); assert.equal(scene.series.length,30);
  for(const series of scene.series) for(const point of series.points) assert.ok(Math.abs(point.z-(.1+.09*point.x**2+.87*point.y))<1e-10);
  assert.match(scene.axes[2],/%²/); assert.equal(JSON.stringify(report),before);
  for (const change of [r=>r.sections.garch.status='DISABLED',r=>r.sections.garch.metrics.garch.available=false,r=>r.sections.garch.metrics.garch.garch.error='failed',r=>delete r.sections.garch.metrics.garch.garch.simulation_params]) {
    const copy=JSON.parse(before); change(copy); assert.equal(garchResponseScene(copy),null);
  }
});
