Component({
  methods: {
    fireHost(options) {
      this.triggerEvent("ping", { source: "host" }, options);
    },
    fireLeaf(options) {
      this.selectComponent("#adv-leaf").fire(options);
    },
    onInsidePing(event) {
      const app = getApp();
      if (app.advEventTrace) {
        app.advEventTrace.push({ at: "inside", mark: Object.assign({}, event.mark || {}) });
      }
    },
  },
});
