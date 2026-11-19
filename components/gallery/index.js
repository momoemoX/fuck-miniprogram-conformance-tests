const values = require("../../fixtures/component-values");

// Hosts every catalog component so cases can read properties, sizes and computed styles
// through the component's own selector scope.
Component({
  properties: {
    font: { type: String, value: "" },
  },
  data: { values },
  methods: {
    inspect(selector, fields) {
      return new Promise((resolve) => {
        this.createSelectorQuery().select(selector).fields(fields, resolve).exec();
      });
    },
  },
});
