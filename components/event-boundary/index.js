Component({
  properties: { nested: Boolean },
  methods: {
    fire(options, detail) {
      this.triggerEvent("probe", detail, options);
    },
    emitInside(options, detail) {
      this.selectComponent("#inner").fire(options, detail);
    },
    inside(event) {
      getApp().boundaryTrace.push(["inside", event.detail.value]);
    },
  },
});
