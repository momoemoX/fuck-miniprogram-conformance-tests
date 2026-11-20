const { matches, resultEntry } = require("./report");

// Cold-start checks run after the suite: tools/devtools/run.cjs restarts the mini program
// into a launch path, waits for pages/suite/index to come back, then calls
// page.verifyColdStart(kind, snapshot) to turn what the app recorded into results.
function entry(id, expected, actual) {
  return resultEntry(id, expected, JSON.stringify(actual), matches(actual, expected));
}

// wx.restartMiniProgram to pages/missing-entry/index?tag=probe&from=cold; App.onPageNotFound
// recovers with a synchronous wx.reLaunch to pages/suite/index?fromNotFound=1.
function pageNotFound(page) {
  const app = getApp();
  const payload = { path: "pages/missing-entry/index", query: { tag: "probe", from: "cold" }, isEntryPage: false };
  const stack = getCurrentPages();
  const top = stack[stack.length - 1];
  return [
    entry("route.page-not-found-app-hook", payload, (app.pageNotFoundEvents || [])[0] || null),
    entry("route.page-not-found-wx-listener", payload, (app.wxPageNotFoundEvents || [])[0] || null),
    entry(
      "route.page-not-found-sync-redirect",
      ["pages/suite/index", 1, "1"],
      [top ? top.route : "", stack.length, (page.entryOptions || {}).fromNotFound || ""],
    ),
  ];
}

// wx.restartMiniProgram to the independent subpackage page indie/page/index, which runs
// before the main package is loaded; the runner then reLaunches a main-package page.
function independent(snapshot) {
  const app = getApp();
  return [
    entry(
      "subpackage.independent-cold-start",
      { route: "indie/page/index", getApp: "undefined", defaultApp: "object", query: { cold: "1" } },
      snapshot
        ? { route: snapshot.route, getApp: snapshot.getAppType, defaultApp: snapshot.defaultAppType, query: snapshot.query }
        : null,
    ),
    entry(
      "subpackage.independent-default-app-merge",
      ["set-before-main", true],
      [app.indieMark || null, Array.isArray(app.bootTrace)],
    ),
  ];
}

function verifyColdStart(page, kind, snapshot) {
  if (kind === "page-not-found") return pageNotFound(page);
  if (kind === "independent") return independent(snapshot);
  throw new Error("Unknown cold-start check " + kind);
}

module.exports = { verifyColdStart };
