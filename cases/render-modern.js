const { update, query, waitUntil } = require("./support");
const { isolatedNavigation } = require("./route-harness");

// Modern rendering APIs: keyframe animate()/clearAnimation(), <page-meta>,
// <navigation-bar>, <page-container> and scroll-view boundary events.
async function renderModernContract(page, check) {
  await check("animate.keyframe-applies-and-clears", [[80, "0.5"], [20, "1"]], async () => {
    try {
      await update(page, { animateMounted: true });
      await new Promise((resolve) => {
        page.animate(
          "#page-kf",
          [
            { width: "20px", opacity: 1 },
            { width: "80px", opacity: 0.5 },
          ],
          60,
          resolve,
        );
      });
      const after = await query(page, "#page-kf", { size: true, computedStyle: ["opacity"] });
      await new Promise((resolve) => {
        page.clearAnimation("#page-kf", { width: true, opacity: true }, resolve);
      });
      const cleared = await query(page, "#page-kf", { size: true, computedStyle: ["opacity"] });
      return [
        [Math.round(after.width), String(after.opacity)],
        [Math.round(cleared.width), String(cleared.opacity)],
      ];
    } finally {
      await update(page, { animateMounted: false });
    }
  });

  await check("animate.component-scoped", [[72, "0.5"], [24, "1"]], async () => {
    try {
      await update(page, { animateMounted: true });
      const comp = page.selectComponent("#animate-probe");
      await comp.runKeyframe();
      const after = await query(comp, "#comp-kf", { size: true, computedStyle: ["opacity"] });
      await comp.clearKeyframe();
      const cleared = await query(comp, "#comp-kf", { size: true, computedStyle: ["opacity"] });
      return [
        [Math.round(after.width), String(after.opacity)],
        [Math.round(cleared.width), String(cleared.opacity)],
      ];
    } finally {
      await update(page, { animateMounted: false });
    }
  });

  await isolatedNavigation(
    check,
    "page-meta.root-font-size-and-style",
    [60, 30, "rgb(17, 34, 51)"],
    async ({ navigate, waitFor, record }) => {
      const app = getApp();
      app.metaPageProbe = { record };
      try {
        const ready = waitFor("meta.ready");
        await Promise.all([
          ready,
          navigate("navigateTo", { url: "/pages/meta-page/index" }, "pages/meta-page/index"),
        ]);
        const metaPage = getCurrentPages().slice(-1)[0];
        await waitUntil(async () => Math.round((await query(metaPage, "#rem-box", { size: true })).width) === 60, {
          timeout: 3000,
        });
        const firstWidth = Math.round((await query(metaPage, "#rem-box", { size: true })).width);
        const bodyStyle = await query(metaPage, "#meta-body", { computedStyle: ["color"] });
        await update(metaPage, { rootFontSize: "10px" });
        await waitUntil(async () => Math.round((await query(metaPage, "#rem-box", { size: true })).width) === 30, {
          timeout: 3000,
        });
        const secondWidth = Math.round((await query(metaPage, "#rem-box", { size: true })).width);
        return [firstWidth, secondWidth, bodyStyle.color];
      } finally {
        delete app.metaPageProbe;
      }
    },
  );

  await isolatedNavigation(
    check,
    "page-meta.scroll-top-binding",
    true,
    async ({ navigate, waitFor, record }) => {
      const app = getApp();
      app.metaPageProbe = { record };
      try {
        const ready = waitFor("meta.ready");
        await Promise.all([
          ready,
          navigate("navigateTo", { url: "/pages/meta-page/index" }, "pages/meta-page/index"),
        ]);
        const metaPage = getCurrentPages().slice(-1)[0];
        metaPage.scrollLog = [];
        await update(metaPage, { navTitle: "Meta Scrolled", metaScrollTop: "120px" });
        await waitUntil(() => metaPage.scrollLog.some((top) => top >= 100), { timeout: 3000 });
        return metaPage.scrollLog.some((top) => top >= 100);
      } finally {
        delete app.metaPageProbe;
      }
    },
  );

  await isolatedNavigation(
    check,
    "page-container.show-events-and-hide",
    ["beforeenter", "afterenter", "beforeleave", "afterleave"],
    async ({ navigate, waitFor, record }) => {
      const app = getApp();
      app.metaPageProbe = { record };
      try {
        const ready = waitFor("meta.ready");
        await Promise.all([
          ready,
          navigate("navigateTo", { url: "/pages/meta-page/index" }, "pages/meta-page/index"),
        ]);
        const metaPage = getCurrentPages().slice(-1)[0];
        metaPage.containerLog = [];
        await update(metaPage, { containerShow: true });
        await waitUntil(() => metaPage.containerLog.includes("afterenter"), { timeout: 3000 });
        await update(metaPage, { containerShow: false });
        await waitUntil(() => metaPage.containerLog.includes("afterleave"), { timeout: 3000 });
        return metaPage.containerLog.slice();
      } finally {
        delete app.metaPageProbe;
      }
    },
  );

  await check("scroll-view.edge-boundary-events", ["lower", "upper"], async () => {
    page.nodeScrollEdges = [];
    try {
      await update(page, { nodeQueryMounted: true, nodeScrollTop: 0 });
      await update(page, { nodeScrollTop: 220 });
      await waitUntil(() => page.nodeScrollEdges.includes("lower"), { timeout: 3000 });
      await update(page, { nodeScrollTop: 0 });
      await waitUntil(() => page.nodeScrollEdges.includes("upper"), { timeout: 3000 });
      const firstLower = page.nodeScrollEdges.indexOf("lower");
      const upperAfter = page.nodeScrollEdges.indexOf("upper", firstLower + 1);
      return [
        firstLower >= 0 ? "lower" : null,
        upperAfter > firstLower ? "upper" : null,
      ];
    } finally {
      await update(page, { nodeQueryMounted: false, nodeScrollTop: 0 });
      delete page.nodeScrollEdges;
    }
  });
}

module.exports = { renderModernContract };
