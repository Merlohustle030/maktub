// Baut aus src/ die eine, eigenständige index.html (CSS + JS inline, Three.js/Fonts per CDN).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const read = (p) => fs.readFileSync(p, 'utf8');

const tpl = read(path.join(src, 'template.html'));
const css = read(path.join(src, 'style.css'));
const jsDir = path.join(src, 'js');
const files = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).sort();
const js = files.map((f) => `/* ==== ${f} ==== */\n${read(path.join(jsDir, f))}`).join('\n\n');

if (/<\/script/i.test(js)) throw new Error('JS enthält "</script" – das würde die Seite zerbrechen.');
for (const m of ['/*__CSS__*/', '/*__JS__*/']) if (!tpl.includes(m)) throw new Error('Marker fehlt: ' + m);

const html = tpl.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
fs.writeFileSync(path.join(root, 'index.html'), html);

// Für ESLint / Syntax-Check: dieselbe JS-Bündelung als Datei (nicht eingecheckt).
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build', 'bundle.js'), `(function(){'use strict';\n${js}\n})();\n`);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0);
console.log(`index.html  ${kb(html)} KB  (${files.length} JS-Dateien, ${js.split('\n').length} Zeilen JS, ${css.split('\n').length} Zeilen CSS)`);
