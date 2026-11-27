const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {buildSync} = require('esbuild');
function load(file) {
 const result=buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false});
 const m={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,m,m.exports);return m.exports;
}
const {quantGlossary,quantModuleNames,glossaryById,fillGlossaryExample,LEGAL_PLACEHOLDER}=load('frontend/src/lib/quant-glossary.ts');

test('Glossary has at least 40 entries with unique ids and complete fields',()=>{
 assert.ok(quantGlossary.length>=40,String(quantGlossary.length));
 assert.equal(new Set(quantGlossary.map(g=>g.id)).size,quantGlossary.length);
 for(const g of quantGlossary){
  for(const key of ['id','term','plain','meaning','example'])assert.equal(typeof g[key]==='string'&&g[key].trim().length>0,true,`${g.id}.${key}`);
  assert.ok(g.modules.length>0,g.id);
  for(const m of g.modules)assert.ok(quantModuleNames.includes(m),`${g.id}: ${m}`);
  assert.ok(g.meaning.split(/[.!?]\s/).length<=3,`${g.id} meaning too long`);
 }
});
test('Legal/market entries keep the verification placeholder and nothing else',()=>{
 const legal=quantGlossary.filter(g=>g.legal);
 assert.deepEqual(legal.map(g=>g.id).sort(),['price_band','settlement']);
 for(const g of legal)assert.match(g.meaning,new RegExp(LEGAL_PLACEHOLDER.replace(/[[\]]/g,'\\$&')));
 assert.match(glossaryById('roundtrip_cost').meaning,/\[chờ Haiku xác minh\]/);
});
test('Math-review corrections are present and prohibited claims are absent',()=>{
 assert.doesNotMatch(glossaryById('state_prob').meaning,/phiên cuối/);
 assert.match(glossaryById('state_prob').meaning,/probability_kind/);
 assert.match(glossaryById('cmf').meaning,/Chỉ mô tả/);
 assert.match(glossaryById('er').meaning,/Từ 0,3 trở xuống/);
 assert.match(glossaryById('percentiles').meaning,/95 trong 100 kịch bản thấp hơn/);
 assert.match(glossaryById('var_cvar').meaning,/chưa công bố/);
 assert.match(glossaryById('kelly').meaning,/không là khuyến nghị/);
 for(const g of quantGlossary)assert.doesNotMatch(`${g.meaning} ${g.example}`,/nên mua|khuyến nghị mua|chắc chắn (tăng|lãi)|đảm bảo lợi nhuận/i,g.id);
});
test('Examples fill from real values and are dropped when a slot is missing',()=>{
 const sharpe=glossaryById('sharpe');
 assert.match(fillGlossaryExample(sharpe,{sharpe:1.2}),/Sharpe 1.2/);
 assert.equal(fillGlossaryExample(sharpe,{}),null);
 assert.equal(fillGlossaryExample(sharpe,{sharpe:NaN}),null);
});
