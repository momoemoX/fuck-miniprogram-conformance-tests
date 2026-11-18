Component({
  methods: {
    fire(options, detail) {
      this.triggerEvent("probe", detail, options);
    },
  },
});
