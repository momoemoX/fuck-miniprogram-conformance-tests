Component({
  properties: { itemKey: String, group: String },
  lifetimes: {
    moved() {
      this.trace("moved");
    },
    beforeDetach() {
      this.trace("beforeDetach");
    },
    detached() {
      this.trace("detached");
    },
  },
  methods: {
    trace(phase) {
      const app = getApp();
      if (app.moveTrace) app.moveTrace.push(this.data.group + ":" + this.data.itemKey + ":" + phase);
    },
  },
});
