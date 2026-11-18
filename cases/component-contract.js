const { update, query } = require("./support");

async function componentContract(page, check) {
  // Remount for every case so mutations and observers from one case cannot affect another.
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, { contractMounted: true });
        const first = page.selectComponent("#contract-a");
        const second = page.selectComponent("#contract-b");
        return await exercise(first, second);
      } finally {
        await update(page, { contractMounted: false });
      }
    });
  }

  await isolated("contract.property-defaults", [0, "", false], (first) => [
    first.properties.count,
    first.properties.caption,
    first.properties.enabled,
  ]);
  await isolated("contract.array-default-isolation", [[4, 9], [4]], (first, second) => {
    first.data.list.push(9);
    return [first.data.list.slice(), second.data.list.slice()];
  });
  await isolated("contract.object-default-isolation", ["changed", "seed"], (first, second) => {
    first.data.options.label = "changed";
    return [first.data.options.label, second.data.options.label];
  });
  await isolated("contract.property-data-view", [7, 7], async (first) => {
    await update(first, { count: 7 });
    return [first.data.count, first.properties.count];
  });
  await isolated("contract.parent-bound-property", 23, async () => {
    await update(page, { contractCount: 23 });
    return page.selectComponent("#contract-bound").data.count;
  });
  await isolated(
    "contract.property-observer-values",
    [
      [6, 0],
      [8, 6],
    ],
    async (first) => {
      first.propertyChanges = [];
      await update(first, { watched: 6 });
      await update(first, { watched: 8 });
      return first.propertyChanges;
    },
  );
  await isolated("contract.observer-batch", [[5, 9]], async (first) => {
    first.pairs = [];
    await update(first, { a: 5, b: 9 });
    return first.pairs;
  });
  await isolated("contract.observer-same-value", [[1, 2]], async (first) => {
    first.pairs = [];
    await update(first, { a: 1 });
    return first.pairs;
  });
  await isolated("contract.observer-unrelated", [], async (first) => {
    first.pairs = [];
    await update(first, { caption: "unrelated" });
    return first.pairs;
  });
  await isolated("contract.observer-nested-update", [{ x: 8, y: 2 }], async (first) => {
    first.objects = [];
    await update(first, { "object.x": 8 });
    return first.objects;
  });
  await isolated("contract.observer-parent-replacement", [{ x: 3, y: 4 }], async (first) => {
    first.objects = [];
    await update(first, { object: { x: 3, y: 4 } });
    return first.objects;
  });
  await isolated("contract.observer-array-index", [6], async (first) => {
    first.firstItems = [];
    await update(first, { "rows[0]": 6 });
    return first.firstItems;
  });
  await isolated("contract.observer-array-replacement", [9], async (first) => {
    first.firstItems = [];
    await update(first, { rows: [9, 10] });
    return first.firstItems;
  });
  await isolated("contract.setdata-before-return", [12, 2], (first) => {
    first.setData({ a: 12 });
    return [first.data.a, first.data.b];
  });
  await isolated("contract.setdata-render-callback", [4, 7], async (first) => {
    await update(first, { a: 4, b: 7 });
    const node = await query(first, "#state", { dataset: true });
    return [node.dataset.a, node.dataset.b];
  });
  await isolated("contract.setdata-empty-callback", 1, async (first) => {
    let calls = 0;
    await new Promise((resolve) =>
      first.setData({}, () => {
        calls++;
        resolve();
      }),
    );
    return calls;
  });
  await isolated("contract.path-preserves-siblings", { x: 10, y: 2 }, async (first) => {
    await update(first, { "object.x": 10 });
    return { x: first.data.object.x, y: first.data.object.y };
  });
  await isolated("contract.array-preserves-other-index", [1, 11], async (first) => {
    await update(first, { "rows[1]": 11 });
    return first.data.rows.slice();
  });
  await isolated(
    "contract.behavior-data-merge",
    { base: true, nested: true, own: true, priority: "own" },
    (first) => first.data.settings,
  );
  await isolated("contract.behavior-method-priority", "own", (first) => first.label());
  await isolated("contract.behavior-inherited-method", "available", (first) => first.inherited());
  await isolated("contract.behavior-transitive-membership", true, (first) => first.inheritsBase());
  await isolated(
    "contract.behavior-lifetime-order",
    ["base-attached", "nested-attached", "own-attached"],
    (first) => first.sequence.slice(),
  );
  await isolated("contract.behavior-data-isolation", ["changed", "own"], (first, second) => {
    first.data.settings.priority = "changed";
    return [first.data.settings.priority, second.data.settings.priority];
  });
}
module.exports = { componentContract };
