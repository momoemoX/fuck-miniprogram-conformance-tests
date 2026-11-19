const { call, delay, waitUntil } = require("./support");

// The suite page carries a 2000px spacer so page-level scrolling can be driven
// through public APIs. Cases restore the scroll position before returning.
async function pageScrollContract(page, check) {
  const trace = () => page.pageScrollTrace || [];
  async function scrollHome() {
    await call(wx, "pageScrollTo", { scrollTop: 0, duration: 0 }).catch(() => null);
    await waitUntil(async () => {
      const offset = await new Promise((resolve) =>
        wx.createSelectorQuery().selectViewport().scrollOffset(resolve).exec(),
      );
      return offset && offset.scrollTop === 0;
    });
  }

  await check("page.scroll-events", [true, true], async () => {
    try {
      page.pageScrollTrace = [];
      await call(wx, "pageScrollTo", { scrollTop: 300, duration: 0 });
      const wentDown = await waitUntil(() =>
        trace().some((value) => typeof value === "number" && value >= 250),
      );
      page.pageScrollTrace = [];
      await call(wx, "pageScrollTo", { scrollTop: 0, duration: 0 });
      const wentUp = await waitUntil(() =>
        trace().some((value) => typeof value === "number" && value <= 20),
      );
      return [!!wentDown, !!wentUp];
    } finally {
      await scrollHome();
    }
  });

  // onReachBottom must depend on the scroll position: nothing while the page rests
  // at the top of its 2000px spacer, then a report once it reaches the end.
  await check("page.reach-bottom", [false, true], async () => {
    try {
      await scrollHome();
      page.pageScrollTrace = [];
      // Negative window: no reach-bottom report while the page stays at the top.
      await delay(500);
      const atTop = trace().indexOf("bottom") !== -1;
      await call(wx, "pageScrollTo", { scrollTop: 99999, duration: 0 });
      const atBottom = await waitUntil(() => trace().indexOf("bottom") !== -1);
      return [atTop, !!atBottom];
    } finally {
      await scrollHome();
    }
  });

  // The suite page enables pull-down refresh in its page configuration, so the
  // programmatic start runs the page's onPullDownRefresh hook.
  await check("ui.pull-down-refresh", [["refresh"], "success"], async () => {
    page.pullDownTrace = [];
    let started = "success";
    try {
      await call(wx, "startPullDownRefresh");
    } catch {
      started = "fail";
    }
    try {
      await waitUntil(() => page.pullDownTrace.length > 0);
      return [page.pullDownTrace.slice(), started];
    } finally {
      await call(wx, "stopPullDownRefresh").catch(() => null);
      await scrollHome();
    }
  });
}
module.exports = { pageScrollContract };
