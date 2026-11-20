const { update, query } = require("./support");

// Simple two-way binding (`model:prop="{{field}}"`).
async function modelContract(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, {
          modelText: "seed",
          modelCount: 5,
          modelFlag: true,
          modelInput: "init",
          modelMounted: true,
        });
        return await exercise(
          page.selectComponent("#model-probe"),
          page.selectComponent("#model-probe-peer"),
        );
      } finally {
        await update(page, {
          modelMounted: false,
          modelText: "seed",
          modelCount: 5,
          modelFlag: true,
          modelInput: "init",
        });
      }
    });
  }

  await isolated("model.parent-update-flows-to-child", ["from-parent", "from-parent"], async (child) => {
    await update(page, { modelText: "from-parent" });
    const node = await query(child, "#model-view", { dataset: true });
    return [child.properties.value, node.dataset.value];
  });

  await isolated("model.child-setdata-updates-parent", ["from-child", "from-child"], async (child) => {
    await child.writeValue("from-child");
    const mirror = await query(page, "#model-parent-mirror", { dataset: true });
    return [page.data.modelText, mirror.dataset.value];
  });

  await isolated("model.numeric-property-roundtrip", [42, "number", 42], async (child) => {
    await child.writeCount(42);
    const mirror = await query(page, "#model-parent-mirror", { dataset: true });
    return [page.data.modelCount, typeof page.data.modelCount, mirror.dataset.count];
  });

  await isolated(
    "model.child-write-triggers-observers",
    ["synced", true],
    async (child) => {
      child.observedValues = [];
      await child.writeValue("synced");
      return [page.data.modelText, child.observedValues.includes("synced")];
    },
  );

  await isolated(
    "model.two-children-share-parent-field",
    ["shared-next", "shared-next", "shared-next"],
    async (first, second) => {
      await first.writeValue("shared-next");
      const secondDom = await query(second, "#model-view", { dataset: true });
      return [page.data.modelText, second.properties.value, secondDom.dataset.value];
    },
  );

  await isolated(
    "model.falsy-boolean-and-empty-string",
    [false, "boolean", "", "string"],
    async (child) => {
      await child.writeFlag(false);
      await child.writeValue("");
      return [
        page.data.modelFlag,
        typeof page.data.modelFlag,
        page.data.modelText,
        typeof page.data.modelText,
      ];
    },
  );

  await isolated("model.native-input-binding-sync", ["hello", ""], async () => {
    await update(page, { modelInput: "hello" });
    const first = (await query(page, "#model-native-input", { properties: ["value"] })).value;
    await update(page, { modelInput: "" });
    const second = (await query(page, "#model-native-input", { properties: ["value"] })).value;
    return [first, second];
  });
}

module.exports = { modelContract };
