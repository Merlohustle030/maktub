// Test-Harness: startet index.html in Headless-Chromium (Software-WebGL2), ersetzt CDN-Requests
// durch lokale Kopien (nur für Tests – das ausgelieferte HTML lädt weiterhin von cdnjs/Google Fonts)
// und sammelt Konsolenfehler.
//
// Umgebung:  VENDOR_DIR  = Ordner mit package/build/three.min.js (npm pack three@0.128.0)
//            FONTS_DIR   = Ordner mit fonts.local.css + *.woff2
//            OUT_DIR     = Zielordner für Screenshots
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SP = process.env.SP || '/tmp';
export const VENDOR = process.env.VENDOR_DIR || path.join(SP, 'vendor');
export const FONTS = process.env.FONTS_DIR || path.join(SP, 'fonts');
export const OUT = process.env.OUT_DIR || path.join(SP, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

export async function launch({ width = 1280, height = 720, query = 'test', gpu = true, log = true } = {}) {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(root, u === '/' ? 'index.html' : u);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--disable-background-timer-throttling'],
  });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  const logs = [];
  page.on('console', (m) => {
    const t = m.type();
    const txt = m.text();
    if (/GPU stall|GL Driver Message|GroupMarker/.test(txt)) return;
    if (t === 'error') errors.push('console.error: ' + txt);
    else if (t === 'warning') errors.push('warn: ' + txt);
    else logs.push(txt);
    if (log && (t === 'error' || t === 'warning' || t === 'log' || t === 'info')) console.log(`[page:${t}] ${txt}`);
  });
  page.on('pageerror', (e) => { errors.push('pageerror: ' + (e.stack || e.message)); console.log('[pageerror]', e.stack || e.message); });

  const three = fs.readFileSync(path.join(VENDOR, 'package/build/three.min.js'), 'utf8');
  await page.route('https://cdnjs.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: three }));
  const fontsCss = fs.readFileSync(path.join(FONTS, 'fonts.local.css'), 'utf8');
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: fontsCss }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.fulfill({ status: 404, body: '' }));
  await page.route('http://fonts.local/**', (r) => {
    const f = path.join(FONTS, r.request().url().split('/').pop());
    if (fs.existsSync(f)) r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(f), headers: { 'access-control-allow-origin': '*' } });
    else r.fulfill({ status: 404, body: '' });
  });

  await page.goto(`http://127.0.0.1:${port}/index.html?${query}`);
  const api = {
    page, errors, logs, port,
    async shot(name, opts = {}) {
      const file = path.join(OUT, name.endsWith('.png') ? name : name + '.png');
      await page.screenshot({ path: file, ...opts });
      return file;
    },
    async close() { await browser.close(); server.close(); },
  };
  return api;
}
