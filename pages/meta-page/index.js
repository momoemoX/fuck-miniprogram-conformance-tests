Page({
  data: {
    rootFontSize: "20px",
    pageStyle: "color: rgb(17, 34, 51);",
    navTitle: "Meta Initial",
    metaScrollTop: "0px",
    containerShow: false,
  },
  onLoad() {
    this.scrollLog = [];
    this.containerLog = [];
  },
  onReady() {
    const probe = getApp().metaPageProbe;
    if (probe) probe.record("meta.ready");
  },
  onPageScroll(event) {
    this.scrollLog.push(Math.round(event.scrollTop));
  },
  onBeforeEnter() {
    this.containerLog.push("beforeenter");
  },
  onAfterEnter() {
    this.containerLog.push("afterenter");
  },
  onBeforeLeave() {
    this.containerLog.push("beforeleave");
  },
  onAfterLeave() {
    this.containerLog.push("afterleave");
  },
});
