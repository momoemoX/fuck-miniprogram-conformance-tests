const { call, delay, waitUntil } = require("./support");
const { createRouteHarness, isolatedNavigation } = require("./route-harness");

function invokeRouteCallbacks(method, url) {
  return new Promise((resolve) => {
    const seen = [];
    let errMsg = "";
    wx[method]({
      url,
      success() {
        seen.push("success");
      },
      fail(error) {
        seen.push("fail");
        errMsg = error && error.errMsg ? String(error.errMsg) : String(error || "");
      },
      complete() {
        seen.push("complete");
        resolve({ seen, errMsg });
      },
    });
  });
}

async function restoreSuiteWithReLaunch(harness) {
  const app = getApp();
  let readyResolve;
  const ready = new Promise((resolve) => {
    readyResolve = resolve;
  });
  const previousProbe = app.reLaunchProbe;
  app.reLaunchProbe = {
    onSuiteUnload() {},
    onSuiteReady(suitePage) {
      if (readyResolve) readyResolve(suitePage);
    },
  };
  try {
    await harness.navigate("reLaunch", { url: "/pages/suite/index" }, "pages/suite/index");
    await Promise.race([
      ready,
      waitUntil(() => {
        const stack = getCurrentPages();
        return stack.length === 1 && stack[0] && stack[0].route === "pages/suite/index";
      }, { timeout: 5000 }),
    ]);
    const current = getCurrentPages().find((entry) => entry.route === "pages/suite/index");
    if (current && typeof current.setData === "function") {
      current.setData({ started: true, summary: "Running" });
    }
  } finally {
    if (previousProbe) app.reLaunchProbe = previousProbe;
    else delete app.reLaunchProbe;
  }
}

async function routeBoundaries(check) {
  await isolatedNavigation(
    check,
    "route.stack-limit-overflow",
    [10, ["fail", "complete"], true, 10, true, [], 10, true, true, true],
    async (harness) => {
      const targetExtras = 10 - harness.initialDepth;
      for (let i = 1; i <= targetExtras; i += 1) {
        await harness.open("s" + i);
      }
      const maxDepth = getCurrentPages().length;
      const topBefore = getCurrentPages()[maxDepth - 1];
      harness.events.length = 0;

      const overflow = await invokeRouteCallbacks(
        "navigateTo",
        "/pages/lifecycle/index?name=overflow",
      );
      const depthAfterOverflow = getCurrentPages().length;
      const sameTopAfterOverflow = getCurrentPages()[depthAfterOverflow - 1] === topBefore;
      const overflowEvents = harness.events.slice();

      harness.events.length = 0;
      const replaced = await harness.open("replaced", "redirectTo");
      const redirectDepth = getCurrentPages().length;
      const lastPushName = "s" + targetExtras;

      return [
        maxDepth,
        overflow.seen,
        overflow.errMsg.length > 0,
        depthAfterOverflow,
        sameTopAfterOverflow,
        overflowEvents,
        redirectDepth,
        replaced !== topBefore,
        harness.events.indexOf(lastPushName + ".unload") !== -1,
        harness.events.indexOf("replaced.load") !== -1,
      ];
    },
  );

  await check(
    "route.switch-tab-rejects-non-tab",
    [["fail", "complete"], true, "pages/suite/index", 1, true],
    async () => {
      const initial = getCurrentPages().slice(-1)[0];
      try {
        const outcome = await invokeRouteCallbacks("switchTab", "/pages/lifecycle/index");
        const stack = getCurrentPages();
        const top = stack[stack.length - 1];
        return [
          outcome.seen,
          outcome.errMsg.length > 0,
          top ? top.route : "",
          stack.length,
          top === initial,
        ];
      } finally {
        const stack = getCurrentPages();
        const top = stack[stack.length - 1];
        if (!top || top.route !== "pages/suite/index") {
          await call(wx, "switchTab", { url: "/pages/suite/index" }).catch(() => null);
        }
      }
    },
  );

  // 3.7.12 runtime quirk: switchTab with query parameters succeeds and strips the query
  // instead of rejecting, delivering empty options on the tab page.
  await check(
    "route.switch-tab-query-stripped",
    [["success", "complete"], "pages/tab/index", 1, {}, true],
    async () => {
      const app = getApp();
      const initial = getCurrentPages().slice(-1)[0];
      const harness = createRouteHarness();
      try {
        let tabTimer;
        const tabShown = new Promise((resolve, reject) => {
          tabTimer = setTimeout(() => reject(new Error("Tab page did not show")), 10000);
          app.tabJourney = resolve;
        }).finally(() => clearTimeout(tabTimer));

        const [outcome] = await Promise.all([
          invokeRouteCallbacks("switchTab", "/pages/tab/index?foo=bar"),
          tabShown,
        ]);
        const stack = getCurrentPages();
        const top = stack[stack.length - 1];
        const receivedOptions = top && top.options ? { ...top.options } : {};

        await harness.navigate("switchTab", { url: "/pages/suite/index" }, "pages/suite/index");
        const restored = getCurrentPages();
        return [
          outcome.seen,
          top ? top.route : "",
          stack.length,
          receivedOptions,
          restored[restored.length - 1] === initial,
        ];
      } finally {
        delete app.tabJourney;
        const stack = getCurrentPages();
        const top = stack[stack.length - 1];
        if (!top || top.route !== "pages/suite/index") {
          await call(wx, "switchTab", { url: "/pages/suite/index" }).catch(() => null);
        }
      }
    },
  );

  await check(
    "route.switch-tab-clears-non-tab-stack",
    [["alpha.unload", "beta.unload"], 1, "pages/tab/index", 1, true],
    async () => {
      const app = getApp();
      const initialPage = getCurrentPages().slice(-1)[0];
      const harness = createRouteHarness();
      app.lifecycleProbe = { record: harness.record };
      try {
        await harness.open("alpha");
        await harness.open("beta");
        harness.events.length = 0;

        let tabTimer;
        const tabShown = new Promise((resolve, reject) => {
          tabTimer = setTimeout(() => reject(new Error("Tab page did not show")), 10000);
          app.tabJourney = resolve;
        }).finally(() => clearTimeout(tabTimer));

        await Promise.all([
          tabShown,
          harness.navigate("switchTab", { url: "/pages/tab/index" }, "pages/tab/index"),
        ]);
        const unloaded = harness.events.filter((event) => event.endsWith(".unload")).sort();
        const tabStack = getCurrentPages();
        const tabDepth = tabStack.length;
        const tabRoute = tabStack[tabStack.length - 1].route;

        await harness.navigate("switchTab", { url: "/pages/suite/index" }, "pages/suite/index");
        const restoredStack = getCurrentPages();
        return [
          unloaded,
          tabDepth,
          tabRoute,
          restoredStack.length,
          restoredStack[restoredStack.length - 1] === initialPage,
        ];
      } finally {
        delete app.tabJourney;
        delete app.lifecycleProbe;
        const stack = getCurrentPages();
        const top = stack[stack.length - 1];
        if (stack.length !== 1 || !top || top.route !== "pages/suite/index") {
          await call(wx, "switchTab", { url: "/pages/suite/index" }).catch(() => null);
        }
      }
    },
  );

  await check(
    "route.page-not-found-in-app-isolation",
    [true, ["fail", "complete"], ["fail", "complete"], ["fail", "complete"], 0, 0, 0, 1, true],
    async () => {
      const app = getApp();
      const initialPage = getCurrentPages().slice(-1)[0];
      const hasApi =
        typeof wx.onPageNotFound === "function" && typeof wx.offPageNotFound === "function";
      const appBefore = app.pageNotFoundEvents.length;
      const wxBefore = app.wxPageNotFoundEvents ? app.wxPageNotFoundEvents.length : 0;
      let localHits = 0;
      const listener = () => {
        localHits += 1;
      };
      if (hasApi) wx.onPageNotFound(listener);
      try {
        const nav = await invokeRouteCallbacks("navigateTo", "/pages/not-declared/index");
        const redir = await invokeRouteCallbacks("redirectTo", "/pages/not-declared/index");
        const relaunch = await invokeRouteCallbacks("reLaunch", "/pages/not-declared/index");
        // Negative window: verify no asynchronous onPageNotFound event arrives.
        await delay(100);
        const stack = getCurrentPages();
        return [
          hasApi,
          nav.seen,
          redir.seen,
          relaunch.seen,
          app.pageNotFoundEvents.length - appBefore,
          (app.wxPageNotFoundEvents ? app.wxPageNotFoundEvents.length : 0) - wxBefore,
          localHits,
          stack.length,
          stack[stack.length - 1] === initialPage,
        ];
      } finally {
        if (hasApi) wx.offPageNotFound(listener);
      }
    },
  );
}

// Destructive-stack cases that intentionally call wx.reLaunch and restore pages/suite/index
// as a fresh instance. Run after all page-DOM-dependent core cases.
async function reLaunchBoundaries(check) {
  await check(
    "route.relaunch-clears-stack-and-query",
    [
      ["alpha.unload", "beta.unload", "suite.unload"],
      ["relaunch.load", "relaunch.show", "relaunch.ready"],
      1,
      "pages/lifecycle/index",
      { name: "relaunch", tag: "fresh", num: "42" },
    ],
    async () => {
      const app = getApp();
      const harness = createRouteHarness();
      app.lifecycleProbe = { record: harness.record };
      app.reLaunchProbe = {
        onSuiteUnload() {
          harness.record("suite.unload");
        },
        onSuiteReady() {},
      };
      try {
        await harness.open("alpha");
        await harness.open("beta");
        harness.events.length = 0;

        const ready = harness.waitFor("relaunch.ready");
        await Promise.all([
          ready,
          harness.navigate(
            "reLaunch",
            { url: "/pages/lifecycle/index?name=relaunch&tag=fresh&num=42" },
            "pages/lifecycle/index",
          ),
        ]);
        const stack = getCurrentPages();
        const top = stack[stack.length - 1];
        const unloaded = harness.events.filter((event) => event.endsWith(".unload")).sort();
        const relaunchOrder = harness.events.filter((event) => event.startsWith("relaunch."));
        return [
          unloaded,
          relaunchOrder,
          stack.length,
          top.route,
          {
            name: top.suiteOptions.name,
            tag: top.suiteOptions.tag,
            num: top.suiteOptions.num,
          },
        ];
      } finally {
        delete app.lifecycleProbe;
        delete app.reLaunchProbe;
        await restoreSuiteWithReLaunch(harness);
      }
    },
    { allowsReLaunch: true },
  );

  await check(
    "route.relaunch-to-tab-page",
    [["alpha.unload", "suite.unload"], 1, 1, "pages/tab/index"],
    async () => {
      const app = getApp();
      const harness = createRouteHarness();
      app.lifecycleProbe = { record: harness.record };
      app.reLaunchProbe = {
        onSuiteUnload() {
          harness.record("suite.unload");
        },
        onSuiteReady() {},
      };
      try {
        await harness.open("alpha");
        harness.events.length = 0;

        let tabTimer;
        const tabShown = new Promise((resolve, reject) => {
          tabTimer = setTimeout(() => reject(new Error("Tab page did not show")), 10000);
          app.tabJourney = resolve;
        }).finally(() => clearTimeout(tabTimer));

        const [visits] = await Promise.all([
          tabShown,
          harness.navigate("reLaunch", { url: "/pages/tab/index" }, "pages/tab/index"),
        ]);
        const stack = getCurrentPages();
        const unloaded = harness.events.filter((event) => event.endsWith(".unload")).sort();
        return [unloaded, visits, stack.length, stack[stack.length - 1].route];
      } finally {
        delete app.tabJourney;
        delete app.lifecycleProbe;
        delete app.reLaunchProbe;
        await restoreSuiteWithReLaunch(harness);
      }
    },
    { allowsReLaunch: true },
  );
}

module.exports = { routeBoundaries, reLaunchBoundaries };
