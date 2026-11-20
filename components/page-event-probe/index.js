Component({
  properties: { tag: String },
  pageLifetimes: {
    resize(size) {
      const app = getApp();
      if (app.pageEventTrace) {
        const width = size && size.size ? size.size.windowWidth : null;
        const height = size && size.size ? size.size.windowHeight : null;
        app.pageEventTrace.push([this.data.tag, "resize", width > height ? "landscape" : "portrait"]);
      }
    },
    routeDone() {
      const app = getApp();
      if (app.pageEventTrace) app.pageEventTrace.push([this.data.tag, "routeDone"]);
    },
  },
});
