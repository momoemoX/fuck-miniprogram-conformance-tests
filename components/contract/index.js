const base = require("./base");
const nested = Behavior({
  behaviors: [base],
  data: { settings: { nested: true, priority: "nested" } },
  lifetimes: {
    attached() {
      this.sequence.push("nested-attached");
    },
  },
  methods: {
    label() {
      return "nested";
    },
  },
});

Component({
  behaviors: [nested],
  properties: {
    count: Number,
    caption: String,
    enabled: Boolean,
    list: { type: Array, value: [4] },
    options: { type: Object, value: { label: "seed" } },
    watched: {
      type: Number,
      value: 0,
      observer(value, previous) {
        if (this.propertyChanges) this.propertyChanges.push([value, previous]);
      },
    },
  },
  data: {
    blend: 0,
    a: 1,
    b: 2,
    object: { x: 1, y: 2 },
    rows: [1, 2],
    settings: { own: true, priority: "own" },
  },
  lifetimes: {
    created() {
      this.sequence = [];
    },
    attached() {
      this.sequence.push("own-attached");
    },
  },
  observers: {
    blend() {
      if (this.blendTrace) this.blendTrace.push("own");
    },
    "a, b": function (a, b) {
      if (this.pairs) this.pairs.push([a, b]);
    },
    "object.**": function (value) {
      if (this.objects) this.objects.push({ x: value.x, y: value.y });
    },
    "rows[0]": function (value) {
      if (this.firstItems) this.firstItems.push(value);
    },
  },
  methods: {
    label() {
      return "own";
    },
    inheritsBase() {
      return this.hasBehavior(base) && this.hasBehavior(nested);
    },
  },
});
