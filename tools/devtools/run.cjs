// Runs the suite in the official WeChat developer-tool simulator and writes the report.
//
//   node tools/devtools/run.cjs --appid wx0123456789abcdef [--lib 3.7.12] [--out report.json]
//                               [--fixtures] [--ids case.a,case.b] [--cli /path/to/cli]
//
// The developer tool must be logged in with its service port enabled. Automation does
// not accept the tourist AppID, so pass an AppID the logged-in account can open. The
// suite runs from a temporary copy so the checkout's project files stay untouched.
//
// Besides starting the suite, this runner is the driver profile: it performs the touch
// input that cases request through cases/driver.js, and after the suite it runs the
// cold-start checks that restart the mini program (which the suite page cannot survive).
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
const selectedIds = ids ? ids.split(",") : null;
const cliPath = option("cli", "/Applications/wechatwebdevtools.app/Contents/MacOS/cli");
if (!appid) {
  console.error("Pass --appid (automation rejects touristappid).");
  process.exit(2);
}

const project = fs.mkdtempSync(path.join(os.tmpdir(), "mp-conformance-"));
fs.cpSync(root, project, {
  recursive: true,
  filter: (source) => !/[\\/](\.git|node_modules|\.scratch)$/.test(source),
});
const configPath = path.join(project, "project.config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
// The local network fixtures are not registered request domains.
const setting = { ...config.setting, urlCheck: false };
fs.writeFileSync(configPath, JSON.stringify({ ...config, appid, libVersion: lib, setting }, null, 2));
const fixtures = Boolean(option("fixtures", false));
const suiteConfig = {
  fixtureUrl: fixtures ? "http://127.0.0.1:8123" : "",
  socketUrl: fixtures ? "ws://127.0.0.1:8124" : "",
  testAppId: "",
  driver: true,
};
fs.writeFileSync(
  path.join(project, "suite-config.js"),
  "module.exports = " + JSON.stringify(suiteConfig) + ";\n",
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Polls the request queue filled by cases/driver.js and performs each action on the
// page-level element it names, then settles the request inside the app.
function startDriver(mp) {
  let running = true;
  const loop = (async () => {
    while (running) {
      await sleep(80);
      let requests = [];
      try {
        requests = await mp.evaluate(() => {
          const app = typeof getApp === "function" ? getApp() : null;
          const queue = app && app.__driverQueue;
          return queue ? queue.splice(0, queue.length) : [];
        });
      } catch {
        continue;
      }
      for (const request of requests || []) {
        let error = null;
        try {
          const page = await mp.currentPage();
          const element = await page.$(request.selector);
          if (!element) throw new Error("Driver found no element " + request.selector);
          await element[request.action](...(request.args || []));
        } catch (cause) {
          error = String((cause && cause.message) || cause);
        }
        await mp
          .evaluate((id, message) => getApp().__driverSettle(id, message), request.id, error)
          .catch(() => null);
      }
    }
  })();
  return async () => {
    running = false;
    await loop;
  };
}

async function waitFor(mp, probe, what, ...args) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await sleep(500);
    const value = await mp.evaluate(probe, ...args).catch(() => null);
    if (value) return value;
  }
  throw new Error(what);
}

// Cold-start checks restart the mini program, so they run after the suite report is
// captured. Each returns result entries in the suite report's format.
const COLD_START_CHECKS = [
  {
    ids: [
      "route.page-not-found-app-hook",
      "route.page-not-found-wx-listener",
      "route.page-not-found-sync-redirect",
    ],
    async run(mp) {
      await mp.evaluate(() => {
        wx.restartMiniProgram({ path: "/pages/missing-entry/index?tag=probe&from=cold" });
      });
      // App.onPageNotFound redirects to pages/suite/index?fromNotFound=1.
      return waitFor(
        mp,
        () => {
          const suite = getCurrentPages().find((entry) => entry.route === "pages/suite/index");
          if (!suite || !suite.entryOptions || suite.entryOptions.fromNotFound !== "1") return null;
          return typeof suite.verifyColdStart === "function" ? suite.verifyColdStart("page-not-found") : null;
        },
        "App did not recover to pages/suite/index via App.onPageNotFound",
      );
    },
  },
  {
    ids: ["subpackage.independent-cold-start", "subpackage.independent-default-app-merge"],
    async run(mp) {
      await mp.evaluate(() => {
        wx.restartMiniProgram({ path: "/indie/page/index?cold=1" });
      });
      const snapshot = await waitFor(
        mp,
        () => {
          const top = getCurrentPages().slice(-1)[0];
          return top && top.route === "indie/page/index" && top.snapshot ? top.snapshot : null;
        },
        "Independent subpackage page did not cold start",
      );
      // Leaving for a main-package page loads the main package and runs App().
      await mp.evaluate(() => {
        wx.reLaunch({ url: "/pages/suite/index?fromIndie=1" });
      });
      return waitFor(
        mp,
        (coldSnapshot) => {
          const suite = getCurrentPages().find((entry) => entry.route === "pages/suite/index");
          if (!suite || !suite.entryOptions || suite.entryOptions.fromIndie !== "1") return null;
          return typeof suite.verifyColdStart === "function"
            ? suite.verifyColdStart("independent", coldSnapshot)
            : null;
        },
        "Main package did not load after the independent subpackage cold start",
        snapshot,
      );
    },
  },
];

function summarize(results) {
  const passed = results.filter((result) => result.status === "PASS").length;
  const comparable = results.filter((result) => result.baselineConfirmed);
  const confirmed = comparable.filter((result) => result.status === "PASS").length;
  const breakdown = {};
  for (const category of ["behavior", "shape", "quirk"]) {
    const subset = results.filter((result) => result.category === category);
    breakdown[category] = {
      passed: subset.filter((result) => result.status === "PASS").length,
      total: subset.length,
    };
  }
  return {
    summary: passed + "/" + results.length + " passed",
    baselineScore: confirmed + "/" + comparable.length + " baseline-confirmed expectations passed",
    breakdown,
  };
}

(async () => {
  const mp = await automator.launch({ cliPath, projectPath: project, timeout: 120000 });
  try {
    const page = await mp.reLaunch("/pages/suite/index");
    await page.waitFor(1500);
    const sdk = await mp.evaluate(() => wx.getAppBaseInfo().SDKVersion);
    console.log("Simulator SDK " + sdk + (sdk === lib ? "" : " (requested " + lib + ")"));
    const stopDriver = startDriver(mp);
    // run() resolves only after the whole suite; poll the page instead of holding
    // one automation call open for that long.
    page.callMethod(ids ? "runSelected" : "run", ...(ids ? [selectedIds] : [])).catch(() => null);
    const deadline = Date.now() + 60 * 60 * 1000;
    let report = null;
    let lastLog = "";
    let failedPolls = 0;
    try {
      while (!report && Date.now() < deadline) {
        await sleep(ids ? 1500 : 3000);
        // A busy simulator can miss one automation response; only give up when polling
        // keeps failing.
        let probe;
        try {
          probe = await mp.evaluate(() => {
            const suite = getCurrentPages().find((entry) => entry.route === "pages/suite/index");
            const app = typeof getApp === "function" ? getApp() : null;
            const progress = app && app.__suiteProgress ? app.__suiteProgress : null;
            const summary = suite && suite.data.summary;
            if (!summary || summary === "Ready" || summary === "Running") {
              return { done: false, progress, stack: getCurrentPages().map((p) => p.route) };
            }
            return {
              done: true,
              summary,
              baselineScore: suite.data.baselineScore,
              report: suite.report,
            };
          });
          failedPolls = 0;
        } catch (error) {
          failedPolls += 1;
          if (failedPolls >= 5) throw error;
          continue;
        }
        if (probe && probe.done) {
          report = probe;
        } else if (probe && probe.progress) {
          const line = `  [${probe.progress.completed}] running ${probe.progress.current} (stack: ${probe.stack.join(" -> ")})`;
          if (line !== lastLog) {
            console.log(line);
            lastLog = line;
          }
        }
      }
    } finally {
      await stopDriver();
    }
    if (!report) throw new Error("The suite did not finish within an hour");

    if (!report.report.interrupted) {
      for (const coldStart of COLD_START_CHECKS) {
        const wanted = selectedIds ? coldStart.ids.filter((id) => selectedIds.includes(id)) : coldStart.ids;
        if (!wanted.length) continue;
        console.log("  running cold-start check " + coldStart.ids.join(", "));
        let entries;
        try {
          entries = await coldStart.run(mp);
        } catch (error) {
          entries = coldStart.ids.map((id) => ({
            id,
            category: "behavior",
            baselineConfirmed: false,
            evidence: "Cold-start check failed",
            status: "FAIL",
            expected: "null",
            actual: String((error && error.message) || error),
          }));
        }
        report.report.results.push(...entries.filter((entry) => wanted.includes(entry.id)));
      }
      Object.assign(report, summarize(report.report.results));
      report.report.breakdown = summarize(report.report.results).breakdown;
    }
    report.report.profiles = { ...report.report.profiles, driver: true };

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
