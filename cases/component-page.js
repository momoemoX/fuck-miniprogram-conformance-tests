const { query } = require("./support");
const { isolatedNavigation } = require("./route-harness");

// Pages defined via Component() constructor: query-to-property mapping and methods lifecycles.
async function componentPage(check) {
  await isolatedNavigation(
    check,
    "component-page.query-to-properties",
    ["alpha", 7, "number", "alpha", 7],
    async ({ navigate, waitFor, record }) => {
      const app = getApp();
      app.compPageProbe = { record };
      try {
        const ready = waitFor("onReady");
        await Promise.all([
          ready,
          navigate(
            "navigateTo",
            { url: "/pages/comp-page/index?code=alpha&count=7" },
            "pages/comp-page/index",
          ),
        ]);
        const opened = getCurrentPages().slice(-1)[0];
        const node = await query(opened, "#comp-page-info", { dataset: true });
        return [
          opened.properties.code,
          opened.properties.count,
          typeof opened.properties.count,
          node.dataset.code,
          node.dataset.count,
        ];
      } finally {
        delete app.compPageProbe;
      }
    },
  );

  await isolatedNavigation(
    check,
    "component-page.methods-lifecycles",
    [
      "pages/comp-page/index",
      ["created", "attached", "onLoad", "onShow", "ready", "onReady", "onUnload", "detached"],
    ],
    async ({ navigate, waitFor, record }) => {
      const app = getApp();
      app.compPageProbe = { record };
      try {
        const ready = waitFor("onReady");
        await Promise.all([
          ready,
          navigate(
            "navigateTo",
            { url: "/pages/comp-page/index?code=beta&count=2" },
            "pages/comp-page/index",
          ),
        ]);
        const opened = getCurrentPages().slice(-1)[0];
        const route = opened.route;
        const detached = waitFor("detached");
        await Promise.all([
          detached,
          navigate("navigateBack", { delta: 1 }, "pages/suite/index"),
        ]);
        return [route, opened.phases.slice()];
      } finally {
        delete app.compPageProbe;
      }
    },
  );
}

module.exports = { componentPage };
