const { call } = require("./support");

async function routes(check) {
  await check(
    "route.subpackage-stack-and-lifetimes",
    ["load:blue", "ready", "pack/stop/index", 2, "unload", "pages/suite/index", 1],
    async () => {
      const app = getApp();
      const events = [];
      let timer;
      const ready = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Destination did not become ready")), 5000);
        app.routeProbe = { events, ready: resolve };
      });
      try {
        await Promise.all([ready, call(wx, "navigateTo", { url: "/pack/stop/index?color=blue" })]);
        let stack = getCurrentPages();
        events.push(stack[stack.length - 1].route, stack.length);
        await call(wx, "navigateBack", { delta: 1 });
        stack = getCurrentPages();
        events.push(stack[stack.length - 1].route, stack.length);
        return events;
      } finally {
        clearTimeout(timer);
        delete app.routeProbe;
      }
    },
  );
}
module.exports = { routes };
