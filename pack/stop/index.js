Page({
  onLoad(query) {
    this.probe = getApp().routeProbe;
    this.probe.events.push("load:" + query.color);
  },
  onReady() {
    this.probe.events.push("ready");
    this.probe.ready();
  },
  onUnload() {
    this.probe.events.push("unload");
  },
});
