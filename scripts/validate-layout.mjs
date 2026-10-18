import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { previewServer } from './preview-server.mjs';
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const output = resolve(option('--out', 'test/scratch/game-layout'));
await mkdir(output, { recursive: true });
const server = await previewServer(option('--dist', 'dist'));
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const checks = [];
try {
  for (const [width, height] of [[800, 600], [844, 390], [390, 844], [320, 740]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(server.url);
    await page.getByRole('button', { name: 'Start race', exact: true }).click();
    await page.locator('.phase-countdown').waitFor();
    const metrics = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('.touch-controls button')].map(b => {
        const r = b.getBoundingClientRect();
        return { name: b.getAttribute('aria-label'), x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
      });
      const map = document.querySelector('.race-map').getBoundingClientRect();
      const instruments = document.querySelector('.driving-instruments').getBoundingClientRect();
      const mapInstrumentOverlap = Math.max(0, Math.min(map.right, instruments.right) - Math.max(map.left, instruments.left)) * Math.max(0, Math.min(map.bottom, instruments.bottom) - Math.max(map.top, instruments.top));
      return { mapInstrumentOverlap, viewport: { width: innerWidth, height: innerHeight }, gameHeight: document.querySelector('main').getBoundingClientRect().height, scrollWidth: document.documentElement.scrollWidth, buttons };
    });
    assert.equal(metrics.scrollWidth, width);
    assert.equal(metrics.mapInstrumentOverlap, 0, 'map must not overlap instruments');
    assert.ok(metrics.buttons.length >= 4);
    for (const b of metrics.buttons) { assert.ok(b.width >= 44 && b.height >= 44); assert.ok(b.x >= 0 && b.y >= 0 && b.bottom <= height && b.right <= width, `${b.name} outside ${width}x${height}`); }
    await page.getByRole('button', { name: 'Pause race' }).tap();
    await page.getByRole('dialog').waitFor();
    const panel = await page.getByRole('dialog').boundingBox();
    assert.ok(panel.height <= height - 30);
    await page.getByRole('dialog').getByRole('button', { name: 'Resume race', exact: true }).tap();
    await page.locator('.phase-countdown, .phase-racing').waitFor();
    await page.screenshot({ path: join(output, `race-${width}x${height}.jpg`), quality: 85 });
    assert.deepEqual(errors, []);
    checks.push({ viewport: `${width}x${height}`, passed: true, metrics });
    console.log(`PASS driving controls, dialog, and resume at ${width}x${height}`);
    await context.close();
  }
} finally { await browser.close(); await server.close(); await writeFile(join(output, 'results.json'), JSON.stringify({ checks }, null, 2)); }
