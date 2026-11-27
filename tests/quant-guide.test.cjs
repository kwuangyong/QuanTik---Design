const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {buildSync}=require('esbuild');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file){const result=buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react-dom','katex']});const m={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,m,m.exports);return m.exports;}
const {QuantGuideBody,guideSections}=load('frontend/src/components/quant-guide.tsx');
const {tourSteps}=load('frontend/src/components/quant-tour.tsx');
const {quantGlossary}=load('frontend/src/lib/quant-glossary.ts');
const text=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
test('Guide page has the 8 sections of the spec, every glossary term and the legal placeholders',()=>{
 const html=renderToStaticMarkup(React.createElement(QuantGuideBody,{headingLevel:1}));
 assert.equal(guideSections.length,8);
 for(const s of guideSections)assert.match(html,new RegExp(`id="${s.id}"`));
 assert.equal((html.match(/data-guide-term=/g)||[]).length,quantGlossary.length);
 assert.equal((html.match(/data-guide-tone=/g)||[]).length,5);
 assert.match(text(html),/theo quy định hiện hành của công ty chứng khoán/);assert.match(html,/\[chờ rà soát pháp lý VN\]/);
 // The glossary table is the spec's own wording; the forbidden-word rule is checked on the guide prose around it.
 assert.doesNotMatch(text(html.replace(/<dl[\s\S]*?<\/dl>/,'')),/T\+2|undefined|NaN|\bsẽ\b|chắc chắn|đảm bảo|nên mua|nên bán|!/i);
 assert.doesNotMatch(text(html),/T\+2|undefined|NaN/);
 assert.match(html,/Cần dữ liệu từ backend|Dữ liệu báo cáo chưa có \(\d+ trường\)/);
});
test('Tour has exactly 4 steps in the agreed order, each under 25 words',()=>{
 assert.deepEqual(tourSteps.map(s=>s.title),['Kết luận','Rủi ro trước','Ba lớp đọc','Thuật ngữ']);
 for(const s of tourSteps)assert.ok(s.text.split(/\s+/).length<=25,s.title);
 assert.doesNotMatch(tourSteps.map(s=>s.text).join(' '),/confetti|streak|badge|leaderboard/i);
});
