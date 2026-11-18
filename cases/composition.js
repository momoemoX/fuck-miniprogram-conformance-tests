const { update, query } = require("./support");
const note = require("../fixtures/module-state");
const readCounter = require("../fixtures/module-consumer");

async function composition(page, check) {
  async function projectedWidth() {
    return (await query(page, "#projection", { size: true })).width;
  }
  await check("slot.named-projection", 60, projectedWidth);
  await check("slot.dynamic-name", 90, async () => {
    await update(page, { outlet: "tail" });
    return projectedWidth();
  });
  await check("module.shared-exports", [1, 2], () => {
    note.counter = 1;
    const first = readCounter();
    note.counter++;
    return [first, readCounter()];
  });
  await check("event.default-local", ["source"], () => {
    page.trace = [];
    page.selectComponent("#bubbling").triggerEvent("notice");
    return page.trace.slice();
  });
  await check("event.detail-payload", ["citrus", 2], () => {
    page.lastNotice = null;
    page.selectComponent("#bubbling").triggerEvent("payload", { flavor: "citrus", count: 2 });
    return [page.lastNotice.flavor, page.lastNotice.count];
  });
  await check(
    "event.capture-order",
    ["outer-capture", "middle-capture", "source", "middle", "outer"],
    () => {
      page.trace = [];
      page
        .selectComponent("#capture")
        .triggerEvent("notice", {}, { bubbles: true, capturePhase: true });
      return page.trace.slice();
    },
  );
  await check("query.native-properties", ["active-switch", true], async () => {
    const node = await query(page, "#active-switch", { id: true, properties: ["checked"] });
    return [node.id, node.checked];
  });
  await check("query.field-selection", [true, false], async () => {
    const node = await query(page, "#measure", { dataset: true });
    return [
      Object.prototype.hasOwnProperty.call(node, "dataset"),
      Object.prototype.hasOwnProperty.call(node, "width"),
    ];
  });
  await check("query.missing-component", true, () => page.selectComponent("#not-present") == null);
  await check("render.hidden-toggle", [0, 12], async () => {
    const height = async () => (await query(page, "#hideable", { size: true })).height;
    await update(page, { invisible: true });
    const hidden = await height();
    await update(page, { invisible: false });
    return [hidden, await height()];
  });
  await check(
    "observer.media-match",
    true,
    () =>
      new Promise((resolve, reject) => {
        const observer = page.createMediaQueryObserver();
        const deadline = setTimeout(() => {
          observer.disconnect();
          reject(new Error("No media query result"));
        }, 4000);
        observer.observe({ minWidth: 1 }, (value) => {
          clearTimeout(deadline);
          setTimeout(() => {
            observer.disconnect();
            resolve(value.matches);
          }, 0);
        });
      }),
  );
}
module.exports = { composition };
