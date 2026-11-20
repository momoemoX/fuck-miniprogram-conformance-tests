const { update, waitUntil, delay } = require("./support");

// The watched node is absolutely positioned so moving its top between 1500px
// (below the fold) and 10px (in view) toggles its intersection with the viewport.
async function observerContract(page, check) {
  await check("observer.intersection-toggle", [1, 0, 0], async () => {
    const events = [];
    let timer;
    const waitForEvent = (count, ms = 3000) => {
      let poll;
      return new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Intersection event was not delivered")), ms);
        poll = setInterval(() => {
          if (events.length >= count) {
            clearInterval(poll);
            clearTimeout(timer);
            resolve();
          }
        }, 40);
      }).finally(() => clearInterval(poll));
    };

    const observer = page.createIntersectionObserver();
    observer.relativeToViewport().observe("#watched", (result) =>
      events.push(result.intersectionRatio),
    );
    try {
      await update(page, { watchedTop: "10px" });
      await waitForEvent(1);
      const visible = events[events.length - 1];
      await update(page, { watchedTop: "1500px" });
      await waitForEvent(2);
      const hidden = events[events.length - 1];
      observer.disconnect();
      const before = events.length;
      await update(page, { watchedTop: "10px" });
      // Negative window: a disconnected observer must stay silent.
      await new Promise((resolve) => setTimeout(resolve, 500));
      return [Math.round(visible), Math.round(hidden), events.length - before];
    } finally {
      clearTimeout(timer);
      observer.disconnect();
      await update(page, { watchedTop: "1500px" });
    }
  });

  await relativeToContract(page, check);
  await observerOptions(page, check);
}

// #io-root is a fixed 100x100 box at x=200..300 and #io-target a fixed 20x20 box whose
// left edge is ioTargetLeft. Every position used here keeps the target inside the
// viewport, so only the reference node decides whether the target intersects.
const OUTSIDE = 20; // x=20..40, clear of the root
const INSIDE = 240; // x=240..260, fully inside the root
const QUARTER = 185; // x=185..205, 5/20 overlaps the root
const THREE_QUARTERS = 195; // x=195..215, 15/20 overlaps the root
const NEAR_LEFT = 178; // x=178..198, 2px left of the root

const round2 = (ratio) => Math.round(ratio * 100) / 100;

async function withIntersectionFixture(page, run) {
  const observers = [];
  try {
    await update(page, { ioMounted: true, ioTargetLeft: OUTSIDE });
    return await run((options) => {
      const observer = page.createIntersectionObserver(options);
      observers.push(observer);
      return observer;
    });
  } finally {
    observers.forEach((observer) => observer.disconnect());
    await update(page, { ioMounted: false, ioTargetLeft: OUTSIDE });
  }
}

async function observerOptions(page, check) {
  // initialRatio is the ratio the observer assumes before its first measurement: a
  // target that is already outside the root reports once when the assumed ratio is 1.
  await check("observer.initial-ratio", [[0], []], () =>
    withIntersectionFixture(page, async (create) => {
      const primed = [];
      const plain = [];
      create({ initialRatio: 1 })
        .relativeTo("#io-root")
        .observe("#io-target", (result) => primed.push(round2(result.intersectionRatio)));
      create()
        .relativeTo("#io-root")
        .observe("#io-target", (result) => plain.push(round2(result.intersectionRatio)));
      await waitUntil(() => primed.length >= 1);
      // Negative window for the default observer.
      await delay(400);
      return [primed, plain];
    }),
  );

  // observeAll watches every node the selector matches; without it only the first.
  await check("observer.observe-all", { all: ["io-m1", "io-m2", "io-m3"], single: ["io-m1"] }, async () => {
    const observers = [];
    try {
      await update(page, { ioMultiMounted: true });
      const all = [];
      const single = [];
      const every = page.createIntersectionObserver({ observeAll: true });
      observers.push(every);
      every.relativeTo("#io-multi-root").observe(".io-multi", (result) => all.push(result.id));
      const first = page.createIntersectionObserver();
      observers.push(first);
      first.relativeTo("#io-multi-root").observe(".io-multi", (result) => single.push(result.id));
      await waitUntil(() => all.length >= 3 && single.length >= 1);
      await delay(300);
      return { all: all.slice().sort(), single };
    } finally {
      observers.forEach((observer) => observer.disconnect());
      await update(page, { ioMultiMounted: false });
    }
  });
}

async function relativeToContract(page, check) {
  await check("observer.relative-to-selector", [[1, 0], 100, 100], () =>
    withIntersectionFixture(page, async (create) => {
      const events = [];
      create()
        .relativeTo("#io-root")
        .observe("#io-target", (result) => events.push(result));
      await update(page, { ioTargetLeft: INSIDE });
      await waitUntil(() => events.length >= 1);
      await update(page, { ioTargetLeft: OUTSIDE });
      await waitUntil(() => events.length >= 2);
      const rect = (events[0] || {}).relativeRect || {};
      return [events.map((event) => round2(event.intersectionRatio)), rect.right - rect.left, rect.bottom - rect.top];
    }),
  );

  // A left margin of 30px grows the root to x=170..300, so a target sitting just left of
  // the unmargined root becomes fully intersecting.
  await check("observer.relative-to-margins", [[], [1]], () =>
    withIntersectionFixture(page, async (create) => {
      const plain = [];
      const margined = [];
      create()
        .relativeTo("#io-root")
        .observe("#io-target", (result) => plain.push(round2(result.intersectionRatio)));
      create()
        .relativeTo("#io-root", { left: 30 })
        .observe("#io-target", (result) => margined.push(round2(result.intersectionRatio)));
      await update(page, { ioTargetLeft: NEAR_LEFT });
      await waitUntil(() => margined.length >= 1);
      // Negative window for the unmargined observer, which must not report an intersection.
      await delay(400);
      return [plain, margined];
    }),
  );

  // With thresholds [0.5] the callback fires only when the ratio crosses 0.5; the
  // default-threshold observer on the same moves documents the contrast.
  await check(
    "observer.custom-thresholds",
    { custom: [0.75, 0.25], fallback: [0.25, 0] },
    () =>
      withIntersectionFixture(page, async (create) => {
        const custom = [];
        const fallback = [];
        create({ thresholds: [0.5] })
          .relativeTo("#io-root")
          .observe("#io-target", (result) => custom.push(round2(result.intersectionRatio)));
        create()
          .relativeTo("#io-root")
          .observe("#io-target", (result) => fallback.push(round2(result.intersectionRatio)));
        const step = async (left) => {
          await update(page, { ioTargetLeft: left });
          await delay(400);
        };
        await step(QUARTER);
        await step(THREE_QUARTERS);
        await step(INSIDE);
        await step(QUARTER);
        await step(OUTSIDE);
        return { custom, fallback };
      }),
  );
}
module.exports = { observerContract };
