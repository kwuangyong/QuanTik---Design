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
test('Dashboard is a stock price board with depth, no source switch or account purchase content', async () => {
  const {Dashboard} = await load('frontend/src/components/dashboard.tsx');
  const html = renderToStaticMarkup(React.createElement(Dashboard));
  assert.match(html,/price-board/);
  assert.match(html,/Dư mua/);
  assert.match(html,/Khớp lệnh/);
  assert.match(html,/KL 3/);
  assert.match(html,/Nước ngoài/);
  assert.doesNotMatch(html,/Dòng tiền theo ngành|sector-panel/);
  assert.doesNotMatch(html,/Nguồn dashboard|Dữ liệu mẫu · xem bố cục|Tiếp tục mua gói/);
  assert.doesNotMatch(html,/data-tv-kind="quotes"|data-tv-kind="market"/);
});
test('Preview routes keep Plans and Account independent from Dashboard', async () => {
  const {PreviewContent} = await load('frontend/preview/routes.tsx');
  for (const pathname of ['/plans','/account','/does-not-exist']) {
    const html = renderToStaticMarkup(React.createElement(PreviewContent,{pathname}));
    assert.doesNotMatch(html,/price-board/);
    if (pathname === '/plans') assert.match(html,/Gói phân tích/);
  }
});
test('Chart accepts scan exchange hints and only renders a TradingView embed', async () => {
  const {ChartSurface} = await load('frontend/src/components/chart-workspace.tsx');
  const html = renderToStaticMarkup(React.createElement(ChartSurface,{symbol:'A32',exchangeHint:'HNX',onSymbolChange(){},initialQuant:false}));
  assert.match(html,/data-tv-kind="chart"/);
  assert.match(html,/HNX%3AA32/);

  assert.doesNotMatch(html,/Nguồn biểu đồ|Dữ liệu mẫu|sample-chart|chart-controls|Mở Quant|Indicator ban đầu/);
  const missing = renderToStaticMarkup(React.createElement(ChartSurface,{symbol:'ZZZZ',onSymbolChange(){}}));
  assert.doesNotMatch(missing,/data-tv-kind="chart"/);
});
