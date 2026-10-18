const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {build}=require('esbuild');
async function load(file){const result=await build({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-dom'],alias:{'next/navigation':path.join(__dirname,'../frontend/preview/router.tsx'),'next/link':path.join(__dirname,'../frontend/preview/router.tsx')}});const m={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,m,m.exports);return m.exports;}
test('Preview aggregates preserve OHLC and volume without inventing intraday bars',async()=>{
 const {previewBars}=await load('frontend/src/lib/chart-preview.ts');
 const daily=previewBars('FPT','D');assert.equal(daily.length,48);
 for(const frame of ['W','M']){const bars=previewBars('FPT',frame);assert.equal(bars.reduce((s,b)=>s+b.volume,0),daily.reduce((s,b)=>s+b.volume,0));assert.equal(bars[0].open,daily[0].open);assert.equal(bars.at(-1).close,daily.at(-1).close);assert.equal(Math.max(...bars.map(b=>b.high)),Math.max(...daily.map(b=>b.high)));assert.equal(Math.min(...bars.map(b=>b.low)),Math.min(...daily.map(b=>b.low)));assert(bars.every((b,i)=>!i||b.time>bars[i-1].time));}
 assert.deepEqual(previewBars('UNKNOWN'),[]);
});
test('Indicators respect warmup and known monotonic/flat series',async()=>{
 const {movingAverage,relativeStrength}=await load('frontend/src/lib/chart-preview.ts');
 const bars=Array.from({length:30},(_,i)=>({time:String(i),close:i+1}));
 assert.equal(movingAverage(bars,20)[0].value,10.5);assert.equal(movingAverage(bars,20).at(-1).value,20.5);assert.equal(movingAverage(bars,20,true)[1].value,11.5);
 assert(relativeStrength(bars).every(p=>p.value===100));
 assert(relativeStrength(bars.map(b=>({...b,close:5}))).every(p=>p.value===50));
 assert.deepEqual(movingAverage(bars.slice(0,5),20),[]);
});
test('Only explicit preview context renders mock; product routes keep their widget',async()=>{
 const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
 const {MockPriceChart}=await load('frontend/src/components/mock-price-chart.tsx');
 const html=renderToStaticMarkup(React.createElement(MockPriceChart,{symbol:'FPT',exchange:'HOSE'}));
 assert.match(html,/lightweight-mock/);assert.match(html,/MÔ PHỎNG/);assert.match(html,/Không phải dữ liệu thị trường/);assert.doesNotMatch(html,/Nguồn chart|Nguồn biểu đồ|Mở Quant/);
});
