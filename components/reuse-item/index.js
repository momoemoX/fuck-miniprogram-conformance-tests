Component({
  properties: { code: String, label: String, kind: String },
  data: { draft: "-" },
  lifetimes: {
    attached() {
      this.owner = this.selectOwnerComponent();
      this.initialCode = this.properties.code;
      this.owner.record("attached", this.properties.kind, this.properties.code);
    },
    detached() {
      this.owner.record("detached", this.properties.kind, this.properties.code);
    },
  },
  methods: {
    announce() {
      this.triggerEvent("row", { code: this.properties.code, draft: this.data.draft });
    },
  },
});
