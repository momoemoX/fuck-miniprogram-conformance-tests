const { call } = require("./support");

// Bounds each route transition and lifecycle event. A cold first page load in a
// simulator can take several seconds; slowness alone is not a conformance failure.
const ROUTE_WAIT = 10000;

// Route driver for cases that open pages/lifecycle/index and observe its lifecycle events.
// The caller attaches a probe to the app instance so the page reports its phases:
//   app.lifecycleProbe = { record: harness.record };
function createRouteHarness() {
  const events = [];
  const waiters = [];
  function record(event) {
    events.push(event);
    for (const waiter of waiters.slice()) if (waiter.event === event) waiter.resolve();
  }
  // Waits for the next occurrence of event; call it before starting the route.
  function waitFor(event) {
    let timer;
    const waiter = { event };
    return new Promise((resolve, reject) => {
      waiter.resolve = resolve;
      waiters.push(waiter);
      timer = setTimeout(() => reject(new Error("Missing lifecycle event " + event)), ROUTE_WAIT);
    }).finally(() => {
      clearTimeout(timer);
      waiters.splice(waiters.indexOf(waiter), 1);
    });
  }
  async function navigate(method, options, path) {
    let timer;
    let listener;
    let poll;
    const target = path.replace(/^\//, "");
    // Official base libraries deliver a route-completion event; runtimes without it
    // fall back to polling the public page stack so navigation cases stay portable.
    if (typeof wx.onAppRouteDone === "function") {
      const completed = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Route animation did not complete")), ROUTE_WAIT);
        listener = (event) => {
          if (String(event.path).replace(/^\//, "") === target) resolve();
        };
        wx.onAppRouteDone(listener);
      });
      try {
        await Promise.all([completed, call(wx, method, options)]);
      } finally {
        clearTimeout(timer);
        if (listener) wx.offAppRouteDone(listener);
      }
      return;
    }
    // The route is complete once the top of the stack changed and shows the target.
    // Comparing the route alone would match immediately when a page opens another
    // instance of itself.
    const before = getCurrentPages();
    const beforeDepth = before.length;
    const beforeTop = before[beforeDepth - 1];
    const completed = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Route animation did not complete")), ROUTE_WAIT);
      poll = setInterval(() => {
        const stack = getCurrentPages();
        const top = stack[stack.length - 1];
        const changed = stack.length !== beforeDepth || top !== beforeTop;
        if (changed && top && top.route && top.route.replace(/^\//, "") === target) resolve();
      }, 40);
    });
    try {
      await Promise.all([completed, call(wx, method, options)]);
    } finally {
      clearTimeout(timer);
      clearInterval(poll);
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
