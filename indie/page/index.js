// Independent subpackage page: it must not require main-package files. Module-level code
// runs before App() when the mini program cold-starts here, so getApp() is still undefined
// and getApp({ allowDefault: true }) returns the default App object that App() later merges into.
const moduleGetAppType = typeof getApp();
const defaultApp = getApp({ allowDefault: true });

Page({
  onLoad(options) {
    const app = getApp();
    this.snapshot = {
      route: this.route,
      getAppType: moduleGetAppType,
      defaultAppType: typeof defaultApp,
      sameAsApp: Boolean(app) && defaultApp === app,
      query: Object.assign({}, options),
    };
    if (options.cold === "1") defaultApp.indieMark = "set-before-main";
    if (app && typeof app.indieProbe === "function") app.indieProbe(this.snapshot);
  },
});
