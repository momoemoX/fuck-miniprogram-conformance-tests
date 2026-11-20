Component({
  properties: {
    title: {
      type: String,
      value: "default-title",
    },
  },
  methods: {
    identify() {
      return "pack-widget-ready";
    },
    emitReady() {
      this.triggerEvent("widgetready", { title: this.properties.title });
    },
  },
});
