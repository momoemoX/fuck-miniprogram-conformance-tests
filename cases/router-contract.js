const { update, delay, call } = require("./support");
const { createRouteHarness, isolatedNavigation } = require("./route-harness");

async function withRouterProbe(page, run) {
  try {
    await update(page, { routerMounted: true });
    return await run(page.selectComponent("#router-probe"));
  } finally {
    await update(page, { routerMounted: false });
  }
}

const ROUTE_LISTENERS = [
  "onBeforeAppRoute",
  "onAppRoute",
  "onAppRouteDone",
  "onBeforePageLoad",
  "onAfterPageLoad",
  "onBeforePageUnload",
];

async function routerContract(page, check) {
  // this.router resolves relative URLs against the component's own path
  // (components/router-probe/), so "../lifecycle/index" points to a missing page.
  await isolatedNavigation(
    check,
    "route.component-router-relative-to-component",
    ["fail:true", "success", "pages/lifecycle/index"],
    (harness) =>
      withRouterProbe(page, async (probe) => {
        const missing = await probe.go("router", "../lifecycle/index?name=rbad");
        const ready = harness.waitFor("rc.ready");
        const found = await probe.go("router", "../../pages/lifecycle/index?name=rc");
        await ready;
        return [missing, found, getCurrentPages().slice(-1)[0].route];
      }),
  );

  // this.pageRouter resolves against the owning page's path (pages/suite/).
  await isolatedNavigation(
    check,
    "route.page-router-relative-to-page",
    ["success", "pages/lifecycle/index"],
    (harness) =>
      withRouterProbe(page, async (probe) => {
        const ready = harness.waitFor("rp.ready");
        const outcome = await probe.go("pageRouter", "../lifecycle/index?name=rp");
        await ready;
        return [outcome, getCurrentPages().slice(-1)[0].route];
      }),
  );

  // One navigateTo and its navigateBack: listener order, payload paths, and one
  // routeEventId shared by every event of the same route but not across routes.
  await isolatedNavigation(
    check,
    "route.listeners-navigate-and-back",
    [
      [
        ["onBeforeAppRoute", "navigateTo", "pages/lifecycle/index"],
        ["onBeforePageLoad", null, "pages/lifecycle/index"],
        ["onAfterPageLoad", null, "pages/lifecycle/index"],
        ["onAppRoute", "navigateTo", "pages/lifecycle/index"],
        ["onAppRouteDone", "navigateTo", "pages/lifecycle/index"],
      ],
      [
        ["onBeforeAppRoute", "navigateBack", "pages/suite/index"],
        ["onBeforePageUnload", null, "pages/lifecycle/index"],
        ["onAppRoute", "navigateBack", "pages/suite/index"],
        ["onAppRouteDone", "navigateBack", "pages/suite/index"],
      ],
      [true, true, true],
    ],
    async (harness) => {
      const trace = [];
      const offs = [];
      for (const name of ROUTE_LISTENERS) {
        const listener = (event) =>
          trace.push({
            name,
            openType: (event && event.openType) || null,
            path: event && event.path ? String(event.path).replace(/^\//, "") : null,
            id: event && event.routeEventId,
          });
        wx[name](listener);
        offs.push(() => wx["off" + name.slice(2)](listener));
      }
      try {
        await harness.open("rl");
        const pushed = trace.length;
        await harness.navigate("navigateBack", { delta: 1 }, "pages/suite/index");
        await delay(300);
        const rows = (events) => events.map((event) => [event.name, event.openType, event.path]);
        const sharedId = (events) => events.length > 0 && events.every((event) => event.id && event.id === events[0].id);
        const push = trace.slice(0, pushed);
        const back = trace.slice(pushed);
        return [
          rows(push),
          rows(back),
          [sharedId(push), sharedId(back), Boolean(push[0] && back[0] && push[0].id !== back[0].id)],
        ];
      } finally {
        offs.forEach((off) => off());
      }
    },
  );

  // Each tab page owns its custom tabBar instance, state survives switchTab, and the
  // custom tabBar component does not receive pageLifetimes (documented).
  await check(
    "route.custom-tab-bar-per-page-instance",
    ["custom-tab-bar/index", "custom-tab-bar/index", true, "", true, "suite-mark", 0],
    async () => {
      const app = getApp();
      const harness = createRouteHarness();
      const suiteBar = page.getTabBar();
      app.tabBarPageShows = [];
      try {
        suiteBar.setMark("suite-mark");
        let tabTimer;
        const tabShown = new Promise((resolve, reject) => {
          tabTimer = setTimeout(() => reject(new Error("Tab page did not show")), 10000);
          app.tabJourney = resolve;
        }).finally(() => clearTimeout(tabTimer));
        await Promise.all([
          tabShown,
          harness.navigate("switchTab", { url: "/pages/tab/index" }, "pages/tab/index"),
        ]);
        const tabPage = getCurrentPages().slice(-1)[0];
        const tabBar = tabPage.getTabBar();
        const tabState = [tabBar && tabBar.is, tabBar !== suiteBar, tabBar && tabBar.data.mark];
        await harness.navigate("switchTab", { url: "/pages/suite/index" }, "pages/suite/index");
        const back = page.getTabBar();
        return [suiteBar.is, ...tabState, back === suiteBar, back.data.mark, app.tabBarPageShows.length];
      } finally {
        delete app.tabJourney;
        delete app.tabBarPageShows;
        if (suiteBar) suiteBar.setMark("");
        const top = getCurrentPages().slice(-1)[0];
        if (!top || top.route !== "pages/suite/index") {
          await call(wx, "switchTab", { url: "/pages/suite/index" }).catch(() => null);
        }
      }
    },
  );
}

module.exports = { routerContract };
