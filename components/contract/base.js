module.exports = Behavior({
  data: { settings: { base: true, priority: "base" } },
  observers: {
    blend(value) {
      if (this.blendTrace) this.blendTrace.push("base");
    },
  },
  lifetimes: {
    attached() {
      this.sequence.push("base-attached");
    },
  },
  methods: {
    label() {
      return "base";
    },
    inherited() {
      return "available";
    },
  },
});
