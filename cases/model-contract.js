const { update, query } = require("./support");

// Simple two-way binding (`model:prop="{{field}}"`).
async function modelContract(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, { modelText: "seed", modelCount: 5, modelMounted: true });
        return await exercise(page.selectComponent("#model-probe"));
      } finally {
        await update(page, { modelMounted: false, modelText: "seed", modelCount: 5 });
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
}

module.exports = { modelContract };
