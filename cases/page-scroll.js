const { call } = require("./support");

// The suite page carries a 2000px spacer so page-level scrolling can be driven
// through public APIs. Cases restore the scroll position before returning.
async function pageScrollContract(page, check) {
  async function settleScroll(ms = 500) {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return page.pageScrollTrace || [];
  }

  await check("page.scroll-events", [true, true], async () => {
    try {
      page.pageScrollTrace = [];
      await call(wx, "pageScrollTo", { scrollTop: 300, duration: 0 });
      const afterDown = await settleScroll();
      await call(wx, "pageScrollTo", { scrollTop: 0, duration: 0 });
      const afterUp = await settleScroll();
      const wentDown = afterDown.some((value) => typeof value === "number" && value >= 250);
      const wentUp = afterUp.some((value) => typeof value === "number" && value <= 20);
      return [wentDown, wentUp];
    } finally {
      await call(wx, "pageScrollTo", { scrollTop: 0, duration: 0 }).catch(() => null);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  });

  await check("page.reach-bottom", [true], async () => {
    try {
      page.pageScrollTrace = [];
      await call(wx, "pageScrollTo", { scrollTop: 99999, duration: 0 });
      const trace = await settleScroll(800);
      return [trace.indexOf("bottom") !== -1];
    } finally {
      await call(wx, "pageScrollTo", { scrollTop: 0, duration: 0 }).catch(() => null);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  });

  // Observed on the 3.7.0 host: the call succeeds without delivering the
  // page's onPullDownRefresh hook. Needs simulator confirmation.
  await check("ui.pull-down-refresh", [[], "success"], async () => {
    page.pullDownTrace = [];
    const stopped = await new Promise((resolve) => {
      wx.startPullDownRefresh({
        success: () => {
          wx.stopPullDownRefresh({ complete: () => resolve("success") });
        },
        fail: () => resolve("fail"),
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [page.pullDownTrace.slice(), stopped];
  });
}
module.exports = { pageScrollContract };
