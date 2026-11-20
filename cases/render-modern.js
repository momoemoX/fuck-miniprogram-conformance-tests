const { update, query, waitUntil } = require("./support");
const { isolatedNavigation } = require("./route-harness");

function execQuery(page, setup) {
  return new Promise((resolve) => {
    const q = page.createSelectorQuery();
    setup(q);
    q.exec(resolve);
  });
}

// Modern rendering APIs: keyframe animate()/clearAnimation(), scroll-driven keyframes,
// <page-meta>, <navigation-bar>, <page-container> and scroll-view boundary/into-view.
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

  await check("animate.partial-clear-preserves-remaining", [[20, "0.4"], [20, "1"]], async () => {
    try {
      await update(page, { animateMounted: true });
      await new Promise((resolve) => {
        page.animate(
          "#page-kf",
          [
            { width: "20px", opacity: 1 },
            { width: "80px", opacity: 0.4 },
          ],
          50,
          resolve,
        );
      });
      await new Promise((resolve) => {
        page.clearAnimation("#page-kf", { width: true }, resolve);
      });
      const partial = await query(page, "#page-kf", { size: true, computedStyle: ["opacity"] });
      await new Promise((resolve) => {
        page.clearAnimation("#page-kf", resolve);
      });
      const full = await query(page, "#page-kf", { size: true, computedStyle: ["opacity"] });
      return [
        [Math.round(partial.width), String(partial.opacity)],
        [Math.round(full.width), String(full.opacity)],
      ];
    } finally {
      await update(page, { animateMounted: false });
    }
  });

  await check("animate.override-previous-keyframe", 45, async () => {
    try {
      await update(page, { animateMounted: true });
      await new Promise((resolve) => {
        page.animate("#page-kf", [{ width: "20px" }, { width: "90px" }], 50, resolve);
      });
      await new Promise((resolve) => {
        page.animate("#page-kf", [{ width: "90px" }, { width: "45px" }], 50, resolve);
      });
      const box = await query(page, "#page-kf", { size: true });
      return Math.round(box.width);
    } finally {
      await new Promise((resolve) => page.clearAnimation("#page-kf", resolve));
      await update(page, { animateMounted: false });
    }
  });

  await check("animate.scroll-driven-keyframe", [true, true], async () => {
    try {
      await update(page, { nodeQueryMounted: true, animateMounted: true, nodeScrollTop: 0 });
      page.animate(
        "#scroll-kf",
        [{ width: "20px" }, { width: "100px" }],
        200,
        {
          scrollSource: "#node-scroll",
          timeRange: 200,
          startScrollOffset: 0,
          endScrollOffset: 100,
        },
      );
      const [nodeRes] = await execQuery(page, (q) => q.select("#node-scroll").node());
      const scrollView = nodeRes.node;
      scrollView.scrollTo({ top: 50, animated: false });
      await waitUntil(
        async () => {
          const w = Math.round((await query(page, "#scroll-kf", { size: true })).width);
          return w >= 50 && w <= 70;
        },
        { timeout: 3000 },
      );
      const midWidth = Math.round((await query(page, "#scroll-kf", { size: true })).width);
      scrollView.scrollTo({ top: 100, animated: false });
      await waitUntil(
        async () => Math.round((await query(page, "#scroll-kf", { size: true })).width) >= 95,
        { timeout: 3000 },
      );
      const endWidth = Math.round((await query(page, "#scroll-kf", { size: true })).width);
      return [midWidth >= 50 && midWidth <= 70, endWidth >= 95];
    } finally {
      await new Promise((resolve) => page.clearAnimation("#scroll-kf", resolve));
      await update(page, { nodeQueryMounted: false, animateMounted: false, nodeScrollTop: 0 });
    }
  });

  await check("animate.missing-selector-no-throw", [true, true], async () => {
    let animateThrew = false;
    let clearThrew = false;
    try {
      page.animate("#definitely-missing-kf", [{ width: "10px" }, { width: "20px" }], 30, () => {});
    } catch {
      animateThrew = true;
    }
    try {
      page.clearAnimation("#definitely-missing-kf", () => {});
    } catch {
      clearThrew = true;
    }
    return [!animateThrew, !clearThrew];
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
    "page-meta.dynamic-page-style-update",
    ["rgb(17, 34, 51)", "rgb(68, 85, 102)"],
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
        const before = (await query(metaPage, "#meta-body", { computedStyle: ["color"] })).color;
        await update(metaPage, { pageStyle: "color: rgb(68, 85, 102);" });
        await waitUntil(
          async () =>
            (await query(metaPage, "#meta-body", { computedStyle: ["color"] })).color ===
            "rgb(68, 85, 102)",
          { timeout: 3000 },
        );
        const after = (await query(metaPage, "#meta-body", { computedStyle: ["color"] })).color;
        return [before, after];
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

  await isolatedNavigation(
    check,
    "page-container.positions-top-vs-bottom",
    [true, true],
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
        await update(metaPage, { containerPosition: "top", containerRound: true, containerShow: true });
        await waitUntil(() => metaPage.containerLog.includes("afterenter"), { timeout: 3000 });
        const topRect = await query(metaPage, "#pc-inner", { rect: true });
        await update(metaPage, { containerShow: false });
        await waitUntil(() => metaPage.containerLog.includes("afterleave"), { timeout: 3000 });

        metaPage.containerLog = [];
        await update(metaPage, { containerPosition: "bottom", containerRound: true, containerShow: true });
        await waitUntil(() => metaPage.containerLog.includes("afterenter"), { timeout: 3000 });
        const bottomRect = await query(metaPage, "#pc-inner", { rect: true });
        await update(metaPage, { containerShow: false });
        await waitUntil(() => metaPage.containerLog.includes("afterleave"), { timeout: 3000 });
        return [topRect.top < 100, bottomRect.top > topRect.top + 100];
      } finally {
        delete app.metaPageProbe;
      }
    },
  );

  await isolatedNavigation(
    check,
    "page-container.overlay-and-zindex",
    [true, true],
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
        await update(metaPage, {
          containerPosition: "center",
          containerOverlay: true,
          containerZIndex: 200,
          containerShow: true,
        });
        await waitUntil(() => metaPage.containerLog.includes("afterenter"), { timeout: 3000 });
        const inner = await query(metaPage, "#pc-inner", { size: true });
        await update(metaPage, { containerShow: false });
        await waitUntil(() => metaPage.containerLog.includes("afterleave"), { timeout: 3000 });
        return [inner.width > 0 && inner.height === 40, metaPage.containerLog.includes("afterleave")];
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

  await check("scroll-view.scroll-into-view-horizontal", true, async () => {
    try {
      await update(page, { nodeQueryMounted: true, nodeScrollIntoX: "" });
      await update(page, { nodeScrollIntoX: "sx-target" });
      await waitUntil(
        async () => {
          const [off] = await execQuery(page, (q) => q.select("#node-scroll-x").scrollOffset());
          return off && off.scrollLeft >= 80;
        },
        { timeout: 3000 },
      );
      const [off] = await execQuery(page, (q) => q.select("#node-scroll-x").scrollOffset());
      return off.scrollLeft >= 80;
    } finally {
      await update(page, { nodeQueryMounted: false, nodeScrollIntoX: "" });
    }
  });
}

module.exports = { renderModernContract };
