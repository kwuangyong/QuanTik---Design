const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {buildSync}=require('esbuild');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function load(file){const result=buildSync({entryPoints:[path.join(__dirname,'..',file)],tsconfig:path.join(__dirname,'../frontend/tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react-dom','katex']});const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);return module.exports;}
const {LiveQuantReport}=load('frontend/src/components/quant-live-report.tsx');
const {reportFixture}=load('frontend/tests/fixtures/analysis.ts');
test('Report opens one module after the action, preserves 16 choices, and removes duplicate synthesis',()=>{
 const report=reportFixture(),before=JSON.stringify(report);
 const html=renderToStaticMarkup(React.createElement(LiveQuantReport,{report}));
 const modules=html.match(/<details[^>]*data-quant-module[^>]*>/g)||[];
 assert.equal(modules.length,16);assert.equal(modules.filter(tag=>!tag.includes('hidden')).length,1);
 assert.match(modules.find(tag=>!tag.includes('hidden')),/data-quant-module="statistics"/);
 assert.ok(html.indexOf('aria-label="Hành động thực thi"')<html.indexOf('aria-label="Phân tích từng module"'));
 assert.doesNotMatch(html,/Xâu chuỗi các mô hình và khuyến nghị/);
 assert.match(html,/Ý nghĩa &amp; phân tích/);
 assert.match(html,/Phân tích chi tiết kết quả/);
 assert.doesNotMatch(html,/Xem thêm [0-9]+ chỉ số/);
 const statistics=html.slice(html.indexOf('data-quant-module="statistics"'),html.indexOf('data-quant-module="distribution"'));
 for(const label of ['Lợi suất năm','Sharpe','Sortino','Sụt giảm tối đa','Biến động năm','Số quan sát']) assert.ok(statistics.includes(label),label);
 assert.equal((statistics.match(/<dt /g)||[]).length,6);
 assert.equal(JSON.stringify(report),before);
});
test('Compact report preserves its initially closed modules while retaining the navigation',()=>{
 const html=renderToStaticMarkup(React.createElement(LiveQuantReport,{report:reportFixture(),compact:true}));
 const modules=html.match(/<details[^>]*data-quant-module[^>]*>/g)||[];
 assert.equal(modules.length,16);assert.ok(modules.every(tag=>tag.includes('hidden')));
 assert.match(html,/aria-label="Điều hướng module"/);
});
