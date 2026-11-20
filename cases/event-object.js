const { update, waitUntil, delay } = require("./support");
const { driverEnabled, drive, touchPoint } = require("./driver");

async function withEventFixture(page, run) {
  page.eventTrace = [];
  try {
    await update(page, { eventObjectMounted: true });
    return await run(page.eventTrace);
  } finally {
    delete page.eventTrace;
    await update(page, { eventObjectMounted: false });
  }
}

function describeTouchEvent(event) {
  const point = (event.changedTouches || [])[0] || {};
  return {
    type: event.type,
    touches: (event.touches || []).length,
    changedTouches: (event.changedTouches || []).length,
    pointKeys: Object.keys(point).sort(),
    pageX: typeof point.pageX === "number" ? Math.round(point.pageX) : null,
    targetId: event.target && event.target.id,
    role: event.currentTarget && event.currentTarget.dataset ? event.currentTarget.dataset.role : null,
    timeStamp: typeof event.timeStamp,
  };
}

async function eventObject(page, check) {
  // capture-catch: stops the event during the capture phase at the outermost node;
  // without a capture phase the same tree bubbles normally.
  await check(
    "event.capture-catch-stops-capture",
    [["capture-catch-outer"], ["bind-host", "bind-mid", "bind-outer"]],
    () =>
    withEventFixture(page, async (trace) => {
      const host = page.selectComponent("#cc-host");
      host.fireHost({ bubbles: true, capturePhase: true });
      const captured = trace.splice(0, trace.length);
      host.fireHost({ bubbles: true });
      return [captured, trace.slice()];
    }),
  );

  // The nearer mark:zone on the host overrides the outer one; custom events carry no touches.
  await check(
    "event.custom-event-object-fields",
    {
      type: "ping",
      timeStamp: ["number", true],
      target: ["eo-host", "host"],
      currentTarget: ["eo-outer", "outer"],
      mark: { zone: "host" },
      detail: { source: "host" },
      touches: "undefined",
      changedTouches: "undefined",
    },
    () =>
    withEventFixture(page, async (trace) => {
      page.selectComponent("#eo-host").fireHost({ bubbles: true });
      const event = trace[0];
      if (!event) return null;
      return {
        type: event.type,
        timeStamp: [typeof event.timeStamp, event.timeStamp > 0],
        target: [event.target.id, event.target.dataset.role],
        currentTarget: [event.currentTarget.id, event.currentTarget.dataset.role],
        mark: event.mark,
        detail: event.detail,
        touches: typeof event.touches,
        changedTouches: typeof event.changedTouches,
      };
    }),
  );

  if (!driverEnabled()) return;

  const touchRow = (type, touches, pageX) => ({
    type,
    touches,
    changedTouches: 1,
    pointKeys: ["clientX", "clientY", "force", "identifier", "pageX", "pageY"],
    pageX,
    targetId: "touch-box",
    role: "touch",
    timeStamp: "number",
  });
  await check(
    "event.touch-object-fields",
    [[touchRow("touchstart", 1, 12), touchRow("touchmove", 1, 24), touchRow("touchend", 0, 24)], true],
    () =>
    withEventFixture(page, async (trace) => {
      await drive("#touch-box", "touchstart", { touches: [touchPoint(12, 10)], changedTouches: [touchPoint(12, 10)] });
      await drive("#touch-box", "touchmove", { touches: [touchPoint(24, 10)], changedTouches: [touchPoint(24, 10)] });
      await drive("#touch-box", "touchend", { touches: [], changedTouches: [touchPoint(24, 10)] });
      await waitUntil(() => trace.length >= 3);
      const stamps = trace.map((event) => event.timeStamp);
      return [trace.map(describeTouchEvent), stamps.every((stamp, i) => i === 0 || stamp >= stamps[i - 1])];
    }),
  );

  await check(
    "event.tap-and-longpress-sequence",
    [
      ["touchstart", "touchend", "tap"],
      ["touchstart", "longpress", "touchend"],
    ],
    () =>
    withEventFixture(page, async (trace) => {
      await drive("#touch-box", "tap");
      await waitUntil(() => trace.some((event) => event.type === "tap"));
      await delay(100);
      const tap = trace.splice(0, trace.length).map((event) => event.type);
      await drive("#touch-box", "longpress");
      await waitUntil(() => trace.some((event) => event.type === "longpress"));
      await delay(300);
      return [tap, trace.map((event) => event.type)];
    }),
  );
}

module.exports = { eventObject };
