// Verifies the real App.onPageNotFound / wx.onPageNotFound trigger path in the official
// WeChat developer-tool simulator via wx.restartMiniProgram to an undeclared route.
//
//   node tools/devtools/check-page-not-found.cjs --appid wx0123456789abcdef
//                                                [--lib 3.7.12] [--out report.json]
//                                                [--cli /path/to/cli]
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
const out = path.resolve(option("out", "page-not-found-report.json"));
const cliPath = option("cli", "/Applications/wechatwebdevtools.app/Contents/MacOS/cli");
if (!appid) {
  console.error("Pass --appid (automation rejects touristappid).");
  process.exit(2);
}

const project = fs.mkdtempSync(path.join(os.tmpdir(), "mp-not-found-"));
fs.cpSync(root, project, {
  recursive: true,
  filter: (source) => !/[\\/](\.git|node_modules)$/.test(source),
});

const configPath = path.join(project, "project.config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const setting = { ...config.setting, urlCheck: false };
fs.writeFileSync(
  configPath,
  JSON.stringify({ ...config, appid, libVersion: lib, setting }, null, 2),
);

(async () => {
  const mp = await automator.launch({ cliPath, projectPath: project, timeout: 120000 });
  try {
    await mp.reLaunch("/pages/suite/index");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const sdk = await mp.evaluate(() => wx.getAppBaseInfo().SDKVersion);
    console.log("Simulator SDK " + sdk + (sdk === lib ? "" : " (requested " + lib + ")"));

    // Trigger real onPageNotFound by restarting into an undeclared page path.
    await mp.evaluate(() => {
      wx.restartMiniProgram({ path: "/pages/missing-entry/index?tag=probe&from=cold" });
    });

    // Wait for App.onPageNotFound -> synchronous wx.reLaunch to land on pages/suite/index?fromNotFound=1.
    let report = null;
    const deadline = Date.now() + 30000;
    while (!report && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      report = await mp
        .evaluate(() => {
          const suite = getCurrentPages().find((entry) => entry.route === "pages/suite/index");
          if (!suite || !suite.entryOptions || suite.entryOptions.fromNotFound !== "1") return null;
          if (typeof suite.verifyPageNotFoundEntry !== "function") return null;
          return suite.verifyPageNotFoundEntry();
        })
        .catch(() => null);
    }
    if (!report) {
      throw new Error("App did not recover to pages/suite/index via App.onPageNotFound");
    }

    fs.writeFileSync(out, JSON.stringify({ sdk, ...report }, null, 2));
    console.log(report.summary);
    let failed = 0;
    for (const result of report.results) {
      if (result.status !== "PASS") {
        failed += 1;
        console.log("FAIL " + result.id + " expected " + result.expected + " actual " + result.actual);
      }
    }
    console.log("Report written to " + out);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await mp.close();
    fs.rmSync(project, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
