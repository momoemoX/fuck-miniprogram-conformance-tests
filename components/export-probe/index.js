Component({
  behaviors: ["wx://component-export"],
  properties: { kind: String },
  data: { quantity: 3 },
  export() {
    if (this.properties.kind === "null") return null;
    if (this.properties.kind === "undefined") return;
    return {
      read: () => this.data.quantity,
      write: (value) => this.setData({ quantity: value }),
      exported: true,
    };
  },
});
