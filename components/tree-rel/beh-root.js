const behRel = require("./beh-rel");

Component({
  relations: {
    behRel: {
      type: "descendant",
      target: behRel,
      linked(target) {
        this.events.push(["linked", target.properties.label]);
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
    labels() {
      return this.getRelationNodes("behRel").map((node) => node.properties.label);
    },
  },
});
