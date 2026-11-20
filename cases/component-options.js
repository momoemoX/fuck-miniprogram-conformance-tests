const { update, query } = require("./support");

// Component options: virtualHost, addGlobalClass, styleIsolation modes, and ancestor/descendant relations.
async function componentOptions(page, check) {
  async function withOptions(id, expected, patch, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, patch);
        return await exercise();
      } finally {
        const reset = {};
        for (const key of Object.keys(patch)) {
          if (typeof patch[key] === "boolean") reset[key] = false;
          else if (key === "treeOrder") reset[key] = ["first", "second"];
          else reset[key] = patch[key];
        }
        await update(page, reset);
      }
    });
  }

  await withOptions(
    "component-options.virtual-host-layout",
    [true, false, true, true],
    { virtualHostMounted: true },
    async () => {
      const normal = page.selectComponent("#normal-host");
      const virtual = page.selectComponent("#virtual-host");
      const nRects = await query(normal, ".vh-item", { rect: true }, true);
      const vRects = await query(virtual, ".vh-item", { rect: true }, true);
      const normalStacked = nRects[1].top > nRects[0].top && Math.abs(nRects[1].left - nRects[0].left) <= 1;
      const normalHorizontal = Math.abs(nRects[1].top - nRects[0].top) <= 1 && nRects[1].left > nRects[0].left;
      const virtualSameRow = Math.abs(vRects[1].top - vRects[0].top) <= 1;
      const virtualAdjacent = Math.abs(vRects[1].left - vRects[0].left - 40) <= 1;
      return [normalStacked, normalHorizontal, virtualSameRow, virtualAdjacent];
    },
  );

  await withOptions(
    "component-options.virtual-host-selector-and-methods",
    ["virtual-host-instance", 2],
    { virtualHostMounted: true },
    async () => {
      const virtual = page.selectComponent("#virtual-host");
      const items = await query(virtual, ".vh-item", { size: true }, true);
      return [virtual.who(), items.length];
    },
  );

  await withOptions(
    "component-options.add-global-class",
    [53, 61],
    { globalClassMounted: true },
    async () => {
      const comp = page.selectComponent("#global-class-probe");
      const appWidth = (await query(comp, "#gc-app", { size: true })).width;
      const pageWidth = (await query(comp, "#gc-page", { size: true })).width;
      return [appWidth, pageWidth];
    },
  );

  await withOptions(
    "component-options.style-shared",
    [61, 67],
    { styleSharedMounted: true },
    async () => {
      const comp = page.selectComponent("#style-shared-probe");
      const insideWidth = (await query(comp, "#sh-page", { size: true })).width;
      const leakedWidth = (await query(page, "#shared-leak-target", { size: true })).width;
      return [insideWidth, leakedWidth];
    },
  );

  await withOptions(
    "component-options.style-page-apply-shared",
    [61, 13],
    { stylePageApplyMounted: true },
    async () => {
      const comp = page.selectComponent("#style-pas-probe");
      const insideWidth = (await query(comp, "#pas-page", { size: true })).width;
      const pageTargetWidth = (await query(page, "#pas-leak-target", { size: true })).width;
      return [insideWidth, pageTargetWidth];
    },
  );

  await withOptions(
    "component-options.style-page-shared",
    [61, 73],
    { stylePageSharedMounted: true },
    async () => {
      const comp = page.selectComponent("#style-ps-probe");
      const insideWidth = (await query(comp, "#ps-page", { size: true })).width;
      const leakedWidth = (await query(page, "#ps-leak-target", { size: true })).width;
      return [insideWidth, leakedWidth];
    },
  );

  await withOptions(
    "component-options.style-isolated-blocks-global",
    [11, 11],
    { styleIsolatedMounted: true },
    async () => {
      const comp = page.selectComponent("#style-iso-probe");
      const appWidth = (await query(comp, "#iso-app", { size: true })).width;
      const pageWidth = (await query(comp, "#iso-page", { size: true })).width;
      return [appWidth, pageWidth];
    },
  );

  await withOptions(
    "component-options.relation-ancestor-descendant",
    [["first", "second"], [true, true]],
    { treeRelMounted: true, treeOrder: ["first", "second"] },
    () => {
      const root = page.selectComponent("#tree-root");
      const leaves = page.selectAllComponents(".tree-leaf");
      return [root.leafLabels(), leaves.map((leaf) => leaf.hasRoot())];
    },
  );

  await withOptions(
    "component-options.relation-link-changed",
    [["second", "first"], true],
    { treeRelMounted: true, treeOrder: ["first", "second"] },
    async () => {
      const root = page.selectComponent("#tree-root");
      root.events = [];
      await update(page, { treeOrder: ["second", "first"] });
      const hasLinkChanged = root.events.some((entry) => entry[0] === "linkChanged");
      return [root.leafLabels(), hasLinkChanged];
    },
  );

  await withOptions(
    "component-options.relation-behavior-target-lifecycle",
    [
      ["alpha", "beta"],
      ["alpha"],
      [["unlinked", "beta"]],
      ["alpha", "beta"],
      [["linked", "beta"]],
    ],
    { behRelMounted: true, behRelShowSecond: true },
    async () => {
      const root = page.selectComponent("#beh-tree-root");
      const initial = root.labels();
      root.events = [];
      await update(page, { behRelShowSecond: false });
      const afterRemove = root.labels();
      const unlinkEvents = root.events.slice();
      root.events = [];
      await update(page, { behRelShowSecond: true });
      const afterAdd = root.labels();
      const linkEvents = root.events.slice();
      return [initial, afterRemove, unlinkEvents, afterAdd, linkEvents];
    },
  );
}

module.exports = { componentOptions };
