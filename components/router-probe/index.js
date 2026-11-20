// Navigates through this.router (relative to this component's path) or this.pageRouter
// (relative to the owning page's path) and reports how the call settled.
Component({
  methods: {
    go(kind, url) {
      return new Promise((resolve) => {
        this[kind].navigateTo({
          url,
          success: () => resolve("success"),
          fail: (error) => resolve("fail:" + Boolean(error && error.errMsg)),
        });
      });
    },
  },
});
