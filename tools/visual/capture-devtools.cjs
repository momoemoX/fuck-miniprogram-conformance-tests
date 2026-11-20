// Captures raw screenshots of every visual cell in the official developer-tool simulator.
//
//   node tools/visual/capture-devtools.cjs --appid wx0123456789abcdef --out raw/
//                                          [--font serif] [--lib 3.7.12] [--only key,key]
//
// Writes <key>.png per cell plus stage.json with each stage's height in CSS pixels.
// tools/visual/record.cjs turns several captures into the committed references.
const automator = require("miniprogram-automator");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const cells = require("../../fixtures/visual-cells");

function option(name, fallback) {
  const index = process.argv.indexOf("--" + name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const root = path.resolve(__dirname, "..", "..");
const appid = option("appid", process.env.APPID);
const lib = option("lib", "3.7.12");
const out = path.resolve(option("out", "visual-raw"));
const font = option("font", "");
const only = option("only", null);
const cliPath = option("cli", "/Applications/wechatwebdevtools.app/Contents/MacOS/cli");
if (!appid) {
  console.error("Pass --appid (automation rejects touristappid).");
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });

const project = fs.mkdtempSync(path.join(os.tmpdir(), "mp-visual-"));
fs.cpSync(root, project, { recursive: true, filter: (source) => !/[\\/](\.git|node_modules)$/.test(source) });
const configPath = path.join(project, "project.config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
fs.writeFileSync(configPath, JSON.stringify({ ...config, appid, libVersion: lib }, null, 2));

async function shoot(mp, key) {
  const query = "cell=" + cells[key].cell + (font ? "&font=" + encodeURIComponent(font) : "");
  const page = await mp.reLaunch("/pages/gallery/index?" + query);
  // Leave time for entry transitions, image decoding and control animations.
  await page.waitFor(900);
  const box = await (await page.$(".stage")).size();
  fs.writeFileSync(path.join(out, key + ".png"), Buffer.from(await mp.screenshot(), "base64"));
  return Math.round(box.height);
}

const launch = () => automator.launch({ cliPath, projectPath: project, timeout: 120000 });

(async () => {
  let mp = await launch();
  const stage = {};
  try {
    const keys = only ? only.split(",") : Object.keys(cells);
    for (const key of keys) {
      try {
        stage[key] = await shoot(mp, key);
      } catch (error) {
        // The simulator occasionally stops answering; restart it and try the cell once more.
        console.error("Retrying " + key + " after: " + (error.message || error));
        await mp.close().catch(() => {});
        spawnSync(cliPath, ["quit"]);
        await new Promise((resolve) => setTimeout(resolve, 6000));
        mp = await launch();
        stage[key] = await shoot(mp, key);
      }
    }
    console.log("Captured " + keys.length + " cells → " + out);
  } finally {
    fs.writeFileSync(path.join(out, "stage.json"), JSON.stringify(stage, null, 2));
    await mp.close().catch(() => {});
    fs.rmSync(project, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
