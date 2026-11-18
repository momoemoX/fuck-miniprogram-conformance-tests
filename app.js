// Records public app-level observations for the app lifecycle cases.
// The suite page appends its own boot marker in onLoad.
App({
  bootTrace: [],
  pageNotFoundEvents: [],
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
  onPageNotFound() {
    this.pageNotFoundEvents.push("not-found");
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
