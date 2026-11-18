const reference = require("../fixtures/reference");

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

function makeReport(filter) {
  const results = [];
  async function check(id, expected, exercise) {
    if (filter && filter.indexOf(id) === -1) return;
    let actual,
      passed = false,
      timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Case timed out: " + id)), 15000);
      });
      const value = await Promise.race([Promise.resolve().then(exercise), timeout]);
      actual = JSON.stringify(value) ?? String(value);
      passed = matches(value, expected);
    } catch (error) {
      actual = String(error);
    } finally {
      clearTimeout(timer);
    }
    const reproduced =
      Object.prototype.hasOwnProperty.call(reference, id) && matches(reference[id], expected);
    results.push({
      id,
      evidence: reproduced ? "Reproduced on 3.7.0" : "Pending baseline confirmation",
      status: passed ? "PASS" : "FAIL",
      expected: JSON.stringify(expected),
      actual,
    });
  }
  function summary() {
    return (
      results.filter((result) => result.status === "PASS").length + "/" + results.length + " passed"
    );
  }
  function baselineScore() {
    const comparable = results.filter((result) => result.evidence === "Reproduced on 3.7.0");
    const confirmed = comparable.filter((result) => result.status === "PASS");
    return confirmed.length + "/" + comparable.length + " reproduced expectations matched";
  }
  return { check, results, summary, baselineScore };
}

module.exports = { makeReport };
