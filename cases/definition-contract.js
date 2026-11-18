const { update, query } = require("./support");

async function definitionContract(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, {
          definitionInputs: {
            quantity: 0,
            text: "",
            flag: false,
            object: null,
            array: [],
            flexible: 0,
            free: null,
          },
          definitionMounted: true,
        });
        return await exercise(page.selectComponent("#definition"));
      } finally {
        await update(page, { definitionMounted: false });
      }
    });
  }
  async function assign(patch) {
    const value = Object.assign({}, page.data.definitionInputs, patch);
    await update(page, { definitionInputs: value });
  }
  await isolated(
    "definition.behavior-diamond-order",
    ["ancestry", "left", "right", "component"],
    (child) => child.getOrder(),
  );
  await isolated(
    "definition.behavior-diamond-merge",
    { ancestry: 1, left: 2, right: 3, own: 4 },
    (child) => child.data.blend,
  );
  await isolated("definition.behavior-array-override", ["own"], (child) => child.data.list.slice());
  await isolated("definition.filter-data", "inserted", (child) => child.data.filtered);
  await isolated("definition.filter-method", "inserted", (child) => child.filteredMethod());
  await isolated("property.number-from-string", [12, "number"], async (child) => {
    await assign({ quantity: "12" });
    return [child.data.quantity, typeof child.data.quantity];
  });
  await isolated("property.string-from-number", ["91", "string"], async (child) => {
    await assign({ text: 91 });
    return [child.data.text, typeof child.data.text];
  });
  await isolated("property.boolean-from-string", [true, "boolean"], async (child) => {
    await assign({ flag: "false" });
    return [child.data.flag, typeof child.data.flag];
  });
  await isolated("property.boolean-from-zero", false, async (child) => {
    await assign({ flag: 0 });
    return child.data.flag;
  });
  await isolated("property.optional-string", "flexible", async (child) => {
    await assign({ flexible: "flexible" });
    return child.data.flexible;
  });
  await isolated("property.optional-number", 17, async (child) => {
    await assign({ flexible: 17 });
    return child.data.flexible;
  });
  await isolated("property.any-object", { enabled: true }, async (child) => {
    await assign({ free: { enabled: true } });
    return child.data.free;
  });
  await isolated("property.any-false", false, async (child) => {
    await assign({ free: false });
    return child.data.free;
  });
  await isolated("property.any-array", [3, "x"], async (child) => {
    await assign({ free: [3, "x"] });
    return child.data.free;
  });
  await isolated("property.object-null", null, async (child) => {
    await assign({ object: { name: "set" } });
    await assign({ object: null });
    return child.data.object;
  });
  await isolated("property.array-replacement", [9], async (child) => {
    await assign({ array: [1, 2] });
    await assign({ array: [9] });
    return child.data.array;
  });
  await isolated("property.observer-derived", 14, async (child) => {
    await assign({ quantity: 7 });
    return child.data.derived;
  });
  await isolated("property.rendered-coercion", [12, "91", true], async (child) => {
    await assign({ quantity: "12", text: 91, flag: "false" });
    const node = await query(child, "#typed", { dataset: true });
    return [node.dataset.number, node.dataset.text, node.dataset.flag];
  });
  await isolated("export.public-object", [true, 3], () => {
    const value = page.selectComponent("#export-object");
    return [value.exported, value.read()];
  });
  await isolated("export.hidden-instance-data", false, () =>
    Object.prototype.hasOwnProperty.call(page.selectComponent("#export-object"), "data"),
  );
  await isolated("export.null-value", null, () => page.selectComponent("#export-null"));
  await isolated(
    "export.undefined-falls-back",
    3,
    () => page.selectComponent("#export-undefined").data.quantity,
  );
  await isolated("export.live-instance-state", 11, () => {
    const value = page.selectComponent("#export-object");
    value.write(11);
    return value.read();
  });
  await isolated("export.select-all", [true, 3], () => {
    const values = page.selectAllComponents(".public-export");
    return [values.length === 2, values.filter((value) => value && value.exported)[0].read()];
  });
}
module.exports = { definitionContract };
