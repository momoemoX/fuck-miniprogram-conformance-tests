const pageBehavior = require("./page-behavior");

Component({
  behaviors: [pageBehavior],
  properties: {
    code: {
      type: String,
      value: "none",
    },
    count: {
      type: Number,
      value: 0,
    },
    flag: {
      type: Boolean,
      value: false,
    },
  },
  lifetimes: {
    created() {
      this.phases = ["created"];
      this.observed = [];
    },
    attached() {
      this.phases.push("attached");
    },
    ready() {
      this.phases.push("ready");
    },
    detached() {
      this.phases.push("detached");
      const probe = getApp().compPageProbe;
      if (probe) probe.record("detached");
    },
  },
  observers: {
    "code, count"(code, count) {
      if (this.observed) this.observed.push([code, count]);
    },
  },
  methods: {
    onLoad(query) {
      this.phases.push("onLoad");
      this.receivedQuery = query;
      const probe = getApp().compPageProbe;
      if (probe) probe.record("onLoad");
    },
    onShow() {
      this.phases.push("onShow");
      const probe = getApp().compPageProbe;
      if (probe) probe.record("onShow");
    },
    onReady() {
      this.phases.push("onReady");
      const probe = getApp().compPageProbe;
      if (probe) probe.record("onReady");
    },
    onUnload() {
      this.phases.push("onUnload");
      const probe = getApp().compPageProbe;
      if (probe) probe.record("onUnload");
    },
  },
});
