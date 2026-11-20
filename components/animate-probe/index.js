Component({
  methods: {
    runKeyframe() {
      return new Promise((resolve) => {
        this.animate(
          "#comp-kf",
          [
            { width: "24px", opacity: 1 },
            { width: "72px", opacity: 0.5 },
          ],
          60,
          resolve,
        );
      });
    },
    clearKeyframe() {
      return new Promise((resolve) => {
        this.clearAnimation("#comp-kf", { width: true, opacity: true }, resolve);
      });
    },
  },
});
