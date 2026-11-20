const { update } = require("./support");
const { isolatedNavigation } = require("./route-harness");
const lazyLedger = require("../fixtures/lazy-ledger.js");

async function widthOf(scope, selector) {
  const rect = await new Promise((resolve) =>
    scope.createSelectorQuery().select(selector).boundingClientRect(resolve).exec(),
  );
  return rect ? Math.round(rect.width) : null;
}

// app.json-level module and package configuration: global usingComponents, resolveAlias
// (which maps require() paths only), lazyCodeLoading and independent subpackages.
async function moduleConfig(page, check) {
  await check(
    "module.global-component-in-page-and-component",
    ["components/global-probe/index", "components/global-probe/index", "global"],
    async () => {
      try {
        await update(page, { globalMounted: true });
        const inPage = page.selectComponent("#global-in-page");
        const host = page.selectComponent("#global-host");
        const inComponent = host && host.selectComponent("#global-in-comp");
        return [inPage && inPage.is, inComponent && inComponent.is, inComponent && inComponent.data.kind];
      } finally {
        await update(page, { globalMounted: false });
      }
    },
  );

  await check("module.resolve-alias-require", [true, 0], () => {
    const viaAlias = require("@fixtures/module-state.js");
    const viaRelative = require("../fixtures/module-state.js");
    return [viaAlias === viaRelative, typeof viaAlias.counter === "number" ? 0 : null];
  });

  // Only this case opens pages/lazy-host/index, whose page config is the only place that
  // declares lazy-probe; with lazyCodeLoading the component module runs on first use.
  await isolatedNavigation(check, "module.lazy-code-loading-on-demand", [false, true], async (harness) => {
    const app = getApp();
    const before = lazyLedger.indexOf("lazy-probe") !== -1;
    let timer;
    const ready = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("pages/lazy-host/index was not ready")), 10000);
      app.lazyHostReady = resolve;
    });
    try {
      await Promise.all([
        ready,
        harness.navigate("navigateTo", { url: "/pages/lazy-host/index" }, "pages/lazy-host/index"),
      ]);
    } finally {
      clearTimeout(timer);
      delete app.lazyHostReady;
    }
    return [before, lazyLedger.indexOf("lazy-probe") !== -1];
  });

  // Entering an independent subpackage from the main package: the main App already
  // exists, so getApp({ allowDefault: true }) returns it, and app.wxss does not apply.
  await isolatedNavigation(
    check,
    "subpackage.independent-page-in-stack",
    [{ route: "indie/page/index", getApp: "object", defaultApp: "object", sameAsApp: true }, 1, 0],
    async (harness) => {
      const app = getApp();
      let snapshot = null;
      let timer;
      const loaded = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("indie/page/index did not load")), 10000);
        app.indieProbe = (value) => {
          snapshot = value;
          resolve();
        };
      });
      try {
        await Promise.all([
          loaded,
          harness.navigate("navigateTo", { url: "/indie/page/index?from=suite" }, "indie/page/index"),
        ]);
      } finally {
        clearTimeout(timer);
        delete app.indieProbe;
      }
      const top = getCurrentPages().slice(-1)[0];
      return [
        {
          route: snapshot.route,
          getApp: snapshot.getAppType,
          defaultApp: snapshot.defaultAppType,
          sameAsApp: snapshot.sameAsApp,
        },
        getCurrentPages().length - harness.initialDepth,
        await widthOf(top, "#indie-app-rule"),
      ];
    },
  );
}

module.exports = { moduleConfig };
