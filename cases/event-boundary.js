const { update, query } = require("./support");

async function eventBoundary(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      const app = getApp();
      app.boundaryTrace = [];
      delete page.boundaryTargets;
      try {
        await update(page, { boundaryMounted: true });
        return await exercise(page.selectComponent("#shell"), page.selectComponent("#pure"));
      } finally {
        await update(page, { boundaryMounted: false });
        delete app.boundaryTrace;
        delete page.boundaryTargets;
      }
    });
  }
  const payload = { value: "leaf" };
  const fromInside = (options) => (shell) => {
    shell.emitInside(options, payload);
    return getApp().boundaryTrace.slice();
  };
  await isolated("event.boundary-default", [], fromInside({}));
  await isolated("event.boundary-bubbles", [["inside", "leaf"]], fromInside({ bubbles: true }));
  await isolated("event.boundary-composed-only", [], fromInside({ composed: true }));
  await isolated(
    "event.boundary-crossing",
    [
      ["inside", "leaf"],
      ["host", "leaf"],
      ["ancestor", "leaf"],
    ],
    fromInside({ bubbles: true, composed: true }),
  );
  await isolated("event.boundary-direct-host", [["host", "leaf"]], (shell) => {
    shell.fire({}, payload);
    return getApp().boundaryTrace.slice();
  });
  await isolated(
    "event.boundary-direct-bubble",
    [
      ["host", "leaf"],
      ["ancestor", "leaf"],
    ],
    (shell) => {
      shell.fire({ bubbles: true }, payload);
      return getApp().boundaryTrace.slice();
    },
  );
  await isolated("event.current-target", ["shell", "shell", "outer-boundary"], (shell) => {
    page.boundaryTargets = [];
    shell.fire({ bubbles: true }, payload);
    return page.boundaryTargets;
  });
  await isolated("pure.logic-field-update", 8, async (_, pure) => {
    await update(pure, { _counter: 8 });
    return pure.data._counter;
  });
  await isolated("pure.observer-fires", [8], async (_, pure) => {
    pure.changes = [];
    await update(pure, { _counter: 8 });
    return pure.changes;
  });
  await isolated("pure.render-field-excluded", true, async (_, pure) => {
    await update(pure, { _counter: 8 });
    const node = await query(pure, "#values", { dataset: true });
    return node.dataset.hidden !== 8 && node.dataset.hidden !== "8";
  });
  await isolated("pure.mixed-update", [9, 12], async (_, pure) => {
    await update(pure, { _counter: 9, visible: 12 });
    const node = await query(pure, "#values", { dataset: true });
    return [pure.data._counter, node.dataset.visible];
  });
}
module.exports = { eventBoundary };
