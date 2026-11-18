const { update } = require("./support");
const { isolatedNavigation } = require("./route-harness");

async function lifecycleContract(check) {
  async function isolated(id, expected, exercise) {
    await isolatedNavigation(check, id, expected, async (harness) => {
      // Cleanup can emit more lifecycle events, so retain a snapshot of the observation.
      return JSON.parse(JSON.stringify(await exercise(harness)));
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
