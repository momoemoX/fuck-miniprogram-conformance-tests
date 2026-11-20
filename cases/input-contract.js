const { update, query } = require("./support");

// Real native input controls driven through public bindings and the focus attribute.
// Events arrive after the render pass, so cases wait on the page's own trace promise.
async function inputContract(page, check) {
  // Focus events carry {value, height}. Moving the focus attribute from the first
  // input to the second delivers a second focus event. The 3.7.12 simulator
  // reports no blur for an attribute-driven focus move, so blur delivery is left
  // to a device run (see COVERAGE.md) instead of being asserted here.
  await check(
    "input.focus-events",
    [
      ["focus", true, true],
      ["focus", true, true],
    ],
    async () => {
      page.inputTrace = [];
      try {
        const first = page.waitForInputTrace(1);
        await update(page, { focusValue: "ready", focusA: true });
        await first;
        const second = page.waitForInputTrace(2);
        await update(page, { focusA: false, focusB: true });
        await second;
        return page.inputTrace.filter((entry) => entry[0] === "focus").slice(0, 2);
      } finally {
        await update(page, { focusValue: "", focusA: false, focusB: false });
      }
    },
  );

  await check("input.value-binding-sync", ["fresh", "fresh"], async () => {
    const original = page.data.boundInput;
    try {
      await update(page, { boundInput: "fresh" });
      const node = await query(page, "#bound-input", { properties: ["value"] });
      return [node.value, page.data.boundInput];
    } finally {
      await update(page, { boundInput: original });
    }
  });
}
module.exports = { inputContract };
