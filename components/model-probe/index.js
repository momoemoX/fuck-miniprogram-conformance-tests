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
  },
  methods: {
    writeValue(next) {
      return new Promise((resolve) => this.setData({ value: next }, resolve));
    },
    writeCount(next) {
      return new Promise((resolve) => this.setData({ count: next }, resolve));
    },
  },
});
