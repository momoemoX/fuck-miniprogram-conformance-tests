const { update } = require("./support");

// Advanced WXML event bindings: `mark:` propagation/merging and `mut-bind:` mutual exclusion.
async function eventAdvanced(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      const app = getApp();
      app.advEventTrace = [];
      try {
        await update(page, { eventAdvMounted: true });
        return await exercise(page.selectComponent("#adv-host"));
      } finally {
        await update(page, { eventAdvMounted: false });
        delete app.advEventTrace;
      }
    });
  }

  await isolated(
    "event.mark-merges-and-overrides",
    { outer: "page", mid: "mid", host: "host", shared: "host" },
    (host) => {
      host.fireHost({ bubbles: true });
      const outer = getApp().advEventTrace.find((entry) => entry.at === "bind-outer");
      return outer ? outer.mark : null;
    },
  );

  // Marks are scoped to the component shadow tree: marks inside a custom component
  // are visible to listeners inside that component, while composed events reaching
  // the outer page tree carry only marks from the outer tree.
  await isolated(
    "event.mark-isolated-at-component-boundary",
    [
      { inner: "in", leaf: "leaf", shared: "leaf" },
      { outer: "page", mid: "mid", host: "host", shared: "host" },
    ],
    (host) => {
      host.fireLeaf({ bubbles: true, composed: true });
      const trace = getApp().advEventTrace;
      const inside = trace.find((entry) => entry.at === "inside");
      const outer = trace.find((entry) => entry.at === "bind-outer");
      return [inside ? inside.mark : null, outer ? outer.mark : null];
    },
  );

  await isolated("event.mut-bind-stops-same-kind", ["mut-mid"], (host) => {
    host.fireHost({ bubbles: true });
    return getApp()
      .advEventTrace.map((entry) => entry.at)
      .filter((at) => at.startsWith("mut-"));
  });

  await isolated("event.mut-bind-allows-regular-bind", ["bind-host", "mut-mid", "bind-outer"], (host) => {
    host.fireHost({ bubbles: true });
    return getApp().advEventTrace.map((entry) => entry.at);
  });
}

module.exports = { eventAdvanced };
