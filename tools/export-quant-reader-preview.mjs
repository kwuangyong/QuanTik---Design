import { build } from "esbuild";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = await build({ absWorkingDir: root, entryPoints: ["frontend/preview/quant-reader.tsx"], bundle: true, write: false, outdir: "preview/quant-reader-assets", minify: true, jsx: "automatic", format: "iife", target: "es2020", tsconfig: "frontend/tsconfig.json", alias: { "next/link": resolve(root,"frontend/preview/router.tsx"), "next/navigation": resolve(root,"frontend/preview/router.tsx") }, define: { "process.env.NODE_ENV": '"production"' } });
const cssFiles = (await readdir(resolve(root, "frontend/.next/static"), { recursive: true })).filter(p => p.endsWith(".css"));
if (!cssFiles.length) throw new Error("Run npm run build before exporting the preview.");
let css = (await Promise.all(cssFiles.map(p => readFile(resolve(root, "frontend/.next/static", p), "utf8")))).join("\n").replace(/@font-face\s*\{[^}]*\}/g, "");
css += result.outputFiles.filter(f => f.path.endsWith(".css")).map(f => f.text).join("\n");
const embed = async path => (await readFile(resolve(root, path))).toString("base64");
// Inline both Latin and Vietnamese subsets for an offline, portable preview.
for (const weight of [400,500,600]) for (const subset of ["latin", "vietnamese"]) {
  const file = `node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-${subset}-${weight}-normal.woff2`;
  const rules = await readFile(resolve(root, `node_modules/@fontsource/ibm-plex-mono/${weight}.css`), "utf8");
  const rule = [...rules.matchAll(/@font-face\s*\{[^}]*\}/g)].map(([r])=>r).find(r=>r.includes(`ibm-plex-mono-${subset}-${weight}-normal.woff2`));
  css += rule.replace(/src:[^;]+;/, `src:url(data:font/woff2;base64,${await embed(file)}) format('woff2');`);
}
const katex = await readFile(resolve(root,"node_modules/katex/dist/katex.min.css"),"utf8");
for (const [rule] of katex.matchAll(/@font-face\s*\{[^}]*\}/g)) {
  const file = rule.match(/url\((?:["'])?([^)'";]+\.woff2)(?:["'])?\)/)?.[1];
  if (file) css += rule.replace(/src:[^;}]+;?/, `src:url(data:font/woff2;base64,${await embed(`node_modules/katex/dist/${file}`)}) format('woff2');`);
}
const script = result.outputFiles.find(f => f.path.endsWith(".js")).text.replaceAll("</script", "<\\/script");
await mkdir(resolve(root,"preview"),{recursive:true});
const destination = resolve(root,process.argv[2] || "preview/QuanTik_Quant_Reader_Preview.html");
await writeFile(destination,`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QuanTik · Bản xem thử phân tích Quant</title><style>${css}</style></head><body><div id="quant-reader-preview"></div><script>${script}</script></body></html>`);
console.log(destination);
