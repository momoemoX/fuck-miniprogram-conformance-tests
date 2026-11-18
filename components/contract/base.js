module.exports = Behavior({
  data: { settings: { base: true, priority: "base" } },
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
