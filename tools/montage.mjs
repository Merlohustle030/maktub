// Legt mehrere PNGs als Raster in ein Bild: node tools/montage.mjs out.png cols scale a.png b.png ...
import fs from 'node:fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, colsStr, scaleStr, ...files] = process.argv.slice(2);
const cols = +colsStr || files.length, scale = +scaleStr || 1;
const imgs = files.map((f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
await page.setContent('<canvas id="c"></canvas>');
const size = await page.evaluate(async ([imgs, cols, scale]) => {
  const loaded = await Promise.all(imgs.map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; })));
  const cw = Math.round(Math.max(...loaded.map((i) => i.width)) * scale), ch = Math.round(Math.max(...loaded.map((i) => i.height)) * scale);
  const rows = Math.ceil(loaded.length / cols), c = document.getElementById('c');
  c.width = cw * cols; c.height = ch * rows;
  const x = c.getContext('2d'); x.fillStyle = '#222'; x.fillRect(0, 0, c.width, c.height);
  loaded.forEach((im, k) => x.drawImage(im, (k % cols) * cw, Math.floor(k / cols) * ch, Math.round(im.width * scale), Math.round(im.height * scale)));
  return [c.width, c.height, c.toDataURL('image/png')];
}, [imgs, cols, scale]);
fs.writeFileSync(out, Buffer.from(size[2].split(',')[1], 'base64'));
console.log('montage', size[0], 'x', size[1]);
await browser.close();
