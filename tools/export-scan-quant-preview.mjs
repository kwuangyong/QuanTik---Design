import { build } from "esbuild";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = await build({ absWorkingDir:root, entryPoints:["frontend/preview/scan-quant.tsx"], bundle:true, write:false, outdir:"preview/scan-quant-assets", minify:true, jsx:"automatic", format:"iife", target:"es2020", tsconfig:"frontend/tsconfig.json", alias:{"next/link":resolve(root,"frontend/preview/router.tsx"),"next/navigation":resolve(root,"frontend/preview/router.tsx")}, define:{"process.env.NODE_ENV":'"production"'} });
const cssFiles = (await readdir(resolve(root,"frontend/.next/static"),{recursive:true})).filter(path=>path.endsWith(".css"));
if (!cssFiles.length) throw new Error("Run npm run build first.");
let css=(await Promise.all(cssFiles.map(path=>readFile(resolve(root,"frontend/.next/static",path),"utf8")))).join("\n").replace(/@font-face\s*\{[^}]*\}/g,"");
css+=result.outputFiles.filter(file=>file.path.endsWith(".css")).map(file=>file.text).join("\n");
for(const font of ["ibm-plex-mono","inter"]) for(const weight of [400,500,600]) for(const subset of ["latin","vietnamese"]) {
  const directory=resolve(root,`node_modules/@fontsource/${font}`);
  const rules=await readFile(resolve(directory,`${weight}.css`),"utf8");
  const name=`${font}-${subset}-${weight}-normal.woff2`;
  const rule=[...rules.matchAll(/@font-face\s*\{[^}]*\}/g)].map(([rule])=>rule).find(rule=>rule.includes(name));
  if(!rule) throw new Error(`Missing font ${name}`);
  css+=rule.replace(/src:[^;]+;/,`src:url(data:font/woff2;base64,${(await readFile(resolve(directory,"files",name))).toString("base64")}) format('woff2');`);
}
const katexDirectory=resolve(root,"node_modules/katex/dist");
for(const [rule] of (await readFile(resolve(katexDirectory,"katex.min.css"),"utf8")).matchAll(/@font-face\s*\{[^}]*\}/g)) {
  const file=rule.match(/url\((?:["'])?([^)'";]+\.woff2)(?:["'])?\)/)?.[1];
  if(file) css+=rule.replace(/src:[^;}]+;?/,`src:url(data:font/woff2;base64,${(await readFile(resolve(katexDirectory,file))).toString("base64")}) format('woff2');`);
}
css+=`.sample-toolbar{padding:24px;border:1px solid var(--border);border-radius:6px;margin-bottom:28px;background:var(--surface)}.sample-toolbar button,.sample-toolbar select{padding:9px 12px;border:1px solid var(--border);border-radius:4px;background:var(--background);color:var(--text);font:inherit;font-size:13px;max-width:100%}.sample-toolbar button{cursor:pointer}.sample-toolbar label{font-size:13px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}`;
const script=result.outputFiles.find(file=>file.path.endsWith(".js")).text.replaceAll("</script","<\\/script");
const destination=resolve(root,process.argv[2]||"preview/QuanTik_Scan_Quant_Test.html");
await mkdir(dirname(destination),{recursive:true});
await writeFile(destination,`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>QuanTik · Chạy thử Quét toàn sàn và Quant</title><style>${css}</style></head><body><div id="quantik-design-preview" data-route="/screener"></div><script>${script}</script></body></html>`);
console.log(destination);
