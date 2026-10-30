const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const katex = require('katex');
const content = fs.readFileSync(path.join(__dirname, '../frontend/src/content/legacy/glossary.json'), 'utf8');
const terms = JSON.parse(content);

test('All original glossary fields remain identical to the pinned old repository snapshot', () => {
  assert.equal(terms.length, 57);
  // Git may check this text file out as CRLF on Windows; pin content, not checkout EOLs.
  assert.equal(createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex'), 'f0e7199ff3f1cbd61bd368d7c7ebfe9e2298be2f84dc017dfa39458273577bb9');
  assert.equal(terms.filter(term => term.sourceFormula).length, 21);
});

test('Every original mathematical formula renders as display math with accessible MathML', () => {
  for (const term of terms) {
    const html = katex.renderToString(term.formulaLatex, {throwOnError:true, trust:false, displayMode:true, output:'htmlAndMathml'});
    assert.match(html, /katex-display/, term.id);
    assert.match(html, /<math/, term.id);
    assert.ok(term.example && (term.conditions || term.interpretation), term.id);
  }
});

test('The migrated UI renders all five original sections and the original copy for every term', async () => {
  const {build} = require('esbuild');
  const React = require('react');
  const {renderToStaticMarkup} = require('react-dom/server');
  const result = await build({entryPoints:[path.join(__dirname, '../frontend/src/components/term-hint.tsx')], tsconfig:path.join(__dirname, '../frontend/tsconfig.json'), bundle:true, platform:'node', format:'cjs', write:false,loader:{".css":"empty",".module.css":"empty"}, jsx:'automatic', external:['react','react-dom','katex']});
  const compiled = {exports:{}};
  new Function('require','module','exports',result.outputFiles[0].text)(require,compiled,compiled.exports);
  const escaped = value => renderToStaticMarkup(React.createElement('span',null,value)).slice(6,-7);
  for (const term of terms) {
    const html = renderToStaticMarkup(React.createElement(compiled.exports.TermContent,{term}));
    for(const section of ['01 · Lý thuyết','02 · Công thức','03 · Ví dụ minh họa','04 · Ngưỡng và điều kiện','05 · Cách sử dụng']) assert.ok(html.includes(section),term.id);
    assert.ok(html.includes(escaped(term.short)),term.id);
    assert.ok(html.includes(escaped(term.example)),term.id);
    assert.match(html, /katex-display/,term.id);
  }
});
