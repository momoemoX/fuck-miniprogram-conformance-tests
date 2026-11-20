const { update } = require("./support");

// Advanced WXML event bindings: `mark:` propagation/merging and `mut-bind:` mutual exclusion.
async function eventAdvanced(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      const app = getApp();
      app.advEventTrace = [];
      try {
        await update(page, { advDynMark: "v1", eventAdvMounted: true });
        return await exercise(page.selectComponent("#adv-host"));
      } finally {
        await update(page, { eventAdvMounted: false, advDynMark: "v1" });
        delete app.advEventTrace;
      }
    });
  }

  await isolated(
    "event.mark-merges-and-overrides",
    { outer: "page", mid: "mid", host: "host", shared: "host", dyn: "v1" },
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
      { outer: "page", mid: "mid", host: "host", shared: "host", dyn: "v1" },
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

  await isolated("event.mark-dynamic-update", ["v1", "v2", ""], async (host) => {
    host.fireHost({ bubbles: true });
    const first = getApp().advEventTrace.find((entry) => entry.at === "bind-outer").mark.dyn;
    getApp().advEventTrace = [];
    await update(page, { advDynMark: "v2" });
    host.fireHost({ bubbles: true });
    const second = getApp().advEventTrace.find((entry) => entry.at === "bind-outer").mark.dyn;
    getApp().advEventTrace = [];
    await update(page, { advDynMark: "" });
    host.fireHost({ bubbles: true });
    const third = getApp().advEventTrace.find((entry) => entry.at === "bind-outer").mark.dyn;
    return [first, second, third];
  });

  await isolated("event.mark-distinct-from-dataset", ["host-ds", "outer-ds", "host"], (host) => {
    host.fireHost({ bubbles: true });
    const outer = getApp().advEventTrace.find((entry) => entry.at === "bind-outer");
    return [outer.targetDs, outer.currentDs, outer.mark.shared];
  });

  await isolated("event.mut-bind-and-catch-interaction", ["mut-inner", "catch-mid"], () => {
    page.selectComponent("#adv-catch-host").fireHost({ bubbles: true });
    return getApp().advEventTrace.map((entry) => entry.at);
  });

  await isolated(
    "event.capture-bind-and-mut-bind-order",
    ["cap-bind-outer", "bind-cap-host", "mut-cap-mid"],
    () => {
      page.selectComponent("#adv-cap-host").fireHost({ bubbles: true, capturePhase: true });
      return getApp().advEventTrace.map((entry) => entry.at);
    },
  );
}

module.exports = { eventAdvanced };
