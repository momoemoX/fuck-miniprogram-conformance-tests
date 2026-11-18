const expected = {
  "input.detail": "lime",
  "form.text": "lime",
  "form.radio": "red",
  "form.checkbox": ["peel"],
  "form.switch": true,
  "touch.longpress": ["start", "hold", "end"],
};

Page({
  data: { rows: Object.keys(expected).map((id) => ({ id, status: "NOT RUN", detail: "" })) },
  record(id, value) {
    const expectedText = JSON.stringify(expected[id]);
    const actualText = JSON.stringify(value);
    this.setData({
      rows: this.data.rows.map((row) =>
        row.id !== id
          ? row
          : {
              id,
              status: actualText === expectedText ? "PASS" : "FAIL",
              detail: "Expected " + expectedText + ", actual " + actualText,
            },
      ),
    });
  },
  input(event) {
    this.lastInput = event.detail.value;
  },
  submit(event) {
    const values = event.detail.value;
    this.record("input.detail", this.lastInput);
    this.record("form.text", values.fruit);
    this.record("form.radio", values.color);
    this.record("form.checkbox", values.parts);
    this.record("form.switch", values.enabled);
  },
  start() {
    this.gestures = ["start"];
  },
  hold() {
    this.gestures.push("hold");
  },
  end() {
    this.gestures.push("end");
    this.record("touch.longpress", this.gestures);
  },
});
