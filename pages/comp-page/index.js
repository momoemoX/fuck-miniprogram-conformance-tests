Component({
  properties: {
    code: {
      type: String,
      value: "none",
    },
    count: {
      type: Number,
      value: 0,
    },
  },
  lifetimes: {
    created() {
      this.phases = ["created"];
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
