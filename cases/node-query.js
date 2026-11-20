const { update, waitUntil } = require("./support");

function execQuery(page, setup) {
  return new Promise((resolve) => {
    const q = page.createSelectorQuery();
    setup(q);
    q.exec(resolve);
  });
}

// Modern SelectorQuery APIs: node() (ScrollViewContext), context() (VideoContext),
// computedStyle, scrollOffset, mark field, scope isolation and selectAll ordering.
async function nodeQueryContract(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      page.nodeScrollEdges = [];
      try {
        await update(page, {
          nodeQueryMounted: true,
          qSwitchChecked: false,
          qSliderVal: 20,
          nodeScrollIntoX: "",
        });
        return await exercise();
      } finally {
        await update(page, {
          nodeQueryMounted: false,
          qSwitchChecked: false,
          qSliderVal: 20,
          nodeScrollIntoX: "",
        });
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

  await isolated("query.in-component-scope-isolation", [null, 24, null], async () => {
    try {
      await update(page, { animateMounted: true });
      const comp = page.selectComponent("#animate-probe");
      const [pageFromComp, selfFromComp] = await new Promise((resolve) => {
        wx.createSelectorQuery()
          .in(comp)
          .select("#node-styled")
          .fields({ id: true })
          .select("#comp-kf")
          .fields({ size: true })
          .exec(resolve);
      });
      const [compFromPage] = await execQuery(page, (q) => q.select("#comp-kf").fields({ id: true }));
      return [pageFromComp, selfFromComp ? Math.round(selfFromComp.width) : null, compFromPage];
    } finally {
      await update(page, { animateMounted: false });
    }
  });

  await isolated("query.missing-select-vs-select-all", [null, []], async () => {
    const [single, all] = await execQuery(page, (q) => {
      q.select("#definitely-no-such-node").fields({ id: true });
      q.selectAll(".definitely-no-such-class").fields({ id: true });
    });
    return [single, all];
  });

  await isolated("query.native-properties-dynamic-sync", [[false, 20], [true, 75]], async () => {
    const readPair = async () => {
      const [sw, sl] = await execQuery(page, (q) => {
        q.select("#q-switch").fields({ properties: ["checked"] });
        q.select("#q-slider").fields({ properties: ["value"] });
      });
      return [sw.checked, sl.value];
    };
    const before = await readPair();
    await update(page, { qSwitchChecked: true, qSliderVal: 75 });
    const after = await readPair();
    return [before, after];
  });

  await isolated("query.mixed-batch-exec-order", [4, 72, true, 3, null], async () => {
    const rows = await execQuery(page, (q) => {
      q.select("#node-styled").boundingClientRect();
      q.selectViewport().scrollOffset();
      q.selectAll(".q-box").boundingClientRect();
      q.select("#missing-batch-node").fields({ id: true });
    });
    return [
      rows.length,
      Math.round(rows[0].width),
      typeof rows[1].scrollTop === "number",
      rows[2].length,
      rows[3],
    ];
  });

  await isolated("query.scroll-view-horizontal-scroll-to", [true, 50], async () => {
    const [nodeRes] = await execQuery(page, (q) => q.select("#node-scroll-x").node());
    const scrollView = nodeRes && nodeRes.node;
    const hasScrollTo = !!scrollView && typeof scrollView.scrollTo === "function";
    scrollView.scrollTo({ left: 50, animated: false });
    await waitUntil(
      async () => {
        const [off] = await execQuery(page, (q) => q.select("#node-scroll-x").scrollOffset());
        return off && Math.round(off.scrollLeft) === 50;
      },
      { timeout: 3000 },
    );
    const [offset] = await execQuery(page, (q) => q.select("#node-scroll-x").scrollOffset());
    return [hasScrollTo, Math.round(offset.scrollLeft)];
  });

  await isolated("query.dataset-order-on-select-all", [[1, 2, 3], [30, 30, 30]], async () => {
    const [rows] = await execQuery(page, (q) =>
      q.selectAll(".q-box").fields({ dataset: true, size: true }),
    );
    return [
      rows.map((r) => r.dataset.idx),
      rows.map((r) => Math.round(r.width)),
    ];
  });
}

module.exports = { nodeQueryContract };
