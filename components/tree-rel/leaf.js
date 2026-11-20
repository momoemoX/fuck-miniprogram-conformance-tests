Component({
  properties: {
    label: {
      type: String,
      value: "",
    },
  },
  relations: {
    "./root": {
      type: "ancestor",
    },
  },
  methods: {
    hasRoot() {
      return this.getRelationNodes("./root").length === 1;
    },
  },
});
