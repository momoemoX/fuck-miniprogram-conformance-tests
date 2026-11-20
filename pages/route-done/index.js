Page({
  onLoad() {
    const app = getApp();
    if (app.pageEventTrace) app.pageEventTrace.push(["route-done-page", "load"]);
  },
  onReady() {
    const app = getApp();
    if (app.pageEventTrace) app.pageEventTrace.push(["route-done-page", "ready"]);
  },
});
