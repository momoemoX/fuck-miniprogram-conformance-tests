const { update, query } = require("./support");
const { isolatedNavigation } = require("./route-harness");

async function componentExtra(page, check) {
  // pageLifetimes reports through the app so the trace survives page switches.
  await isolatedNavigation(
    check,
    "component.page-lifetimes",
    ["hide", "show"],
    async ({ open, navigate }) => {
      const app = getApp();
      app.pageLifetimeTrace = [];
      try {
        await update(page, { plpMounted: true });
        // A show fired while attaching belongs to the mount, not to a page switch.
        app.pageLifetimeTrace = [];
        await open("alpha");
        await navigate("navigateBack", { delta: 1 }, "pages/suite/index");
        return app.pageLifetimeTrace.slice();
      } finally {
        await update(page, { plpMounted: false });
        delete app.pageLifetimeTrace;
      }
    },
  );

  await check("slot.multi-instance-order", ["first", "second"], async () => {
    try {
      await update(page, { multiSlotMounted: true, multiSlotItems: ["first", "second"] });
      const values = await query(page, ".multi-slot-item", { dataset: true }, true);
      return values.map((node) => node.dataset.value);
    } finally {
      await update(page, { multiSlotMounted: false, multiSlotItems: [] });
    }
  });
}
module.exports = { componentExtra };
