const { query, update } = require("./support");

async function framework(page, check) {
  const state = () => page.selectComponent("#state");
  const value = async (selector) => (await query(page, selector, { dataset: true })).dataset.value;
  const values = async (selector) =>
    (await query(page, selector, { dataset: true }, true)).map((node) => node.dataset.value);
  await check("app.instance", true, () => {
    const app = getApp();
    app.suiteToken = {};
    const same = getApp().suiteToken === app.suiteToken;
    delete app.suiteToken;
    return same;
  });
  await check("page.initial-route", ["pages/suite/index"], () =>
    getCurrentPages().map((item) => item.route),
  );
  await check("page.data-path-update", ["fresh", 2], async () => {
    const original = page.data.recipe.notes[0];
    try {
      await update(page, { "recipe.notes[0]": "fresh" });
      return [page.data.recipe.notes[0], page.data.recipe.notes.length];
    } finally {
      await update(page, { "recipe.notes[0]": original });
    }
  });
  await check("page.callback-after-render", "baked", async () => {
    const original = page.data.title;
    try {
      await update(page, { title: "baked" });
      return await value("#stamp");
    } finally {
      await update(page, { title: original });
    }
  });
  await check("component.defaults", ["plain", 0, false], () => {
    const props = state().properties;
    return [props.flavor, props.amount, props.enabled];
  });
  await check("component.lifetime-order", ["created", "attached", "ready"], () =>
    state().visits.slice(),
  );
  await check("behavior.inherited-method", "rye/plain", () => state().recipe());
  await check("behavior.membership", true, () => state().inheritsRecipe());
  await check("observer.multi-field", [[3, 7]], async () => {
    const child = state();
    child.samples = [];
    await update(child, { left: 3, right: 7 });
    return child.samples;
  });
  await check("observer.deep-path", [[1, 9]], async () => {
    const child = state();
    child.batches = [];
    await update(child, { "batch.items[1]": 9 });
    return child.batches;
  });
  await check("component.select-all", 2, () => page.selectAllComponents(".state-instance").length);
  await check("component.scope-boundary", null, () => query(page, "#inside", { id: true }));
  await check(
    "component.scoped-query",
    "plain",
    async () => (await query(state(), "#inside", { dataset: true })).dataset.flavor,
  );
  await check("component.parent-property", "rye/salty", async () => {
    const original = page.data.seasoning;
    try {
      await update(page, { seasoning: "salty" });
      return page.selectComponent("#bound").recipe();
    } finally {
      await update(page, { seasoning: original });
    }
  });
  await check("query.no-match", [], () => query(page, ".absent", { id: true }, true));
  await check("query.rect", [64, 16], async () => {
    const rect = await query(page, "#measure", { size: true });
    return [rect.width, rect.height];
  });
  await check("query.typed-dataset", [2, true, "02"], async () => {
    const data = (await query(page, "#measure", { dataset: true })).dataset;
    return [data.amount, data.enabled, data.code];
  });
  await check(
    "query.batch-order",
    ["measure", null, "stamp"],
    () =>
      new Promise((resolve) => {
        const batch = page.createSelectorQuery();
        for (const id of ["measure", "missing", "stamp"])
          batch.select("#" + id).fields({ id: true });
        batch.exec((rows) => resolve(rows.map((row) => row && row.id)));
      }),
  );
  await check("wxml.list-index", ["0:pear", "1:plum"], () => values(".fruit"));
  await check("wxml.list-reorder", ["0:plum", "1:pear", "2:lime"], async () => {
    const original = page.data.fruit.slice();
    try {
      await update(page, { fruit: ["plum", "pear", "lime"] });
      return await values(".fruit");
    } finally {
      await update(page, { fruit: original });
    }
  });
  await check("wxml.conditional", ["cold", "hot"], async () => {
    const original = page.data.hot;
    try {
      const cold = await value("#temperature");
      await update(page, { hot: true });
      return [cold, await value("#temperature")];
    } finally {
      await update(page, { hot: original });
    }
  });
  await check("wxml.template-import", ["citrus"], () => values(".tag"));
  await check("wxml.include-scope", "peel", async () => {
    const original = page.data.title;
    try {
      await update(page, { title: "peel" });
      return await value("#stamp");
    } finally {
      await update(page, { title: original });
    }
  });
  await check("wxs.module-call", "[zest]", () => value("#formatted"));
  await check("component.detach", "detached", async () => {
    const previous = state();
    try {
      await update(page, { mounted: false });
      return previous.visits[previous.visits.length - 1];
    } finally {
      await update(page, { mounted: true });
    }
  });
}
module.exports = { framework };
