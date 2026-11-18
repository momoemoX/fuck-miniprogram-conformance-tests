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

module.exports = { update, call, query, uniqueKey };
