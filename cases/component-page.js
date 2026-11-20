const { update, query } = require("./support");
const { isolatedNavigation } = require("./route-harness");

// Pages defined via Component() constructor: query-to-property mapping, behaviors,
// observers and methods lifecycles.
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

  await isolatedNavigation(
    check,
    "component-page.behavior-and-observers",
    ["beh-data", "from-behavior", true],
    async ({ navigate, waitFor, record }) => {
      const app = getApp();
      app.compPageProbe = { record };
      try {
        const ready = waitFor("onReady");
        await Promise.all([
          ready,
          navigate(
            "navigateTo",
            { url: "/pages/comp-page/index?code=gamma&count=9" },
            "pages/comp-page/index",
          ),
        ]);
        const opened = getCurrentPages().slice(-1)[0];
        const sawQuery = opened.observed.some(([c, n]) => c === "gamma" && n === 9);
        return [opened.data.fromBehavior, opened.behaviorHelper(), sawQuery];
      } finally {
        delete app.compPageProbe;
      }
    },
  );

  await isolatedNavigation(
    check,
    "component-page.query-defaults-and-boolean",
    ["none", 0, true, "boolean"],
    async ({ navigate, waitFor, record }) => {
      const app = getApp();
      app.compPageProbe = { record };
      try {
        const ready = waitFor("onReady");
        await Promise.all([
          ready,
          navigate("navigateTo", { url: "/pages/comp-page/index?flag=true" }, "pages/comp-page/index"),
        ]);
        const opened = getCurrentPages().slice(-1)[0];
        return [
          opened.properties.code,
          opened.properties.count,
          opened.properties.flag,
          typeof opened.properties.flag,
        ];
      } finally {
        delete app.compPageProbe;
      }
    },
  );

  await isolatedNavigation(
    check,
    "component-page.query-encoded-and-setdata",
    ["a b/c", "updated", "updated"],
    async ({ navigate, waitFor, record }) => {
      const app = getApp();
      app.compPageProbe = { record };
      try {
        const ready = waitFor("onReady");
        await Promise.all([
          ready,
          navigate(
            "navigateTo",
            { url: "/pages/comp-page/index?code=a%20b%2Fc&count=12" },
            "pages/comp-page/index",
          ),
        ]);
        const opened = getCurrentPages().slice(-1)[0];
        const initialCode = opened.properties.code;
        await update(opened, { code: "updated" });
        const node = await query(opened, "#comp-page-info", { dataset: true });
        return [initialCode, opened.data.code, node.dataset.code];
      } finally {
        delete app.compPageProbe;
      }
    },
  );
}

module.exports = { componentPage };
