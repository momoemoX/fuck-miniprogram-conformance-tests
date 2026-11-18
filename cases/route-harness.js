const { call } = require("./support");

// Route driver for cases that open pages/lifecycle/index and observe its lifecycle events.
// The caller attaches a probe to the app instance so the page reports its phases:
//   app.lifecycleProbe = { record: harness.record };
function createRouteHarness() {
  const events = [];
  const waiters = new Map();
  function record(event) {
    events.push(event);
    const notify = waiters.get(event);
    if (notify) notify();
  }
  function waitFor(event) {
    let timer;
    return new Promise((resolve, reject) => {
      waiters.set(event, resolve);
      timer = setTimeout(() => reject(new Error("Missing lifecycle event " + event)), 5000);
    }).finally(() => {
      clearTimeout(timer);
      waiters.delete(event);
    });
  }
  async function navigate(method, options, path) {
    let timer, listener;
    const completed = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Route animation did not complete")), 5000);
      listener = (event) => {
        if (event.path.replace(/^\//, "") === path) resolve();
      };
      wx.onAppRouteDone(listener);
    });
    try {
      await Promise.all([completed, call(wx, method, options)]);
    } finally {
      clearTimeout(timer);
      if (listener) wx.offAppRouteDone(listener);
    }
  }
  async function open(name, method = "navigateTo", suffix = "") {
    const ready = waitFor(name + ".ready");
    await Promise.all([
      ready,
      navigate(method, { url: "/pages/lifecycle/index?name=" + name + suffix }, "pages/lifecycle/index"),
    ]);
    return getCurrentPages().slice(-1)[0];
  }
  async function back(name, delta = 1) {
    const shown = waitFor(name + ".show");
    await Promise.all([shown, navigate("navigateBack", { delta }, "pages/lifecycle/index")]);
    return getCurrentPages().slice(-1)[0];
  }
  return { events, record, waitFor, navigate, open, back };
}

// Runs one check with an isolated page stack: opens pages under a probe, then restores
// the stack depth and page instance the caller started with.
async function isolatedNavigation(check, id, expected, exercise) {
  await check(id, expected, async () => {
    const app = getApp();
    const initialStack = getCurrentPages();
    const initialDepth = initialStack.length;
    const initialPage = initialStack[initialDepth - 1];
    const harness = createRouteHarness();
    harness.initialDepth = initialDepth;
    app.lifecycleProbe = { record: harness.record };
    try {
      return await exercise(harness);
    } finally {
      try {
        const extra = getCurrentPages().length - initialDepth;
        if (extra > 0) {
          await harness.navigate("navigateBack", { delta: extra }, initialPage.route);
          const restored = getCurrentPages();
          if (restored.length !== initialDepth || restored[restored.length - 1] !== initialPage) {
            throw new Error("Page stack was not restored after cleanup");
          }
        }
      } finally {
        delete app.lifecycleProbe;
      }
    }
  });
}

module.exports = { createRouteHarness, isolatedNavigation };
