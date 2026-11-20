Component({
  relations: {
    "./leaf": {
      type: "descendant",
      linked(target) {
        this.events.push(["linked", target.properties.label]);
      },
      linkChanged(target) {
        this.events.push(["linkChanged", target.properties.label]);
      },
      unlinked(target) {
        this.events.push(["unlinked", target.properties.label]);
      },
    },
  },
  lifetimes: {
    created() {
      this.events = [];
    },
  },
  methods: {
    leafLabels() {
      return this.getRelationNodes("./leaf").map((node) => node.properties.label);
    },
  },
});
