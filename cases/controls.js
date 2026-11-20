const { update, query } = require("./support");

async function controls(page, check) {
  // Each native node receives a bound public property. Read it after two distinct updates.
  for (const [tag, property, values] of [
    ["button", "disabled", [false, true]],
    ["switch", "checked", [false, true]],
    ["slider", "value", [21, 64]],
    ["progress", "percent", [16, 72]],
    ["checkbox", "checked", [true, false]],
    ["radio", "checked", [false, true]],
    ["input", "maxlength", [7, 14]],
    ["textarea", "maxlength", [11, 18]],
    ["picker", "value", [0, 1]],
    ["text", "selectable", [false, true]],
    ["image", "mode", ["aspectFit", "center"]],
    ["swiper", "duration", [180, 400]],
  ]) {
    await check("native." + tag + "-" + property, values, async () => {
      const original = page.data.control[tag];
      const actual = [];
      try {
        for (const value of values) {
          await update(page, { ["control." + tag]: value });
          const node = await query(page, "#native-" + tag, { properties: [property] });
          actual.push(node[property]);
        }
        return actual;
      } finally {
        await update(page, { ["control." + tag]: original });
      }
    });
  }
  await check("css.rpx-viewport", true, async () => {
    const width = (await query(page, "#rpx-ruler", { size: true })).width;
    return Math.abs(width - wx.getWindowInfo().windowWidth / 2) <= 1;
  });
  await check("css.descendant-rule", [19, 23], async () => {
    const node = await query(page, "#child-rule", { size: true });
    return [node.width, node.height];
  });
  await check("setdata.render-snapshot", [8, 3], async () => {
    const original = { value: page.data.submitted.value };
    try {
      const item = { value: 3 };
      const finished = update(page, { submitted: item });
      item.value = 8;
      await finished;
      const node = await query(page, "#submitted", { dataset: true });
      return [page.data.submitted.value, node.dataset.value];
    } finally {
      await update(page, { submitted: original });
    }
  });
  await check("render.conditional-remount", [true, null, true], async () => {
    try {
      await update(page, { branch: true });
      const before = await query(page, "#branch", { id: true });
      await update(page, { branch: false });
      const hidden = await query(page, "#branch", { id: true });
      await update(page, { branch: true });
      return [
        before.id === "branch",
        hidden,
        (await query(page, "#branch", { id: true })).id === "branch",
      ];
    } finally {
      await update(page, { branch: true });
    }
  });
}
module.exports = { controls };
