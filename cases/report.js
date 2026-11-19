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
const REPRODUCED = "Reproduced on " + TARGET;
// One case may chain several navigations, each bounded by its own 5s wait.
const CASE_TIMEOUT = 30000;
// After a timeout the exercise keeps running; its cleanup gets this long to restore
// the shared page state before the run stops instead of contaminating later cases.
const CLEANUP_GRACE = 15000;

class RunInterrupted extends Error {}

function makeReport(filter) {
  const results = [];
  const home = getCurrentPages();
  const homeDepth = home.length;
  const homePage = home[homeDepth - 1];
  function stackRestored() {
    const stack = getCurrentPages();
    return stack.length === homeDepth && stack[stack.length - 1] === homePage;
  }
  async function check(id, expected, exercise) {
    if (filter && filter.indexOf(id) === -1) return;
    let actual,
      passed = false,
      timer,
      timedOut = false;
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
      if (!finished) actual += " (cleanup still pending after " + CLEANUP_GRACE + "ms)";
    }
    const reproduced =
      Object.prototype.hasOwnProperty.call(reference, id) && matches(reference[id], expected);
    results.push({
      id,
      evidence: reproduced ? REPRODUCED : "Pending baseline confirmation",
      status: passed ? "PASS" : "FAIL",
      expected: JSON.stringify(expected),
      actual,
    });
    // Every case must hand back the page stack it started with; later cases assume it.
    if (!(await waitUntil(stackRestored, { timeout: 3000 }))) {
      throw new RunInterrupted("Case " + id + " left the page stack changed");
    }
  }
  function summary() {
    return (
      results.filter((result) => result.status === "PASS").length + "/" + results.length + " passed"
    );
  }
  function baselineScore() {
    const comparable = results.filter((result) => result.evidence === REPRODUCED);
    const confirmed = comparable.filter((result) => result.status === "PASS");
    return confirmed.length + "/" + comparable.length + " reproduced expectations matched";
  }
  return { check, results, summary, baselineScore };
}

module.exports = { makeReport, matches, RunInterrupted, TARGET };
