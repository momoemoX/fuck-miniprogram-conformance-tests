Component({
  properties: {
    value: {
      type: String,
      value: "",
    },
    count: {
      type: Number,
      value: 0,
    },
    flag: {
      type: Boolean,
      value: true,
    },
  },
  lifetimes: {
    created() {
      this.observedValues = [];
    },
  },
  observers: {
    value(next) {
      if (this.observedValues) this.observedValues.push(next);
    },
  },
  methods: {
    writeValue(next) {
      return new Promise((resolve) => this.setData({ value: next }, resolve));
    },
    writeCount(next) {
      return new Promise((resolve) => this.setData({ count: next }, resolve));
    },
    writeFlag(next) {
      return new Promise((resolve) => this.setData({ flag: next }, resolve));
    },
  },
});
