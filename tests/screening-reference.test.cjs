const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {buildSync} = require('esbuild');
const result = buildSync({entryPoints:[path.join(__dirname,'../frontend/src/lib/screening-reference.ts')],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false});
const loaded={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,loaded,loaded.exports);
const {screeningCompanyName,watchlistMemberships,watchlistGroups,watchlistGroupCounts}=loaded.exports;

test('Company names preserve provided identities and distinguish ticker-only/missing metadata',()=>{
  assert.equal(screeningCompanyName({symbol:'FPT',name:'FPT',company_name:'  Công ty Cổ phần FPT  '}),'Công ty Cổ phần FPT');
  assert.equal(screeningCompanyName({symbol:'FPT',name:'CTCP FPT',company_name:''}),'CTCP FPT');
  assert.equal(screeningCompanyName({symbol:'FPT',name:'  fpt  '}),undefined);
  assert.equal(screeningCompanyName({symbol:'FPT',name:null}),undefined);
  assert.equal(screeningCompanyName({symbol:'FPT',name:123}),undefined);
  assert.equal(screeningCompanyName(undefined),undefined);
});

test('Watchlist preserves overlaps, numeric tickers and 17 sectors / 6 thematic groups without choosing a primary sector',()=>{
  const before=JSON.stringify(watchlistGroups);
  assert.deepEqual(watchlistGroupCounts,{sectors:17,thematic:6});
  assert.equal(watchlistGroups.length,23);
  const symbols=watchlistGroups.flatMap(g=>g.symbols.filter(Boolean));
  assert.equal(symbols.length,278);assert.equal(new Set(symbols).size,223);
  assert.deepEqual(watchlistMemberships(' fpt ').map(g=>g.name),['Công nghệ','FPT nhóm','Bán lẻ','List CMSC']);
  assert.deepEqual(watchlistMemberships('VTP').map(g=>g.kind),['sector','thematic']);
  for(const symbol of ['VC7','L14','DC4','G36','C4G','C32','HT1','PC1','TV2','TV1','NT2'])assert.ok(watchlistMemberships(symbol).length>0,symbol);
  assert.deepEqual(watchlistMemberships('UNKNOWN'),[]);
  assert.equal(JSON.stringify(watchlistGroups),before);
});
