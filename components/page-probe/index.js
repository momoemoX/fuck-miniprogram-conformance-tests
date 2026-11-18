Component({
  pageLifetimes: {
    show() {
      this.report("show");
    },
    hide() {
      this.report("hide");
    },
  },
  methods: {
    report(event) {
      const app = getApp();
      if (app && app.pageLifetimeTrace) app.pageLifetimeTrace.push(event);
    },
    identity() {
      return { is: this.is, id: this.id, origin: this.dataset.origin };
    },
  },
});
