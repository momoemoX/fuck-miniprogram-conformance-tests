const { update, query } = require("./support");

async function rendering(page, check) {
  const field = async (id, name = "value") =>
    (await query(page, "#" + id, { dataset: true })).dataset[name];
  const order = async () =>
    (await query(page, ".cell", { dataset: true }, true)).map((item) => item.dataset.value);
  await check("render.object-iteration", ["a/2", "b/5"], async () =>
    (await query(page, ".pair", { dataset: true }, true)).map((item) => item.dataset.value).sort(),
  );
  await check("render.nested-scopes", ["a1", "a2", "b3"], order);
  await check("render.list-remove", ["b4"], async () => {
    await update(page, { groups: [{ label: "b", items: [4] }] });
    return order();
  });
  await check("render.interpolation-types", [4, true, "A/B"], async () => [
    await field("expression", "number"),
    await field("expression", "test"),
    await field("expression", "joined"),
  ]);
  await check("render.dynamic-template", ["first", "second"], async () => {
    const before = await field("dynamic");
    await update(page, { templateName: "beta" });
    return [before, await field("dynamic")];
  });
  await check("setdata.sibling-paths", [7, 8, "x"], async () => {
    await update(page, { "matrix[0].x": 7, "matrix[1].x": 8 });
    return [page.data.matrix[0].x, page.data.matrix[1].x, page.data.matrix[0].tag];
  });
  await check("setdata.empty-array", [], async () => {
    await update(page, { groups: [] });
    return order();
  });
  await check("wxs.inline-module", "ALPHA", () => field("inline"));
  await check(
    "slot.default-content",
    "projected",
    async () => (await query(page, "#projected", { dataset: true })).dataset.value,
  );
  await check("css.class-rule", [35, 14], async () => {
    const box = await query(page, "#styled", { size: true });
    return [box.width, box.height];
  });
  await check("css.dynamic-class", [49, 14], async () => {
    await update(page, { wide: true });
    const box = await query(page, "#styled", { size: true });
    return [box.width, box.height];
  });
  await check(
    "canvas.pixel-roundtrip",
    [255, 0, 0, 255],
    () =>
      new Promise((resolve, reject) => {
        const ctx = wx.createCanvasContext("swatch", page);
        ctx.setFillStyle("#ff0000");
        ctx.fillRect(0, 0, 8, 8);
        ctx.draw(false, () =>
          wx.canvasGetImageData(
            {
              canvasId: "swatch",
              x: 2,
              y: 2,
              width: 1,
              height: 1,
              success: (result) => resolve(Array.from(result.data)),
              fail: (error) => reject(new Error(error.errMsg)),
            },
            page,
          ),
        );
      }),
  );
}
module.exports = { rendering };
