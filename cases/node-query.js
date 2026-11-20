const { update, waitUntil } = require("./support");

function execQuery(page, setup) {
  return new Promise((resolve) => {
    const q = page.createSelectorQuery();
    setup(q);
    q.exec(resolve);
  });
}

// Modern SelectorQuery APIs: node() (ScrollViewContext), context() (VideoContext),
// computedStyle, scrollOffset, mark field and selectAll boundingClientRect ordering.
async function nodeQueryContract(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      page.nodeScrollEdges = [];
      try {
        await update(page, { nodeQueryMounted: true });
        return await exercise();
      } finally {
        await update(page, { nodeQueryMounted: false });
        delete page.nodeScrollEdges;
      }
    });
  }

  await isolated("query.scroll-view-node-scroll-to", [true, 60], async () => {
    const [nodeRes] = await execQuery(page, (q) => q.select("#node-scroll").node());
    const scrollView = nodeRes && nodeRes.node;
    const hasScrollTo = !!scrollView && typeof scrollView.scrollTo === "function";
    scrollView.scrollTo({ top: 60, animated: false });
    await waitUntil(
      async () => {
        const [off] = await execQuery(page, (q) => q.select("#node-scroll").scrollOffset());
        return off && Math.round(off.scrollTop) === 60;
      },
      { timeout: 3000 },
    );
    const [offset] = await execQuery(page, (q) => q.select("#node-scroll").scrollOffset());
    return [hasScrollTo, Math.round(offset.scrollTop)];
  });

  await isolated("query.context-video", [true, true, true, true], async () => {
    const [res] = await execQuery(page, (q) => q.select("#node-video").context());
    const ctx = res && res.context;
    return [
      !!ctx && typeof ctx.play === "function",
      !!ctx && typeof ctx.pause === "function",
      !!ctx && typeof ctx.seek === "function",
      !!ctx && typeof ctx.stop === "function",
    ];
  });

  await isolated(
    "query.computed-style-and-rect",
    [72, 28, "block", "relative", "rgb(18, 52, 86)", "6px", "3"],
    async () => {
      const [res] = await execQuery(page, (q) =>
        q.select("#node-styled").fields({
          size: true,
          rect: true,
          computedStyle: ["display", "position", "backgroundColor", "borderRadius", "zIndex"],
        }),
      );
      return [
        Math.round(res.width),
        Math.round(res.height),
        res.display,
        res.position,
        res.backgroundColor,
        res.borderRadius,
        String(res.zIndex),
      ];
    },
  );

  await isolated("query.scroll-offset-and-viewport", [true, true, 0, 0], async () => {
    const [viewport, box] = await execQuery(page, (q) => {
      q.selectViewport().scrollOffset();
      q.select("#node-scroll").scrollOffset();
    });
    return [
      typeof viewport.scrollTop === "number",
      typeof viewport.scrollLeft === "number",
      Math.round(box.scrollTop),
      Math.round(box.scrollLeft),
    ];
  });

  await isolated(
    "query.mark-field",
    ["node-marked", "probe-data", { zone: "query", role: "leaf" }],
    async () => {
      const [res] = await execQuery(page, (q) =>
        q.select("#node-marked").fields({ id: true, dataset: true, mark: true }),
      );
      return [res.id, res.dataset.label, res.mark];
    },
  );

  await isolated("query.select-all-order-and-rect", [3, [12, 12, 12], [12, 12]], async () => {
    const [rects] = await execQuery(page, (q) => q.selectAll(".q-box").boundingClientRect());
    return [
      rects.length,
      rects.map((r) => Math.round(r.height)),
      [Math.round(rects[1].top - rects[0].top), Math.round(rects[2].top - rects[1].top)],
    ];
  });
}

module.exports = { nodeQueryContract };
