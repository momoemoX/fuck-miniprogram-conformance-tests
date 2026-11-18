const expected = {
  "input.detail": { value: "lime", cursor: 4 },
  "form.text": "lime",
  "form.radio": "red",
  "form.checkbox": ["peel"],
  "form.switch": true,
  "form.custom-field": "custom-value",
  "touch.longpress": ["start", "hold", "end"],
  "input.cursor-insert": { value: "lXime", cursor: 2 },
  // Observed on the 3.7.0 browser host: a bindinput return value does not alter the
  // displayed text or the event detail.
  "input.return-ignored": { display: "abc", detail: "abc" },
  "input.confirm": { value: "go" },
  "input.maxlength-zero": "",
  "input.keeps-typed-value": { afterUnrelated: "seed", afterBound: "explicit" },
  // Observed on the 3.7.0 browser host: input events do not reach ancestor view
  // handlers (an independent implementation bubbles them; recorded as a difference).
  "input.bubbles-parent": null,
  "form.reset-defaults": { text: "", enabled: false, parts: [], color: "", amount: "" },
};

Page({
  data: {
    keepValue: "",
    rows: Object.keys(expected).map((id) => ({ id, status: "NOT RUN", detail: "" })),
  },
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
    this.lastInputDetail = { value: event.detail.value, cursor: event.detail.cursor };
  },
  cursor(event) {
    this.lastCursorDetail = { value: event.detail.value, cursor: event.detail.cursor };
  },
  transform(event) {
    this.lastTransformDetail = event.detail.value;
  },
  confirm(event) {
    this.lastConfirmDetail = { value: event.detail.value };
  },
  zero(event) {
    this.lastZeroDetail = event.detail.value;
  },
  bubbleParent(event) {
    this.lastBubble = { type: event.type, value: event.detail.value };
  },
  submit(event) {
    const values = event.detail.value;

    this.record("input.detail", this.lastInputDetail);
    this.record("form.text", values.fruit);
    this.record("form.radio", values.color);
    this.record("form.checkbox", values.parts);
    this.record("form.switch", values.enabled);
    this.record("form.custom-field", values.customField);
  },
  submitReset(event) {
    this.record("form.reset-defaults", event.detail.value);
  },
  recordCursor() {
    this.record("input.cursor-insert", this.lastCursorDetail);
  },
  recordTransform(display) {
    this.record("input.return-ignored", { display, detail: this.lastTransformDetail });
  },
  recordConfirm() {
    this.record("input.confirm", this.lastConfirmDetail);
  },
  recordZero(display) {
    this.record("input.maxlength-zero", display);
  },
  recordKeep(readings) {
    this.record("input.keeps-typed-value", readings);
  },
  recordBubble() {
    this.record("input.bubbles-parent", this.lastBubble || null);
  },
  keepNoise() {
    this.setData({ keepNoise: (this.data.keepNoise || 0) + 1 });
  },
  keepExplicit() {
    this.setData({ keepValue: "explicit" });
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
