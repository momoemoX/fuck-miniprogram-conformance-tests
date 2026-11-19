// Runs the suite in the official WeChat developer-tool simulator and writes the report.
//
//   node tools/devtools/run.cjs --appid wx0123456789abcdef [--lib 3.7.12] [--out report.json]
//                               [--fixtures] [--ids case.a,case.b] [--cli /path/to/cli]
//
// The developer tool must be logged in with its service port enabled. Automation does
// not accept the tourist AppID, so pass an AppID the logged-in account can open. The
// suite runs from a temporary copy so the checkout's project files stay untouched.
const automator = require("miniprogram-automator");
const fs = require("fs");
const os = require("os");
const path = require("path");

function option(name, fallback) {
  const index = process.argv.indexOf("--" + name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? true : value;
}

const root = path.resolve(__dirname, "..", "..");
const appid = option("appid", process.env.APPID);
const lib = option("lib", "3.7.12");
const out = path.resolve(option("out", "devtools-report.json"));
const ids = option("ids", null);
const cliPath = option("cli", "/Applications/wechatwebdevtools.app/Contents/MacOS/cli");
if (!appid) {
  console.error("Pass --appid (automation rejects touristappid).");
  process.exit(2);
}

const project = fs.mkdtempSync(path.join(os.tmpdir(), "mp-conformance-"));
fs.cpSync(root, project, {
  recursive: true,
  filter: (source) => !/[\\/](\.git|node_modules)$/.test(source),
});
const configPath = path.join(project, "project.config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
// The local network fixtures are not registered request domains.
const setting = { ...config.setting, urlCheck: false };
fs.writeFileSync(configPath, JSON.stringify({ ...config, appid, libVersion: lib, setting }, null, 2));
if (option("fixtures", false)) {
  fs.writeFileSync(
    path.join(project, "suite-config.js"),
    'module.exports = { fixtureUrl: "http://127.0.0.1:8123", socketUrl: "ws://127.0.0.1:8124", testAppId: "" };\n',
  );
}

(async () => {
  const mp = await automator.launch({ cliPath, projectPath: project, timeout: 120000 });
  try {
    const page = await mp.reLaunch("/pages/suite/index");
    await page.waitFor(1500);
    const sdk = await mp.evaluate(() => wx.getAppBaseInfo().SDKVersion);
    console.log("Simulator SDK " + sdk + (sdk === lib ? "" : " (requested " + lib + ")"));
    // run() resolves only after the whole suite; poll the page instead of holding
    // one automation call open for that long.
    page.callMethod(ids ? "runSelected" : "run", ...(ids ? [ids.split(",")] : [])).catch(() => null);
    const deadline = Date.now() + 60 * 60 * 1000;
    let report = null;
    while (!report && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, ids ? 1500 : 5000));
      report = await mp.evaluate(() => {
        const suite = getCurrentPages().find((entry) => entry.route === "pages/suite/index");
        const summary = suite && suite.data.summary;
        if (!summary || summary === "Ready" || summary === "Running") return null;
        return { summary, baselineScore: suite.data.baselineScore, report: suite.report };
      });
    }
    if (!report) throw new Error("The suite did not finish within an hour");
    fs.writeFileSync(out, JSON.stringify({ sdk, ...report }, null, 2));
    console.log(report.summary + " | " + report.baselineScore);
    for (const result of report.report.results) {
      if (result.status !== "PASS") {
        console.log("FAIL " + result.id + " expected " + result.expected + " actual " + result.actual);
      }
    }
    console.log("Report written to " + out);
  } finally {
    await mp.close();
    fs.rmSync(project, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
