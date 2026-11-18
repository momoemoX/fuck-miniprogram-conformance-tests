const { call } = require("./support");
const { isolatedNavigation } = require("./route-harness");

async function appContract(check) {
  await check("app.launch-order", ["launch", "show", "page.load"], () =>
    getApp().bootTrace.slice(0, 3),
  );
  await check("app.launch-pages-empty", 0, () => getApp().launchPages);
  await check(
    "app.launch-options-shape",
    { path: "string", query: "object", scene: "number", referrerInfo: "object" },
    () => getApp().launchOptions,
  );
  await check("app.enter-options-path", ["pages/suite/index", "pages/suite/index"], () => [
    wx.getEnterOptionsSync().path,
    wx.getLaunchOptionsSync().path,
  ]);
  await isolatedNavigation(
    check,
    "app.foreground-stable-during-navigation",
    [[], [], 0, 0],
    async ({ open, navigate }) => {
      const app = getApp();
      const appShows = [];
      const appHides = [];
      const showListener = (event) => appShows.push(event.path || "");
      const hideListener = (event) => appHides.push(event.path || "");
      wx.onAppShow(showListener);
      wx.onAppHide(hideListener);
      const beforeShows = app.shows;
      const beforeHides = app.hides;
      try {
        await open("alpha");
        await navigate("navigateBack", { delta: 1 }, "pages/suite/index");
      } finally {
        wx.offAppShow(showListener);
        wx.offAppHide(hideListener);
      }
      return [appShows, appHides, app.shows - beforeShows, app.hides - beforeHides];
    },
  );
  await check("app.page-not-found-not-fired", [], async () => {
    try {
      await call(wx, "navigateTo", { url: "/pages/not-declared/index" });
    } catch {
      // A failed route is expected; the assertion is about the app hook.
    }
    return getApp().pageNotFoundEvents;
  });
  await isolatedNavigation(
    check,
    "app.identity-across-pages",
    [true, 41],
    async ({ open }) => {
      const app = getApp();
      app.crossToken = 41;
      try {
        const opened = await open("alpha");
        return [opened.appToken === 41, getApp().crossToken];
      } finally {
        delete app.crossToken;
      }
    },
  );
}
module.exports = { appContract };
