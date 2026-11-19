const { update, settled } = require("./support");

// Real scroll-view interactions driven by public bindings. Scroll events arrive
// throttled, so cases read the last event once the stream has gone quiet.
async function scrollContract(page, check) {
  async function lastEvent(patch, timeout = 3000) {
    page.scrollEvents = [];
    await update(page, patch);
    const events = await settled(() => page.scrollEvents || [], { timeout });
    return events[events.length - 1] || null;
  }
  // A bound scroll-top only applies when its value changes, so step through 1
  // before returning to 0 even when the data already holds 0.
  async function reset() {
    await update(page, { scrollIntoTarget: "", scrollTopValue: 1 });
    await lastEvent({ scrollTopValue: 0 }, 1000);
  }

  await check("scroll.bindscroll-detail", [30, 220], async () => {
    try {
      const last = await lastEvent({ scrollTopValue: 30 });
      return [last ? last.top : null, last ? last.height : null];
    } finally {
      await reset();
    }
  });

  await check("scroll.into-view-target", [170], async () => {
    try {
      const last = await lastEvent({ scrollIntoTarget: "scroll-target" });
      return [last ? last.top : null];
    } finally {
      await reset();
    }
  });
}
module.exports = { scrollContract };
