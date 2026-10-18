import { build } from "esbuild";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = await build({
  absWorkingDir: root,
  entryPoints: ["frontend/preview/entry.tsx"],
  bundle: true,
  write: false,
  minify: true,
  jsx: "automatic",
  target: "es2020",
  format: "iife",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "next/link": resolve(root, "frontend/preview/router.tsx"),
    "next/navigation": resolve(root, "frontend/preview/router.tsx"),
  },
});
const logo =
  "data:image/jpeg;base64," +
  (await readFile(resolve(root, "frontend/public/quantik-logo.jpg"))).toString(
    "base64",
  );
const javascript = result.outputFiles[0].text
  .replaceAll('"/quantik-logo.jpg"', JSON.stringify(logo))
  .replaceAll("</script", "<\\/script");
const buildRoot = resolve(root, "frontend/.next");
const pages = await Promise.all(
  ["index.html", "dashboard.html"].map((page) =>
    readFile(resolve(buildRoot, "server/app", page), "utf8"),
  ),
);
const cssFiles = [
  ...new Set(
    pages.flatMap((html) =>
      [...html.matchAll(/href="([^"?]+\.css)"/g)].map((match) =>
        match[1].replace(/^\/_next\//, ""),
      ),
    ),
  ),
];
if (!cssFiles.length)
  throw new Error("Build the Next.js frontend before exporting its preview.");
const css = (
  await Promise.all(
    cssFiles.map((path) => readFile(resolve(buildRoot, path), "utf8")),
  )
)
  .join("\n")
  .replace(/@font-face\s*\{[^}]*\}/g, "");
const fontImport =
  '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");';
// Bundle IBM Plex Mono so the board keeps its typeface without Google Fonts.
const monoDirectory = resolve(root, "node_modules/@fontsource/ibm-plex-mono");
const monoFonts = await Promise.all(["latin", "latin-ext", "vietnamese"].flatMap(subset => [400,500,600].map(async weight => {
  const stylesheet = await readFile(resolve(monoDirectory, `${subset}-${weight}.css`), "utf8");
  const rule = stylesheet.match(/@font-face\s*\{[^}]*\}/)?.[0];
  const font = rule?.match(/url\((?:["'])?([^)'";]+\.woff2)(?:["'])?\)/)?.[1];
  if (!rule || !font) throw new Error("Missing IBM Plex Mono WOFF2 font in export");
  const bytes = await readFile(resolve(monoDirectory, font));
  return rule.replace(/src:[^;}]+;?/, `src:url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2");`);
})));
// Keep the mathematical fonts in the standalone export, including offline use.
const katexDirectory = resolve(root, "node_modules/katex/dist");
const katexStyles = await readFile(resolve(katexDirectory, "katex.min.css"), "utf8");
const mathFonts = await Promise.all([...katexStyles.matchAll(/@font-face\s*\{[^}]*\}/g)].map(async ([rule]) => {
  const font = rule.match(/url\((?:["'])?([^)'";]+\.woff2)(?:["'])?\)/)?.[1];
  if (!font) throw new Error("Missing KaTeX WOFF2 font in export");
  const bytes = await readFile(resolve(katexDirectory, font));
  return rule.replace(/src:[^;}]+;?/, `src:url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2");`);
}));
const fragment =
  '<div id="quantik-design-preview"></div>\n<style>' +
  fontImport +
  monoFonts.join("\n") +
  mathFonts.join("\n") +
  css +
  "\n#quantik-design-preview{position:relative;min-height:800px;background:#0b1013}#quantik-design-preview .terminal-sidebar{position:absolute}#quantik-design-preview .terminal{min-height:800px}#quantik-design-preview .sidebar-scrim{position:absolute}@media(max-width:700px){#quantik-design-preview .terminal-sidebar{height:100%;max-height:none}}</style>\n<script>" +
  javascript +
  "</script>\n";
if (Buffer.byteLength(fragment) > 3 * 1024 * 1024)
  throw new Error("Preview exceeds 3 MB including mathematical fonts.");
await mkdir(resolve(root, "preview"), { recursive: true });
await writeFile(
  resolve(root, "preview/index.html"),
  '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QuanTik Design Preview</title></head><body>' +
    fragment +
    "</body></html>",
);
const destination = process.argv[2];
if (destination) await writeFile(resolve(destination), fragment);
console.log(
  "Generated preview/index.html (" + Buffer.byteLength(fragment) + " bytes)",
);
