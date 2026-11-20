Page({
  onReady() {
    const app = getApp();
    if (app.lazyHostReady) app.lazyHostReady();
  },
});
