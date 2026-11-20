// Custom tabBar instance: each tab page owns one, reachable through page.getTabBar().
Component({
  data: { mark: "" },
  lifetimes: {
    attached() {
      const app = getApp();
      if (app) (app.tabBarAttached = app.tabBarAttached || []).push(Date.now());
    },
  },
  pageLifetimes: {
    show() {
      const app = getApp();
      if (app && app.tabBarPageShows) app.tabBarPageShows.push("show");
    },
  },
  methods: {
    setMark(mark) {
      this.setData({ mark });
    },
  },
});
