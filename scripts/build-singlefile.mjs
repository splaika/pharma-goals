// Inline the Vite build into one self-contained demo/index.html.
// Purpose: an offline-capable single file for GitHub Pages "Deploy from a branch",
// htmlpreview, or double-click. Google Fonts links are kept (they load online and
// fall back to system fonts offline). Run via `npm run build:demo`.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const dist = `${root}dist`;
let html = readFileSync(`${dist}/index.html`, "utf8");

const assets = readdirSync(`${dist}/assets`);
const cssFile = assets.find((f) => f.endsWith(".css"));
const jsFile = assets.find((f) => f.endsWith(".js"));
const css = readFileSync(`${dist}/assets/${cssFile}`, "utf8");
const js = readFileSync(`${dist}/assets/${jsFile}`, "utf8");

// Replace with FUNCTION replacers: a string replacement would interpret `$&`,
// `$1` etc., and the minified bundles contain such sequences (e.g. React's
// `"$&/"`), which would silently corrupt the output.
html = html.replace(
  /<link rel="stylesheet"[^>]*href="\.\/assets\/[^"]+\.css"\s*\/?>/,
  () => `<style>\n${css}\n</style>`
);
html = html.replace(
  /<script type="module"[^>]*src="\.\/assets\/[^"]+\.js"><\/script>/,
  () => `<script type="module">\n${js}\n</script>`
);

mkdirSync(`${root}demo`, { recursive: true });
writeFileSync(`${root}demo/index.html`, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`demo/index.html written (${kb} KB, self-contained)`);
