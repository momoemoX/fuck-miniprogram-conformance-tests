Page({
  data: { counter: 0 },
  onLoad(options) {
    this.suiteName = options.name;
    this.suiteOptions = options;
    this.record("load");
  },
  onShow() {
    this.record("show");
  },
  onReady() {
    this.record("ready");
  },
  onHide() {
    this.record("hide");
  },
  onUnload() {
    this.record("unload");
  },
  record(phase) {
    const probe = getApp().lifecycleProbe;
    if (probe) probe.record(this.suiteName + "." + phase);
  },
});
