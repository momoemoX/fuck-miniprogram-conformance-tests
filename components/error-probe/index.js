Component({
  data: { wired: "" },
  observers: {
    wired(value) {
      if (value === "throw-observer") throw new Error("suite-observer-marker");
    },
  },
  lifetimes: {
    error(error) {
      if (this.errorCapture) {
        this.errorCapture.push(
          error && typeof error === "object" ? String(error.message || error) : String(error),
        );
      }
    },
    detached() {
      if (this.throwOnDetach) throw new Error("suite-detach-marker");
    },
  },
  methods: {
    triggerBoom() {
      this.triggerEvent("boom", { value: "boom" }, { bubbles: true });
    },
  },
});
