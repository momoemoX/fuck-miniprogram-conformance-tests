const { update, query, waitUntil } = require("./support");

// Subpackage async loading: require.async, callback require(), and componentPlaceholder.
async function subpackageAsync(page, check) {
  await check("subpackage.require-async", ["pack-async", 21], async () => {
    const mod = await require.async("../pack/async-mod.js");
    return [mod.tag, mod.calc(7)];
  });

  await check("subpackage.require-callback-and-error", ["pack-async", true], async () => {
    const cbTag = await new Promise((resolve, reject) => {
      require(
        "../pack/async-mod.js",
        (mod) => resolve(mod.tag),
        (err) => reject(err),
      );
    });
    let rejected = false;
    try {
      const missingPath = "../pack/" + "does-not-exist-module.js";
      await require.async(missingPath);
    } catch {
      rejected = true;
    }
    return [cbTag, rejected];
  });

  await check("subpackage.component-placeholder", ["pack-widget-ready", "pack-widget-ready"], async () => {
    try {
      await update(page, { asyncWidgetTitle: "hello-pack", asyncWidgetMounted: true });
      await waitUntil(
        () => {
          const widget = page.selectComponent("#async-widget");
          return !!widget && typeof widget.identify === "function";
        },
        { timeout: 10000 },
      );
      const widget = page.selectComponent("#async-widget");
      const node = await query(widget, "#async-widget-node", { dataset: true });
      return [widget.identify(), node.dataset.value];
    } finally {
      await update(page, { asyncWidgetMounted: false, asyncWidgetTitle: "hello-pack" });
    }
  });

  await check(
    "subpackage.placeholder-props-and-events",
    ["hello-pack", "updated-pack", { title: "updated-pack" }],
    async () => {
      page.asyncWidgetEvents = [];
      try {
        await update(page, { asyncWidgetTitle: "hello-pack", asyncWidgetMounted: true });
        await waitUntil(
          () => {
            const widget = page.selectComponent("#async-widget");
            return !!widget && typeof widget.emitReady === "function";
          },
          { timeout: 10000 },
        );
        const widget = page.selectComponent("#async-widget");
        const firstTitle = widget.properties.title;
        await update(page, { asyncWidgetTitle: "updated-pack" });
        const secondTitle = (await query(widget, "#async-widget-node", { dataset: true })).dataset.title;
        widget.emitReady();
        return [firstTitle, secondTitle, page.asyncWidgetEvents[0] || null];
      } finally {
        await update(page, { asyncWidgetMounted: false, asyncWidgetTitle: "hello-pack" });
        delete page.asyncWidgetEvents;
      }
    },
  );
}

module.exports = { subpackageAsync };
