import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { previewServer } from "./preview-server.mjs";
const args = process.argv.slice(2);
const option = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const output = resolve(option("--out", "test/scratch/browser-validation"));
await mkdir(output, { recursive: true });
const server = await previewServer(option("--dist", "dist"));
const report = { checks: [], errors: [], limitations: [], screenshots: [] };
async function check(name, fn) {
  try {
    const details = await fn();
    report.checks.push({ name, passed: true, details: details ?? "" });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({ name, passed: false, error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
async function shot(page, name) {
  const path = join(output, `${name}.jpg`);
  await page.screenshot({ path, quality: 85, fullPage: true });
  report.screenshots.push(path);
}
const waitFor = async (page, selector) =>
  page.locator(selector).waitFor({ timeout: 15000 });
async function audit(page, name) {
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await writeFile(
    join(output, `${name}-axe.json`),
    JSON.stringify(scan.violations, null, 2),
  );
  assert.equal(
    scan.violations.length,
    0,
    JSON.stringify(
      scan.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ),
  );
  return `${scan.passes.length} axe rules passed; no violations in scanned state.`;
}
let browser;
try {
  browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const pageErrors = [],
    resourceErrors = [],
    externalRequests = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      resourceErrors.push(`${response.status()} ${response.url()}`);
  });
  await context.route("**/*", (route) => {
    if (
      !route.request().url().startsWith(server.url.replace("/preview/", "/"))
    ) {
      externalRequests.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(server.url);
  await waitFor(page, ".start-button:not(:disabled)");
  await page.evaluate(() => document.fonts.ready);
  await check("metadata and local share assets", async () => {
    assert.match(await page.title(), /Apex Run/);
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:image"]',
    ])
      assert.ok(await page.locator(selector).getAttribute("content"));
    const paths = [
      await page.locator('link[rel="icon"]').getAttribute("href"),
      await page.locator('meta[property="og:image"]').getAttribute("content"),
    ];
    for (const path of paths) {
      assert.ok(path.startsWith("./"));
      assert.ok((await page.request.get(new URL(path, server.url).href)).ok());
    }
  });
  await check("actual WebGL rendering and loaded fonts", async () => {
    const result = await page.evaluate(() => ({
      canvas: !!document.querySelector("canvas")?.getContext("webgl2"),
      font: document.fonts.check('700 italic 40px "Barlow Condensed"'),
      width: document.querySelector("canvas")?.width,
    }));
    assert.ok(result.canvas);
    assert.ok(result.font);
    assert.ok(result.width > 300);
    return result;
  });
  await check("desktop accessibility", () => audit(page, "desktop"));
  for (const [width, height] of [
    [1440, 900],
    [800, 900],
    [390, 844],
    [320, 740],
  ]) {
    await check(`opening layout ${width} × ${height}`, async () => {
      await page.setViewportSize({ width, height });
      const metrics = await page.evaluate(() => {
        const button = document
          .querySelector(".start-button")
          .getBoundingClientRect();
        const heading = document.querySelector("h1").getBoundingClientRect();
        return {
          scrollWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
          buttonBottom: button.bottom,
          headingBottom: heading.bottom,
          canvasHeight: document.querySelector("canvas").getBoundingClientRect()
            .height,
        };
      });
      assert.ok(metrics.scrollWidth <= width, "horizontal overflow");
      assert.ok(
        metrics.buttonBottom < height,
        "main action below first screen",
      );
      assert.ok(metrics.headingBottom < height);
      await shot(page, `lobby-${width}`);
      return metrics;
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await check("mobile accessibility", () => audit(page, "mobile"));
  await check(
    "pace, paint, records, keyboard modal and focus return",
    async () => {
      await page.getByRole("radio", { name: "Cruise", exact: true }).check();
      assert.ok(
        await page
          .getByRole("radio", { name: "Cruise", exact: true })
          .isChecked(),
      );
      await page
        .getByRole("button", { name: "Sound off", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Sound on", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      await page.getByRole("button", { name: "Sound on", exact: true }).click();
      await page.getByRole("button", { name: "Sage car color" }).click();
      assert.equal(
        await page
          .getByRole("button", { name: "Sage car color" })
          .getAttribute("aria-pressed"),
        "true",
      );
      await page.getByRole("button", { name: "Personal best" }).click();
      assert.ok(
        await page
          .getByText("An open road and a clean slate.", { exact: false })
          .isVisible(),
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      const help = page.getByRole("button", { name: "How to play" });
      await help.focus();
      await page.keyboard.press("Enter");
      await waitFor(page, "dialog[open]");
      await page.keyboard.press("Tab");
      assert.ok(
        await page.evaluate(
          () => document.activeElement.closest("dialog") !== null,
        ),
      );
      await page.keyboard.press("Escape");
      assert.ok(await help.evaluate((el) => el === document.activeElement));
    },
  );
  await check(
    "manual throttle, brake, steering, boost, pause and resume",
    async () => {
      await page.getByRole("checkbox", { name: "Auto-accelerate" }).uncheck();
      await page
        .getByRole("button", { name: "Start race", exact: true })
        .click();
      await waitFor(page, ".phase-racing");
      assert.equal(Number(await page.getByTestId("speed").textContent()), 0);
      await page.keyboard.down("ArrowUp");
      await page.waitForFunction(
        () =>
          Number(document.querySelector('[data-testid="speed"]').textContent) >
          40,
        undefined,
        { timeout: 15000 },
      );
      assert.ok(Number(await page.getByTestId("speed").textContent()) > 35);
      await page.keyboard.down("ArrowLeft");
      await page
        .getByText("Off road · steer back", { exact: true })
        .waitFor({ timeout: 15000 });
      await page.keyboard.up("ArrowLeft");
      await page.keyboard.down("ArrowRight");
      await page
        .getByText("Hold ↑ or W to accelerate", { exact: true })
        .waitFor({ timeout: 15000 });
      await page.keyboard.up("ArrowRight");
      await page.keyboard.down("Space");
      await page.waitForFunction(
        () => Number(document.querySelector("meter").value) < 90,
        undefined,
        { timeout: 15000 },
      );
      await page.keyboard.up("Space");
      assert.ok(
        Number(
          await page
            .getByRole("meter", { name: "Boost available" })
            .getAttribute("value"),
        ) < 99,
      );
      await page.keyboard.up("ArrowUp");
      const beforeBrake = Number(await page.getByTestId("speed").textContent());
      await page.keyboard.down("ArrowDown");
      await page.waitForFunction(
        () =>
          Number(
            document.querySelector('[data-testid="speed"]').textContent,
          ) === 0,
        undefined,
        { timeout: 15000 },
      );
      await page.keyboard.up("ArrowDown");
      assert.ok(
        Number(await page.getByTestId("speed").textContent()) < beforeBrake,
      );
      await shot(page, "race-390");
      await page.keyboard.press("p");
      await waitFor(page, ".phase-paused");
      const pausedAt = await page.getByTestId("race-time").textContent();
      await page.waitForTimeout(400);
      assert.equal(await page.getByTestId("race-time").textContent(), pausedAt);
      assert.ok(
        await page.evaluate(
          () => document.activeElement.closest("dialog") !== null,
        ),
      );
      await shot(page, "pause-390");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Resume race", exact: true })
        .click();
      await waitFor(page, ".phase-racing");
    },
  );
  await check("touch pointer hold and release, including brake", async () => {
    const speedBefore = Number(await page.getByTestId("speed").textContent());
    const accelerator = page.getByRole("button", {
      name: "Accelerate",
      exact: true,
    });
    const box = await accelerator.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1600);
    await page.mouse.up();
    assert.ok(
      Number(await page.getByTestId("speed").textContent()) > speedBefore,
    );
    const brake = await page
      .getByRole("button", { name: "Brake", exact: true })
      .boundingBox();
    await page.mouse.move(
      brake.x + brake.width / 2,
      brake.y + brake.height / 2,
    );
    await page.mouse.down();
    await page.waitForFunction(
      () =>
        Number(document.querySelector('[data-testid="speed"]').textContent) ===
        0,
      undefined,
      { timeout: 15000 },
    );
    await page.mouse.up();
    assert.equal(Number(await page.getByTestId("speed").textContent()), 0);
    const left = page.getByRole("button", { name: "Steer left" });
    const leftBox = await left.boundingBox();
    await page.mouse.move(leftBox.x + 20, leftBox.y + 20);
    await page.mouse.down();
    await left.dispatchEvent("pointercancel", { pointerId: 1, bubbles: true });
    await page.mouse.up();
  });
  await check("pause screen accessibility and restart", async () => {
    await page.getByRole("button", { name: "Pause race" }).click();
    await waitFor(page, "dialog[open]");
    const result = await audit(page, "paused");
    await page.getByRole("button", { name: "Restart race" }).click();
    await waitFor(page, ".phase-countdown");
    assert.equal(await page.getByTestId("race-time").textContent(), "0:00.00");
    await page.getByRole("button", { name: "Pause race" }).click();
    await page
      .getByRole("button", { name: "Back to garage", exact: true })
      .click();
    await waitFor(page, ".phase-ready");
    return result;
  });
  await check(
    "reduced motion preferences and 200% text enlargement reflow",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const all = await page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.playState === "running")
            .length,
      );
      assert.equal(all, 0);
      await page.getByRole("button", { name: "How to play" }).click();
      assert.ok(
        await page
          .getByText("Reduced motion is on:", { exact: false })
          .isVisible(),
      );
      await page.keyboard.press("Escape");
      await page.addStyleTag({ content: "html { font-size: 200%; }" });
      const reflows = await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      );
      await shot(page, "text-200-percent");
      await page.reload();
      await waitFor(page, ".start-button:not(:disabled)");
      assert.ok(reflows, "horizontal overflow with 200% text size");
      return "Text enlargement is an emulation, not native browser zoom.";
    },
  );
  await check(
    "three-lap race completion, results, replay and record persistence",
    async () => {
      await page.setViewportSize({ width: 800, height: 600 });
      await page.getByRole("radio", { name: "Cruise", exact: true }).check();
      await page
        .getByRole("button", { name: "Start race", exact: true })
        .click();
      await waitFor(page, ".phase-racing");
      const controlsBox = await page.locator(".touch-controls").boundingBox();
      assert.ok(controlsBox && controlsBox.y + controlsBox.height <= 600, "driving controls must fit the tablet viewport");
      // Steer toward the center using the visible race clock, so software-rendering
      // speed does not change how long the key is held in simulation time.
      // This uses real keyboard events, with no state override or game test hook.
      await page.keyboard.down("ArrowRight");
      await page.waitForFunction(
        () => {
          const time = document.querySelector(
            '[data-testid="race-time"]',
          ).textContent;
          return Number(time.split(":")[1]) >= 1;
        },
        undefined,
        { timeout: 15000 },
      );
      await page.keyboard.up("ArrowRight");
      await page.keyboard.down("Space");
      await page.locator(".phase-finished").waitFor({ timeout: 240000 });
      await page.keyboard.up("Space");
      assert.equal(await page.locator(".lap-results li").count(), 3);
      assert.ok(
        await page
          .getByText("Saved on this device.", { exact: false })
          .isVisible(),
      );
      const elapsed = await page
        .locator(".result-summary > div:last-child strong")
        .textContent();
      await shot(page, "results-800");
      await audit(page, "results");
      await page.getByRole("button", { name: "Race again" }).click();
      await waitFor(page, ".phase-countdown");
      await page.getByRole("button", { name: "Pause race" }).click();
      await page
        .getByRole("button", { name: "Back to garage", exact: true })
        .click();
      await page.reload();
      await waitFor(page, ".start-button:not(:disabled)");
      await page.getByRole("button", { name: "Personal best" }).click();
      assert.ok(
        (await page.locator(".record-row").first().textContent()).includes(
          elapsed,
        ),
      );
      await page.keyboard.press("Escape");
      return { elapsed, laps: 3 };
    },
  );
  await check("backgrounding pauses the race", async () => {
    await page.getByRole("button", { name: "Start race", exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await waitFor(page, ".phase-paused");
    await page
      .getByRole("button", { name: "Back to garage", exact: true })
      .click();
  });
  await check("unavailable local storage does not block play", async () => {
    const isolated = await browser.newContext();
    await isolated.addInitScript(() =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Storage blocked", "SecurityError");
        },
      }),
    );
    const tab = await isolated.newPage();
    await tab.goto(server.url);
    await waitFor(tab, ".start-button:not(:disabled)");
    await tab.getByRole("button", { name: "Start race", exact: true }).click();
    await waitFor(tab, ".phase-countdown");
    await isolated.close();
  });
  await check("WebGL failure provides a useful recovery state", async () => {
    const isolated = await browser.newContext();
    await isolated.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (String(type).startsWith("webgl")) return null;
        return original.call(this, type, ...rest);
      };
    });
    const tab = await isolated.newPage();
    await tab.goto(server.url);
    await tab.getByRole("alert").waitFor();
    assert.ok(
      await tab.getByRole("button", { name: "Reload game" }).isVisible(),
    );
    assert.ok(
      await tab
        .getByRole("button", { name: "Graphics unavailable" })
        .isDisabled(),
    );
    await isolated.close();
  });
  await check(
    "no script errors, missing resources or external runtime requests",
    async () => {
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(resourceErrors, []);
      assert.deepEqual(externalRequests, []);
    },
  );
  await context.close();
  await browser.close();
  browser = null;
  try {
    browser = await webkit.launch();
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await check(
      "WebKit mobile: real 3D start, drive, pause, help, resume and restart",
      async () => {
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(server.url);
        await waitFor(page, ".start-button:not(:disabled)");
        await shot(page, "webkit-lobby-390");
        await page.getByRole("button", { name: "How to play" }).tap();
        await page.getByRole("button", { name: "Got it" }).tap();
        await page
          .getByRole("button", { name: "Start race", exact: true })
          .tap();
        await waitFor(page, ".phase-racing");
        await page.waitForTimeout(1500);
        assert.ok(Number(await page.getByTestId("speed").textContent()) > 0);
        const boost = page.getByRole("button", { name: "Boost", exact: true });
        const boostBox = await boost.boundingBox();
        await page.mouse.move(boostBox.x + 20, boostBox.y + 20);
        await page.mouse.down();
        await page.waitForTimeout(400);
        await page.mouse.up();
        await page.getByRole("button", { name: "Pause race" }).tap();
        await waitFor(page, ".phase-paused");
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Resume race", exact: true })
          .tap();
        await waitFor(page, ".phase-racing");
        await page.getByRole("button", { name: "Pause race" }).tap();
        await page.getByRole("button", { name: "Restart race" }).tap();
        await waitFor(page, ".phase-countdown");
        assert.deepEqual(errors, []);
        await shot(page, "webkit-race-390");
      },
    );
  } catch (error) {
    report.limitations.push(`WebKit could not launch: ${error.message}`);
    console.log(report.limitations.at(-1));
  }
} finally {
  if (browser) await browser.close();
  await server.close();
  await writeFile(
    join(output, "results.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    `${report.checks.filter((c) => c.passed).length}/${report.checks.length} checks passed; ${report.limitations.length} environment limitations.`,
  );
  if (report.checks.some((c) => !c.passed)) process.exitCode = 1;
}
