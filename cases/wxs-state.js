const { update, query } = require("./support");
const { isolatedNavigation } = require("./route-harness");

// counter.wxs keeps one module-level variable. setValue(next) writes it and is
// idempotent for a repeated render with the same argument, so a wxs call that the
// framework re-runs on every render pass cannot drift the observed value. The probe
// loads the module twice: "shared" writes through the first tag, "mirror" reads
// through the second, so reading through one tag observes the other tag's writes
// only when both tags share one module instance. A probe mounted with mode="read"
// never calls setValue and only observes its module instance.
async function wxsState(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, { wxsMounted: true });
        const first = page.selectComponent("#wxs-probe-a");
        const second = page.selectComponent("#wxs-probe-b");
        return await exercise(first, second);
      } finally {
        await update(page, { wxsMounted: false, wxsProbeMode: "write" });
      }
    });
  }
  const read = async (instance, selector) =>
    (await query(instance, selector, { dataset: true })).dataset.value;

  await isolated("wxs.state.same-template-shared", [4, 4], async (first) => {
    await update(first, { step: 4 });
    const written = await read(first, "#probe-write");
    await update(first, { refresh: 1 });
    return [written, await read(first, "#probe-read")];
  });

  await isolated("wxs.state.instance-isolated", [4, 0], async (first, second) => {
    await update(first, { step: 4 });
    return [await read(first, "#probe-write"), await read(second, "#probe-read")];
  });

  await isolated("wxs.state.persist-across-renders", [3, 3, 3], async (first) => {
    await update(first, { step: 3 });
    const written = await read(first, "#probe-write");
    await update(first, { refresh: 1 });
    return [
      written,
      await read(first, "#probe-write"),
      await read(first, "#probe-read"),
    ];
  });

  await isolated("wxs.state.remount-fresh", [9, 0], async () => {
    const before = page.selectComponent("#wxs-probe-a");
    await update(before, { step: 9 });
    const previous = await read(before, "#probe-write");
    await update(page, { wxsMounted: false });
    await update(page, { wxsMounted: true, wxsProbeMode: "read" });
    const remounted = page.selectComponent("#wxs-probe-a");
    return [previous, await read(remounted, "#probe-read")];
  });

  await isolated("wxs.state.page-component-isolated", [6, 0], async (_, second) => {
    await update(page, { wxsPageStep: 6 });
    const pageValue = await read(page, "#page-counter");
    return [pageValue, await read(second, "#probe-read")];
  });

  await isolatedNavigation(
    check,
    "wxs.state.page-fresh-and-retained",
    [0, 7, 7],
    async ({ open, navigate }) => {
      await update(page, { wxsPageStep: 7 });
      const written = await query(page, "#page-counter", { dataset: true });
      const opened = await open("alpha");
      const fresh = await query(opened, "#next-counter", { dataset: true });
      await navigate("navigateBack", { delta: 1 }, "pages/suite/index");
      const retained = await query(page, "#page-counter", { dataset: true });
      return [fresh.dataset.value, written.dataset.value, retained.dataset.value];
    },
  );
}
module.exports = { wxsState };
