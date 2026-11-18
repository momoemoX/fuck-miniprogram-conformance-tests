const shared = require("./shared");
Component({
  behaviors: [shared],
  properties: { flavor: { type: String, value: "plain" }, amount: Number, enabled: Boolean },
  data: { left: 0, right: 0, batch: { items: [1, 2] } },
  lifetimes: {
    created() {
      this.visits = ["created"];
    },
    attached() {
      this.visits.push("attached");
    },
    ready() {
      this.visits.push("ready");
    },
    detached() {
      this.visits.push("detached");
    },
  },
  observers: {
    "left, right": function (left, right) {
      if (this.samples) this.samples.push([left, right]);
    },
    "batch.**": function (batch) {
      if (this.batches) this.batches.push(batch.items.slice());
    },
  },
  methods: {
    inheritsRecipe() {
      return this.hasBehavior(shared);
    },
  },
});
