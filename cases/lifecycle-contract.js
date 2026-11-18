const { call, update } = require("./support");

async function lifecycleContract(check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      const app = getApp();
      const initialStack = getCurrentPages();
      const initialDepth = initialStack.length;
      const initialPage = initialStack[initialDepth - 1];
      const events = [];
      const waiters = new Map();
      app.lifecycleProbe = {
        record(event) {
          events.push(event);
          const notify = waiters.get(event);
          if (notify) notify();
        },
      };
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
          navigate(
            method,
            { url: "/pages/lifecycle/index?name=" + name + suffix },
            "pages/lifecycle/index",
          ),
        ]);
        return getCurrentPages().slice(-1)[0];
      }
      async function back(name, delta = 1) {
        const shown = waitFor(name + ".show");
        await Promise.all([shown, navigate("navigateBack", { delta }, "pages/lifecycle/index")]);
        return getCurrentPages().slice(-1)[0];
      }
      try {
        const value = await exercise({ open, back, events, initialDepth });
        // Cleanup can emit more lifecycle events, so retain a snapshot of the observation.
        return JSON.parse(JSON.stringify(value));
      } finally {
        try {
          const extra = getCurrentPages().length - initialDepth;
          if (extra > 0) {
            await navigate("navigateBack", { delta: extra }, initialPage.route);
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

  await isolated(
    "lifecycle.initial-order",
    ["alpha.load", "alpha.show", "alpha.ready"],
    async ({ open, events }) => {
      await open("alpha");
      return events;
    },
  );
  await isolated(
    "lifecycle.push-order",
    ["alpha.hide", "beta.load", "beta.show", "beta.ready"],
    async ({ open, events }) => {
      await open("alpha");
      events.length = 0;
      await open("beta");
      return events;
    },
  );
  await isolated(
    "lifecycle.back-order",
    ["beta.unload", "alpha.show"],
    async ({ open, back, events }) => {
      await open("alpha");
      await open("beta");
      events.length = 0;
      await back("alpha");
      return events;
    },
  );
  await isolated("lifecycle.hidden-page-retained", [true, 7], async ({ open, back }) => {
    const first = await open("alpha");
    await update(first, { counter: 7 });
    await open("beta");
    const returned = await back("alpha");
    return [returned === first, returned.data.counter];
  });
  await isolated(
    "lifecycle.multi-back",
    [["beta.unload", "gamma.unload"], "alpha", 1],
    async ({ open, back, events, initialDepth }) => {
      await open("alpha");
      await open("beta");
      await open("gamma");
      events.length = 0;
      const returned = await back("alpha", 2);
      return [
        events.filter((event) => event.endsWith(".unload")).sort(),
        returned.suiteName,
        getCurrentPages().length - initialDepth,
      ];
    },
  );
  await isolated(
    "lifecycle.redirect-replacement",
    [1, 1, 1, true],
    async ({ open, events, initialDepth }) => {
      const first = await open("alpha");
      events.length = 0;
      const second = await open("beta", "redirectTo");
      return [
        events.filter((event) => event === "alpha.unload").length,
        events.filter((event) => event === "beta.load").length,
        getCurrentPages().length - initialDepth,
        second !== first,
      ];
    },
  );
  await isolated(
    "lifecycle.query-encoded-values",
    ["citrus%20peel", "%2B", "%252F"],
    async ({ open }) => {
      const page = await open(
        "alpha",
        "navigateTo",
        "&value=citrus%20peel&symbol=%2B&encoded=%252F",
      );
      return [page.suiteOptions.value, page.suiteOptions.symbol, page.suiteOptions.encoded];
    },
  );
  await isolated(
    "lifecycle.same-route-new-instance",
    [true, 0, 2],
    async ({ open, initialDepth }) => {
      const first = await open("alpha");
      await update(first, { counter: 5 });
      const second = await open("beta");
      return [first !== second, second.data.counter, getCurrentPages().length - initialDepth];
    },
  );
  await isolated(
    "lifecycle.failed-navigation-preserves-page",
    [["fail", "complete"], true, []],
    async ({ open, events }) => {
      const first = await open("alpha");
      events.length = 0;
      const callbacks = await new Promise((resolve) => {
        const seen = [];
        wx.navigateTo({
          url: "/pages/not-declared/index",
          success() {
            seen.push("success");
          },
          fail() {
            seen.push("fail");
          },
          complete() {
            seen.push("complete");
            resolve(seen);
          },
        });
      });
      return [callbacks, getCurrentPages().slice(-1)[0] === first, events];
    },
  );
  await isolated("lifecycle.reopen-creates-fresh-page", [true, 0], async ({ open, back }) => {
    const anchor = await open("alpha");
    const previous = await open("beta");
    await update(previous, { counter: 8 });
    await back("alpha");
    const next = await open("beta");
    return [previous !== next && anchor === getCurrentPages().slice(-2)[0], next.data.counter];
  });
}
module.exports = { lifecycleContract };
