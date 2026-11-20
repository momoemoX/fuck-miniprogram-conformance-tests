const { update, waitUntil, delay, settled } = require("./support");
const { driverEnabled, drive, touchPoint } = require("./driver");

async function withWxsEvents(page, run) {
  page.eventTrace = [];
  try {
    await update(page, { wxsEventMounted: true });
    return await run(page.eventTrace);
  } finally {
    delete page.eventTrace;
    await update(page, { wxsEventMounted: false, wxsScrollTop: 0 });
  }
}

async function transformOf(page, selector) {
  const fields = await new Promise((resolve) =>
    page.createSelectorQuery().select(selector).fields({ computedStyle: ["transform"] }, resolve).exec(),
  );
  return fields ? fields.transform : null;
}

// WXS functions bound as event handlers (bindxxx="{{module.fn}}") run in the view layer.
async function wxsEvents(page, check) {
  await check("wxs.event-responder-scroll", [true, ["wxs", { kind: "scroll", top: 60 }]], () =>
    withWxsEvents(page, async (trace) => {
      await update(page, { wxsScrollTop: 60 });
      await settled(() => trace);
      return [trace.every((entry) => entry[0] === "wxs" && entry[1].kind === "scroll"), trace.slice(-1)[0]];
    }),
  );

  if (!driverEnabled()) return;

  // The WXS handler moves the box with instance.setStyle (no setData); a handler that
  // returns nothing lets the touch bubble to the outer logic-layer handler.
  await check(
    "wxs.event-responder-touch-sets-style",
    [
      [
        ["wxs", { kind: "touchstart", x: 10 }],
        ["outer", "touchstart"],
        ["wxs", { kind: "touchmove", dx: 30 }],
      ],
      "matrix(1, 0, 0, 1, 30, 0)",
    ],
    () =>
    withWxsEvents(page, async (trace) => {
      await drive("#wxs-touch-box", "touchstart", {
        touches: [touchPoint(10, 10)],
        changedTouches: [touchPoint(10, 10)],
      });
      await drive("#wxs-touch-box", "touchmove", {
        touches: [touchPoint(40, 10)],
        changedTouches: [touchPoint(40, 10)],
      });
      await waitUntil(() => trace.filter((entry) => entry[0] === "wxs").length >= 2);
      await delay(100);
      return [trace.slice(), await transformOf(page, "#wxs-touch-box")];
    }),
  );

  await check("wxs.event-responder-return-false-stops-bubbling", [["wxs", { kind: "stop-inner" }]], () =>
    withWxsEvents(page, async (trace) => {
      await drive("#wxs-stop-box", "touchstart", {
        touches: [touchPoint(10, 10)],
        changedTouches: [touchPoint(10, 10)],
      });
      await waitUntil(() => trace.length >= 1);
      await delay(300);
      return trace.slice();
    }),
  );
}

module.exports = { wxsEvents };
