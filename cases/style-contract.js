const { update } = require("./support");

async function widthIn(page, component, selector) {
  const rect = await new Promise((resolve) => {
    const query = page.createSelectorQuery();
    (component ? query.in(component) : query).select(selector).boundingClientRect(resolve).exec();
  });
  return rect ? Math.round(rect.width) : null;
}

async function withStyleFixtures(page, run) {
  try {
    await update(page, { styleGapMounted: true });
    return await run();
  } finally {
    await update(page, { styleGapMounted: false });
  }
}

async function styleContract(page, check) {
  await check("style.host-selector", 37, () =>
    withStyleFixtures(page, () => widthIn(page, null, "#host-style-probe")),
  );

  // The page passes ext-pass-width to ext-bar's bar-class, which forwards it to ext-foo's my-class.
  await check("style.external-class-forwarded-two-levels", 41, () =>
    withStyleFixtures(page, () => {
      const foo = page.selectComponent("#ext-bar").selectComponent("#ext-foo");
      return widthIn(page, foo, "#ext-foo-view");
    }),
  );

  // ~ references a page style class and ^ a parent component style class from an isolated component.
  await check("style.page-and-parent-class-references", [43, 47], () =>
    withStyleFixtures(page, async () => {
      const parent = page.selectComponent("#caret-parent");
      const child = parent.selectComponent("#caret-child");
      return [await widthIn(page, parent, "#tilde-view"), await widthIn(page, child, "#caret-view")];
    }),
  );

  await check("style.wxss-import", [51, 53], () =>
    withStyleFixtures(page, async () => {
      const probe = page.selectComponent("#import-probe");
      return [await widthIn(page, probe, "#imp-base"), await widthIn(page, probe, "#imp-override")];
    }),
  );
}

module.exports = { styleContract };
