// Captures gallery screenshots from a browser-hosted implementation with Playwright.
//
//   node tools/visual/capture-browser.cjs --url http://localhost:3000/ --out shots/
//                                         [--channel chrome] [--scale 2] [--only key,key]
//
// Requires the `playwright` package in the caller's environment (resolved from the
// current directory). The helper opens the app, then navigates with the page's global
// `wx.reLaunch`; implementations that do not expose `wx` on the page can capture the
// same screenshots any other way and pass them to compare.cjs.
const fs = require("fs");
const path = require("path");
const cells = require("../../fixtures/visual-cells");
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd()] }));

function option(name, fallback) {
  const index = process.argv.indexOf("--" + name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const url = option("url", null);
const out = path.resolve(option("out", "visual-shots"));
const only = option("only", null);
if (!url) {
  console.error("Pass --url of the running implementation.");
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: option("channel", undefined) });
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: Number(option("scale", 2)),
  });
  await page.goto(url);
  await page.waitForFunction(() => typeof wx !== "undefined" && typeof wx.reLaunch === "function");
  const keys = only ? only.split(",") : Object.keys(cells);
  for (const key of keys) {
    await page.evaluate((cell) => wx.reLaunch({ url: "/pages/gallery/index?cell=" + cell }), cells[key].cell);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(out, key + ".png") });
  }
  console.log("Captured " + keys.length + " cells → " + out);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
