module.exports = Behavior({
  data: { settings: { base: true, priority: "base" } },
  properties: {
    blendProp: {
      type: Number,
      value: 0,
      observer() {
        if (this.blendPropTrace) this.blendPropTrace.push("behavior-prop");
      },
    },
  },
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
