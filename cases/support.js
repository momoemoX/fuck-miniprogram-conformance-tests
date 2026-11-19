function update(instance, patch) {
  return new Promise((resolve) => instance.setData(patch, resolve));
}

function call(target, method, options = {}) {
  return new Promise((resolve, reject) =>
    target[method]({
      ...options,
      success: resolve,
      fail: (error) => reject(new Error(error.errMsg || String(error))),
    }),
  );
}

function query(page, selector, fields, all = false) {
  return new Promise((resolve) => {
    const batch = page.createSelectorQuery();
    const nodes = all ? batch.selectAll(selector) : batch.select(selector);
    nodes.fields(fields, resolve);
    batch.exec();
  });
}

function uniqueKey() {
  return "suite-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Resolves with the first truthy result of probe(), or with the last result once
// the deadline passes. Positive checks wait on the observation instead of a fixed
// delay, so a slower implementation is not reported as nonconforming.
async function waitUntil(probe, { timeout = 3000, interval = 40 } = {}) {
  const deadline = Date.now() + timeout;
  let value = await probe();
  while (!value && Date.now() < deadline) {
    await delay(interval);
    value = await probe();
  }
  return value;
}

// Resolves once read() has returned an unchanged length for quietMs, which lets
// throttled event streams finish before a case reads their final entry.
async function settled(read, { quietMs = 250, timeout = 3000, interval = 40 } = {}) {
  const deadline = Date.now() + timeout;
  let length = read().length;
  let stableSince = Date.now();
  while (Date.now() < deadline) {
    await delay(interval);
    const next = read().length;
    if (next !== length) {
      length = next;
      stableSince = Date.now();
    } else if (length > 0 && Date.now() - stableSince >= quietMs) {
      break;
    }
  }
  return read();
}

module.exports = { update, call, query, uniqueKey, delay, waitUntil, settled };
