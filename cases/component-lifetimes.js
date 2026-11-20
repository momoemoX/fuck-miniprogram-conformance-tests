const { update, waitUntil, delay, call, settled } = require("./support");
const { isolatedNavigation } = require("./route-harness");

const keyedItems = (keys) => keys.map((key) => ({ key }));

async function componentLifetimes(page, check) {
  const app = getApp();

  // lifetimes.moved: only items inside wx:for may be moved when the list reorders.
  await check("component.moved-on-list-reorder", ["keyed:c:moved"], async () => {
    app.moveTrace = [];
    try {
      const initial = keyedItems(["a", "b", "c"]);
      await update(page, { moveMounted: true, moveKeyed: initial, movePositional: initial });
      app.moveTrace.length = 0;
      const reordered = keyedItems(["c", "a", "b"]);
      await update(page, { moveKeyed: reordered, movePositional: reordered });
      await delay(200);
      return app.moveTrace.slice().sort();
    } finally {
      await update(page, { moveMounted: false, moveKeyed: [], movePositional: [] });
      delete app.moveTrace;
    }
  });

  // The lifetimes documentation lists beforeDetach before detached; 3.7.12 with the
  // default component framework only delivers detached (tagged quirk).
  await check("component.before-detach-order", ["keyed:x:detached"], async () => {
    app.moveTrace = [];
    try {
      await update(page, { moveMounted: true, moveKeyed: keyedItems(["x"]), movePositional: [] });
      app.moveTrace.length = 0;
      await update(page, { moveMounted: false, moveKeyed: [] });
      await delay(100);
      return app.moveTrace.slice();
    } finally {
      await update(page, { moveMounted: false, moveKeyed: [], movePositional: [] });
      delete app.moveTrace;
    }
  });

  // wx.setPageOrientation resizes the page: the component's pageLifetimes.resize runs
  // before the page's onResize, once per orientation change.
  await check(
    "component.page-lifetimes-resize",
    [
      ["suite", "resize", "landscape"],
      ["suite-page", "onResize", "landscape"],
      ["suite", "resize", "portrait"],
      ["suite-page", "onResize", "portrait"],
    ],
    async () => {
      app.pageEventTrace = [];
      let rotated = false;
      try {
        await update(page, { pageEventMounted: true });
        await call(wx, "setPageOrientation", { orientation: "landscape" });
        rotated = true;
        await waitUntil(() => app.pageEventTrace.length >= 2);
        await call(wx, "setPageOrientation", { orientation: "portrait" });
        rotated = false;
        await waitUntil(() => app.pageEventTrace.length >= 4);
        return await settled(() => app.pageEventTrace);
      } finally {
        if (rotated) {
          await call(wx, "setPageOrientation", { orientation: "portrait" }).catch(() => null);
          await delay(500);
        }
        await update(page, { pageEventMounted: false });
        delete app.pageEventTrace;
      }
    },
  );

  // routeDone reaches components of the pushed page after its onReady, and components
  // of the page shown again after navigateBack.
  const routeEvents = () => app.pageEventTrace.filter((entry) => entry[1] !== "resize" && entry[1] !== "onResize");
  await isolatedNavigation(
    check,
    "component.page-lifetimes-route-done",
    [
      [
        ["route-done-page", "load"],
        ["route-done-page", "ready"],
        ["pushed", "routeDone"],
      ],
      [["suite", "routeDone"]],
    ],
    async (harness) => {
      app.pageEventTrace = [];
      try {
        await update(page, { pageEventMounted: true });
        await harness.navigate("navigateTo", { url: "/pages/route-done/index" }, "pages/route-done/index");
        await waitUntil(() => app.pageEventTrace.some((entry) => entry[0] === "pushed" && entry[1] === "routeDone"));
        await delay(200);
        const pushed = routeEvents();
        app.pageEventTrace.length = 0;
        await harness.navigate("navigateBack", { delta: 1 }, "pages/suite/index");
        await waitUntil(() => app.pageEventTrace.some((entry) => entry[1] === "routeDone"), { timeout: 2000 });
        await delay(200);
        return [pushed, routeEvents()];
      } finally {
        await update(page, { pageEventMounted: false });
        delete app.pageEventTrace;
      }
    },
  );

  // groupSetData runs its callback synchronously and every grouped setData still reaches
  // the view in order: the WXS change:prop observer sees 3 then 4, as for two ungrouped
  // calls. Whether an intermediate frame is painted is not observable from either thread.
  await check("component.group-set-data-applies-each-update", { separate: [1, 2], grouped: [3, 4], data: 4 }, async () => {
    try {
      await update(page, { groupMounted: true });
      const probe = page.selectComponent("#group-probe");
      await waitUntil(() => (probe.seen || []).length >= 1, { timeout: 1000 });
      probe.takeSeen();
      probe.separate(1, 2);
      await waitUntil(() => (probe.seen || []).indexOf(2) !== -1);
      await delay(200);
      const separate = probe.takeSeen();
      probe.grouped(3, 4);
      await waitUntil(() => (probe.seen || []).indexOf(4) !== -1);
      await delay(200);
      return { separate, grouped: probe.takeSeen(), data: probe.data.value };
    } finally {
      await update(page, { groupMounted: false });
    }
  });
}

module.exports = { componentLifetimes };
