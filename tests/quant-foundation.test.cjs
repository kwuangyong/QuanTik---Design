const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {buildSync} = require('esbuild');
function load(file) {
 const result=buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,define:{'process.env.NEXT_PUBLIC_QUANT_READER_V2':JSON.stringify(process.env.NEXT_PUBLIC_QUANT_READER_V2||'')}});
 const m={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,m,m.exports);return m.exports;
}
const {completeQuantReport}=load('frontend/tests/fixtures/quant-report-sample.ts');
const {filteredHmmScore}=load('frontend/src/lib/quant-radar-scoring.ts');
const {hmmPhaseData}=load('frontend/src/lib/quant-scenario-data.ts');
const {HMM_PROB_SUM_TOLERANCE}=load('frontend/src/lib/quant-interpretation-thresholds.ts');
const {readDecision}=load('frontend/src/lib/quant-decision.ts');
const {quantSummary}=load('frontend/src/lib/quant-summary.ts');
const {quantReaderV2Enabled}=load('frontend/src/lib/quant-flags.ts');
const hmm=r=>r.sections.hmm.metrics.hmm;

test('(a) radar rejects HMM probabilities without probability_kind, accepts only filtered',()=>{
 const r=completeQuantReport();
 assert.equal(hmm(r).probability_kind,'filtered');
 assert.equal(filteredHmmScore(r).score,79);
 delete hmm(r).probability_kind;
 const out=filteredHmmScore(r);
 assert.equal(out.score,null);assert.match(out.status,/chưa được cung cấp/);
 hmm(r).probability_kind=null;assert.equal(filteredHmmScore(r).score,null);
 for(const kind of ['smoothed','predicted',''])assert.equal((hmm(r).probability_kind=kind,filteredHmmScore(r).score),null,kind);
});
test('(b) one shared HMM probability-sum tolerance for radar and scenario data',()=>{
 assert.equal(HMM_PROB_SUM_TOLERANCE,1.5);
 const src=['frontend/src/lib/quant-radar-scoring.ts','frontend/src/lib/quant-scenario-data.ts'].map(f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
 for(const s of src){assert.match(s,/HMM_PROB_SUM_TOLERANCE/);assert.doesNotMatch(s,/-100\)\s*(?:>|<=)\s*\.?\d/);}
 const edge=HMM_PROB_SUM_TOLERANCE;
 for(const [sum,ok] of [[100+edge,true],[100-edge,true],[100+edge+.1,false],[100-edge-.1,false]]){
  const r=completeQuantReport();hmm(r).state_probs={BULL:sum-33.3-33.3,SIDEWAY:33.3,BEAR:33.3};
  assert.equal(filteredHmmScore(r).score!=null,ok,`radar ${sum}`);
  assert.equal(hmmPhaseData(r).probabilities!=null,ok,`scenario ${sum}`);
 }
});
test('(c) readDecision is the single accessor for both decision locations',()=>{
 const r=completeQuantReport();
 assert.deepEqual(readDecision(r),{action:'WATCH',executable:false,gatePass:false,reasonCodes:readDecision(r).reasonCodes});
 const top={...r,decision:{action:'BUY_SETUP',executable:true,reason_codes:['A','B',7]}};
 assert.deepEqual(readDecision(top),{action:'BUY_SETUP',executable:true,gatePass:false,reasonCodes:['A','B']});
 const nestedOnly={...r,decision:{}};nestedOnly.sections={...r.sections,decision:{...r.sections.decision,metrics:{action:{action:'AVOID',executable:false,gate_pass:true}}}};
 assert.deepEqual(readDecision(nestedOnly),{action:'AVOID',executable:false,gatePass:true,reasonCodes:[]});
 assert.deepEqual(readDecision(undefined),{action:'',executable:null,gatePass:null,reasonCodes:[]});
 assert.deepEqual(readDecision({decision:{action:5,executable:'yes'},sections:{}}),{action:'',executable:null,gatePass:null,reasonCodes:[]});
 const before=JSON.stringify(r);readDecision(r);assert.equal(JSON.stringify(r),before);
});
test('Consumers read decision only through the accessor',()=>{
 for(const f of ['components/quant-simple-report.tsx','components/quant-action-summary.tsx','lib/quant-summary.ts','lib/quant-interpretation.ts','lib/portfolio-resources.ts']){
  const s=fs.readFileSync(path.join(__dirname,'../frontend/src',f),'utf8');
  assert.doesNotMatch(s,/report!?\.decision\./,f);assert.match(s,/readDecision/,f);
 }
});
test('quantSummary and sample commentary do not present momentum, CMF or HMM phase as buy signals',()=>{
 const r=completeQuantReport(),summary=quantSummary(r),text=summary.map(x=>x.join(' ')).join(' ');
 assert.deepEqual(summary.map(x=>x[0]),['Các điểm mô tả','Rủi ro chính','Phần còn thiếu','Kết luận']);
 assert.doesNotMatch(text,/Điểm hỗ trợ|nhận diện pha|bên mua|bên bán|tín hiệu/i);
 assert.doesNotMatch(r.commentary.summary,/Tín hiệu/);
});
test('Reader V2 flag is off by default and does not change anything when off',()=>{
 assert.equal(quantReaderV2Enabled(),/^(1|true|on)$/i.test(process.env.NEXT_PUBLIC_QUANT_READER_V2||''));
 if(!process.env.NEXT_PUBLIC_QUANT_READER_V2)assert.equal(quantReaderV2Enabled(),false);
});
test('Quant V2 tokens exist for dark and light and meet WCAG AA',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../frontend/src/app/globals.css'),'utf8');
 const block=re=>css.match(re)[1];
 const dark=block(/\.terminal \{([^}]*)\}/),light=block(/\.terminal\[data-theme="light"\] \{([^}]*)\}/);
 const vars=b=>Object.fromEntries([...b.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(m=>[m[1],m[2]]));
 const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
 const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
 const text=['q-up','q-down','q-ref','q-status-ok','q-status-neutral','q-status-caution','q-status-risk','q-status-nodata','q-band'];
 for(const [name,v] of [['dark',vars(dark)],['light',vars(light)]]){
  for(const k of text){assert.ok(v[k],`${name} ${k}`);assert.ok(ratio(v[k],v.surface)>=4.5,`${name} ${k} text contrast ${ratio(v[k],v.surface).toFixed(2)}`);}
  assert.ok(v['q-line-strong']);assert.ok(ratio(v['q-line-strong'],v.surface)>=3,`${name} line-strong`);
  assert.notEqual(v['q-down'],v['q-status-risk']);assert.notEqual(v['q-up'],v['q-status-ok']);
 }
 assert.match(dark,/--q-font-num/);assert.match(dark,/--q-text-note:\s*\.8125rem/);
});
