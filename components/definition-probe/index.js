const ancestry = Behavior({
  data: { blend: { ancestry: 1 }, list: ["ancestry"] },
  lifetimes: {
    created() {
      this.order = ["ancestry"];
    },
  },
});
const left = Behavior({
  behaviors: [ancestry],
  data: { blend: { left: 2 }, list: ["left"] },
  lifetimes: {
    created() {
      this.order.push("left");
    },
  },
});
const right = Behavior({
  behaviors: [ancestry],
  data: { blend: { right: 3 }, list: ["right"] },
  lifetimes: {
    created() {
      this.order.push("right");
    },
  },
});
const filter = Behavior({
  definitionFilter(definition) {
    definition.data.filtered = "inserted";
    definition.methods.filteredMethod = function () {
      return this.data.filtered;
    };
  },
});
Component({
  behaviors: [left, right, filter],
  properties: {
    quantity: Number,
    text: String,
    flag: Boolean,
    object: Object,
    array: Array,
    flexible: { type: Number, optionalTypes: [String] },
    free: null,
  },
  data: { blend: { own: 4 }, list: ["own"], derived: 0 },
  created() {
    this.order = ["legacy"];
  },
  lifetimes: {
    created() {
      this.order.push("component");
    },
  },
  observers: {
    quantity(value) {
      this.setData({ derived: value * 2 });
    },
  },
  methods: {
    getOrder() {
      return this.order.slice();
    },
  },
});
