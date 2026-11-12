// Dump every term definition the QuanTik frontends ship, as one JSON array on stdout.
// Usage: node --experimental-strip-types catalog_dump.mjs <QuanTik---Design repo> [QuanTik-website repo]
// Called by catalog.py; Node 22.6+ strips TypeScript types natively.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [design, website] = process.argv.slice(2);
const out = [];
const add = (source, entries) => {
  for (const e of entries) out.push({ ...e, _source: source });
};
const imp = (p) => import(pathToFileURL(p).href);

if (design) {
  const c = path.join(design, "frontend/src/content");
  const glossary = JSON.parse(fs.readFileSync(path.join(c, "legacy/glossary.json"), "utf8"));
  add("QuanTik---Design/frontend/src/content/legacy/glossary.json", glossary);
  const mod = await imp(path.join(c, "quant-module-terms.ts"));
  add("QuanTik---Design/frontend/src/content/quant-module-terms.ts", mod.quantModuleTerms);
  const act = await imp(path.join(c, "quant-action-terms.ts"));
  add("QuanTik---Design/frontend/src/content/quant-action-terms.ts", act.quantActionTerms);
  const sheet = await imp(path.join(c, "screening-sheet.ts"));
  add("QuanTik---Design/frontend/src/content/screening-sheet.ts",
      sheet.sheetColumns.map((col) => ({ ...(col.definition || {}), id: (col.definition || {}).id || `sheet-${col.key}`,
                                          en: (col.definition || {}).en || col.label, group: col.group })));
  const home = await imp(path.join(c, "home-models.ts"));
  add("QuanTik---Design/frontend/src/content/home-models.ts",
      home.homeModels.map((m) => ({ id: `home_${m.id}`, en: m.name, vi: m.tag, short: m.description, group: m.code,
                                     formulaText: m.formula, usage: m.meaning, limitations: m.limit, input: m.input,
                                     output: m.output, engineSource: m.source, visual: m.type, soon: !!m.soon })));
}

if (website) {
  const c = path.join(website, "src/content");
  // glossary.js imports JSON without an import attribute; patch a temp copy so Node accepts it.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qtw-"));
  for (const f of fs.readdirSync(c)) fs.copyFileSync(path.join(c, f), path.join(tmp, f.endsWith(".js") ? f.replace(/\.js$/, ".mjs") : f));
  for (const f of fs.readdirSync(tmp).filter((f) => f.endsWith(".mjs"))) {
    const p = path.join(tmp, f);
    fs.writeFileSync(p, fs.readFileSync(p, "utf8")
      .replace(/from '\.\/metrics\.json'/g, "from './metrics.json' with {type:'json'}")
      .replace(/from '\.\/([\w-]+)\.js'/g, "from './$1.mjs'"));
  }
  const g = await imp(path.join(tmp, "glossary.mjs"));
  add("QuanTik-website/src/content/glossary.js", g.glossary || []);
  const h = await imp(path.join(tmp, "home-models.mjs"));
  add("QuanTik-website/src/content/home-models.js",
      (h.homeModels || []).map((m) => ({ id: `home_${m.id}`, en: m.name, vi: m.tag, short: m.description, group: m.code,
                                         formulaText: m.formula, usage: m.meaning, limitations: m.limit,
                                         input: m.input, output: m.output, engineSource: m.source, visual: m.type })));
}

process.stdout.write(JSON.stringify(out));
