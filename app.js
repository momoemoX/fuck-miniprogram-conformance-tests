// Records public app-level observations for the app lifecycle cases.
// The suite page appends its own boot marker in onLoad.
const wxPageNotFoundEvents = [];

function normalizeNotFound(res) {
  return {
    path: res && res.path ? String(res.path) : "",
    query: res && res.query && typeof res.query === "object" ? res.query : {},
    isEntryPage: Boolean(res && res.isEntryPage),
  };
}

if (typeof wx !== "undefined" && typeof wx.onPageNotFound === "function") {
  wx.onPageNotFound((res) => {
    wxPageNotFoundEvents.push(normalizeNotFound(res));
  });
}

App({
  bootTrace: [],
  pageNotFoundEvents: [],
  wxPageNotFoundEvents,
  shows: 0,
  hides: 0,
  onLaunch(options) {
    this.launchPages = getCurrentPages().length;
    this.launchOptions = {
      path: typeof options.path,
      query: typeof options.query,
      scene: typeof options.scene,
      referrerInfo: typeof options.referrerInfo,
    };
    this.bootTrace.push("launch");
  },
  onShow() {
    this.shows += 1;
    this.bootTrace.push("show");
  },
  onHide() {
    this.hides += 1;
  },
  onPageNotFound(res) {
    const entry = normalizeNotFound(res);
    this.pageNotFoundEvents.push(entry);
    if (entry.path.replace(/^\//, "") === "pages/missing-entry/index") {
      wx.reLaunch({ url: "/pages/suite/index?fromNotFound=1" });
    }
  },
  onError(event) {
    (this.appErrors = this.appErrors || []).push(
      event && typeof event === "object" ? String(event.message || event) : String(event),
    );
  },
  onUnhandledRejection(event) {
    (this.appRejections = this.appRejections || []).push(String(event && event.reason));
  },
});
