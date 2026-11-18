const { update, query } = require("./support");

// Real native input controls driven through public bindings and the focus attribute.
// Events arrive after the render pass, so cases wait on the page's own trace promise.
async function inputContract(page, check) {
  // Observed on the 3.7.0 host: moving focus to another input delivers the new
  // input's focus event before the old input's blur, and the blur detail carries
  // no height (only the focus detail does).
  await check(
    "input.focus-and-blur-events",
    [
      ["focus", true, true],
      ["focus", true, true],
      ["blur", false, true],
    ],
    async () => {
      page.inputTrace = [];
      const settled = page.waitForInputTrace(3);
      await update(page, { focusValue: "ready", focusA: true });
      await update(page, { focusA: false, focusB: true });
      await settled;
      const trace = page.inputTrace.slice();
      await update(page, { focusA: false, focusB: false });
      return trace;
    },
  );

  await check("input.value-binding-sync", ["fresh", "fresh"], async () => {
    await update(page, { boundInput: "fresh" });
    const node = await query(page, "#bound-input", { properties: ["value"] });
    return [node.value, page.data.boundInput];
  });
}
module.exports = { inputContract };
