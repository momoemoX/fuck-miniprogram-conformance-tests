Component({
  methods: {
    fire(options) {
      this.triggerEvent("ping", { source: "leaf" }, options);
    },
  },
});
