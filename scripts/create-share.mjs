import { chromium } from "playwright";
import { resolve } from "node:path";
import { previewServer } from "./preview-server.mjs";
const args = process.argv.slice(2);
const option = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const server = await previewServer(option("--dist", "dist"));
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto(server.url);
  await page.getByRole("button", { name: "Start race", exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content:
      ".game-shell{min-height:630px;height:630px}.lobby-footer,.race-setup,.header-tools{display:none}.lobby{padding-top:20px;padding-bottom:40px}.intro{margin-top:-50px}.intro-description{max-width:300px}.circuit-preview{width:300px}.preview-map{width:120px;margin-bottom:12px}.scene-shade{background:linear-gradient(90deg,rgba(15,23,20,.94),rgba(15,23,20,.7) 25%,transparent 65%),linear-gradient(0deg,rgba(15,23,20,.86),transparent 45%)}",
  });
  await page.screenshot({
    path: resolve(option("--out", "public/share-card.png")),
  });
  console.log("Generated 1200 × 630 share image from the real 3D scene.");
} finally {
  await browser.close();
  await server.close();
}
