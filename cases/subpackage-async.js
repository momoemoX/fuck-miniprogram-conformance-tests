const { update, query, waitUntil } = require("./support");

// Subpackage async loading: require.async and componentPlaceholder.
async function subpackageAsync(page, check) {
  await check("subpackage.require-async", ["pack-async", 21], async () => {
    const mod = await require.async("../pack/async-mod.js");
    return [mod.tag, mod.calc(7)];
  });

  await check("subpackage.component-placeholder", ["pack-widget-ready", "pack-widget-ready"], async () => {
    try {
      await update(page, { asyncWidgetMounted: true });
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
      await update(page, { asyncWidgetMounted: false });
    }
  });
}

module.exports = { subpackageAsync };
