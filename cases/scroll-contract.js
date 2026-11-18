const { update } = require("./support");

// Real scroll-view interactions driven by public bindings. Scroll events arrive
// throttled, so cases read the last event after the animation settles.
async function scrollContract(page, check) {
  async function settled(patch, ms = 400) {
    if (patch) await update(page, patch);
    await new Promise((resolve) => setTimeout(resolve, ms));
    const events = page.scrollEvents || [];
    return events[events.length - 1] || null;
  }

  await check("scroll.bindscroll-detail", [30, 220], async () => {
    try {
      const last = await settled({ scrollTopValue: 30 });
      return [last ? last.top : null, last ? last.height : null];
    } finally {
      await settled({ scrollTopValue: 0 }, 200);
    }
  });

  await check("scroll.into-view-target", [170], async () => {
    try {
      const last = await settled({ scrollIntoTarget: "scroll-target" });
      return [last ? last.top : null];
    } finally {
      await settled({ scrollIntoTarget: "", scrollTopValue: 0 }, 200);
    }
  });
}
module.exports = { scrollContract };
