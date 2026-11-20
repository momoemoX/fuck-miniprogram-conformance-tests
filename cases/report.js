const reference = require("../fixtures/reference");
const { waitUntil } = require("./support");

// Expected values are JSON data. Preserve array order and ignore object key order.
function matches(actual, expected) {
  if (actual === expected) return true;
  if (
    actual === null ||
    expected === null ||
    typeof actual !== "object" ||
    typeof expected !== "object"
  )
    return false;
  if (Array.isArray(actual) !== Array.isArray(expected)) return false;
  if (Array.isArray(expected) && actual.length !== expected.length) return false;
  const keys = Object.keys(expected);
  return (
    keys.length === Object.keys(actual).length &&
    keys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(actual, key) && matches(actual[key], expected[key]),
    )
  );
}

const TARGET = "3.7.12";
const BASELINE_CONFIRMED = "Baseline-confirmed expectation (" + TARGET + ")";
// Cases whose expected value captures a known 3.7.12 runtime quirk rather than a
// clean specification requirement (e.g. off(name, fn) failing due to try/catch shimming,
// switchTab stripping query instead of rejecting, simulator following manual redirects,
// or beforeDetach not being delivered under the default component framework).
const QUIRKS = new Set([
  "channel.off-listener",
  "route.switch-tab-query-stripped",
  "http.redirect-manual",
  "component.before-detach-order",
]);
// Cases that primarily check returned object shapes, enum membership or singleton
// identity rather than complex multi-step runtime behavior.
const SHAPE_CHECKS = new Set([
  "audio.background-singleton",
  "audio.recorder-singleton",
  "network.type-result",
  "storage.async-info",
  "storage.info-sync-shape",
  "system.account-info-shape",
  "system.api-capability",
  "system.app-language",
  "system.async-callback",
  "system.async-window",
  "system.authorize-setting-values",
  "system.base-version",
  "system.device-info-shape",
  "system.device-platform",
  "system.menu-geometry",
  "system.safe-area",
  "system.setting-shape",
  "system.sync-and-split",
  "system.window-dimensions",
]);

function categoryOf(id) {
  if (QUIRKS.has(id)) return "quirk";
  if (SHAPE_CHECKS.has(id)) return "shape";
  return "behavior";
}

// One case may chain several navigations, each bounded by its own 10s wait.
const CASE_TIMEOUT = 60000;
// After a timeout the exercise keeps running; its cleanup gets this long to restore
// the shared page state before the run stops instead of contaminating later cases.
const CLEANUP_GRACE = 15000;

class RunInterrupted extends Error {}

function resultEntry(id, expected, actualText, passed) {
  const baselineConfirmed =
    Object.prototype.hasOwnProperty.call(reference, id) && matches(reference[id], expected);
  return {
    id,
    category: categoryOf(id),
    baselineConfirmed,
    evidence: baselineConfirmed ? BASELINE_CONFIRMED : "Pending baseline confirmation",
    status: passed ? "PASS" : "FAIL",
    expected: JSON.stringify(expected),
    actual: actualText,
  };
}

function makeReport(filter) {
  const results = [];
  const home = getCurrentPages();
  const homeDepth = home.length;
  let homePage = home[homeDepth - 1];
  const homeRoute = homePage && homePage.route;
  function stackRestored(allowsReLaunch) {
    const stack = getCurrentPages();
    if (stack.length !== homeDepth) return false;
    const top = stack[stack.length - 1];
    if (top === homePage) return true;
    if (allowsReLaunch && top && top.route === homeRoute) {
      homePage = top;
      return true;
    }
    return false;
  }
  async function check(id, expected, exercise, options = {}) {
    if (filter && filter.indexOf(id) === -1) return;
    const app = typeof getApp === "function" ? getApp() : null;
    if (app) app.__suiteProgress = { current: id, completed: results.length };
    let actual,
      passed = false,
      timer,
      timedOut = false,
      cleanupPending = false;
    const run = Promise.resolve().then(exercise);
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new Error("Case timed out: " + id));
        }, CASE_TIMEOUT);
      });
      const value = await Promise.race([run, timeout]);
      actual = JSON.stringify(value) ?? String(value);
      passed = matches(value, expected);
    } catch (error) {
      actual = String(error);
    } finally {
      clearTimeout(timer);
    }
    if (timedOut) {
      let grace;
      const finished = await Promise.race([
        run.then(
          () => true,
          () => true,
        ),
        new Promise((resolve) => {
          grace = setTimeout(() => resolve(false), CLEANUP_GRACE);
        }),
      ]);
      clearTimeout(grace);
      if (!finished) {
        cleanupPending = true;
        actual += " (cleanup still pending after " + CLEANUP_GRACE + "ms)";
      }
    }
    results.push(resultEntry(id, expected, actual, passed));
    if (cleanupPending) {
      throw new RunInterrupted(
        "Case " + id + " cleanup did not finish within " + CLEANUP_GRACE + "ms",
      );
    }
    // Every case must hand back the page stack it started with; later cases assume it.
    const allowsReLaunch = Boolean(options && options.allowsReLaunch);
    if (!(await waitUntil(() => stackRestored(allowsReLaunch), { timeout: 3000 }))) {
      throw new RunInterrupted("Case " + id + " left the page stack changed");
    }
  }
  function summary() {
    return (
      results.filter((result) => result.status === "PASS").length + "/" + results.length + " passed"
    );
  }
  function baselineScore() {
    const comparable = results.filter((result) => result.baselineConfirmed);
    const confirmed = comparable.filter((result) => result.status === "PASS");
    return confirmed.length + "/" + comparable.length + " baseline-confirmed expectations passed";
  }
  function breakdown() {
    const tally = (category) => {
      const subset = results.filter((result) => result.category === category);
      return {
        passed: subset.filter((result) => result.status === "PASS").length,
        total: subset.length,
      };
    };
    return {
      behavior: tally("behavior"),
      shape: tally("shape"),
      quirk: tally("quirk"),
    };
  }
  function breakdownSummary() {
    const b = breakdown();
    return [
      "Behavior " + b.behavior.passed + "/" + b.behavior.total,
      "Shape " + b.shape.passed + "/" + b.shape.total,
      "Quirk " + b.quirk.passed + "/" + b.quirk.total,
    ].join(" · ");
  }
  return { check, results, summary, baselineScore, breakdown, breakdownSummary };
}

module.exports = { makeReport, matches, resultEntry, RunInterrupted, TARGET, QUIRKS, SHAPE_CHECKS, categoryOf };
