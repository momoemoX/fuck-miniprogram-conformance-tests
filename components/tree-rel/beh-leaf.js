const behRel = require("./beh-rel");

Component({
  behaviors: [behRel],
  properties: {
    label: {
      type: String,
      value: "",
    },
  },
  relations: {
    "./beh-root": {
      type: "ancestor",
    },
  },
});
