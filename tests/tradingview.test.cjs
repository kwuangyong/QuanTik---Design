const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {build} = require('esbuild');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
async function load(file) {
  const result = await build({entryPoints:[path.join(__dirname, '..', file)], tsconfig:path.join(__dirname, '../frontend/tsconfig.json'), bundle:true, platform:'node', format:'cjs', write:false, jsx:'automatic', external:['react','react-dom','katex'], alias:{'next/navigation':path.join(__dirname, '../frontend/preview/router.tsx'),'next/link':path.join(__dirname, '../frontend/preview/router.tsx')}});
  const compiled = {exports:{}};
  new Function('require','module','exports',result.outputFiles[0].text)(require,compiled,compiled.exports);
  return compiled.exports;
}
test('Qualified symbols retain their exchange and reject invalid input without guessing HOSE', async () => {
  const {parseTVSymbol, chartConfig} = await load('frontend/src/lib/tradingview.ts');
  for (const value of ['HNX:A32','UPCOM:ACV','NASDAQ:AAPL']) {
    assert.equal(chartConfig(value,'15','dark','standard').symbol,value);
  }
  for (const bad of ['FPT','https://example.com','HOSE:<script>','UNKNOWN:FPT']) assert.equal(parseTVSymbol(bad),null);
  assert.throws(() => chartConfig('FPT','D','dark','standard'));
  assert.equal(chartConfig('HNX:PVS','invalid','dark','standard').interval,'D');
});
test('Dashboard renders actual widget slots by default, independently of scan and sample prices', async () => {
  const {Dashboard} = await load('frontend/src/components/dashboard.tsx');
  const html = renderToStaticMarkup(React.createElement(Dashboard));
  assert.match(html,/data-tv-kind="quotes"/);
  assert.match(html,/data-tv-kind="chart"/);
  assert.match(html,/PVS/);
  assert.match(html,/15 phút/);
  assert.match(html,/4 giờ/);
  assert.match(html,/MACD/);
  assert.doesNotMatch(html,/class="sample-chart /);
  assert.doesNotMatch(html,/data-tv-state="live"/);
});
test('Charts opened from scan accept exchange hints; samples stay explicitly labeled', async () => {
  const {ChartSurface} = await load('frontend/src/components/chart-workspace.tsx');
  const html = renderToStaticMarkup(React.createElement(ChartSurface,{symbol:'A32',exchangeHint:'HNX',onSymbolChange(){},initialQuant:false}));
  assert.match(html,/data-tv-kind="chart"/);
  assert.match(html,/HNX:A32/);
  const missing = renderToStaticMarkup(React.createElement(ChartSurface,{symbol:'ZZZZ',onSymbolChange(){}}));
  assert.doesNotMatch(missing,/data-tv-kind="chart"/);
});
