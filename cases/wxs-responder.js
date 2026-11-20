const { update, query, waitUntil } = require("./support");

// WXS change:prop observer and ownerInstance DOM/method/event bridge.
async function wxsResponder(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      page.wxsNotifyTrace = [];
      try {
        await update(page, {
          wxsResponderStep: 1,
          wxsResponderPayload: null,
          wxsResponderMounted: true,
        });
        const probe = page.selectComponent("#wxs-responder");
        return await exercise(probe);
      } finally {
        await update(page, {
          wxsResponderMounted: false,
          wxsResponderStep: 1,
          wxsResponderPayload: null,
        });
        delete page.wxsNotifyTrace;
      }
    });
  }

  await isolated(
    "wxs.change-prop-initial-and-update",
    [
      { next: 1, prev: null },
      { next: 3, prev: 1 },
    ],
    async (probe) => {
      await waitUntil(() => probe.stepLog.length >= 1, { timeout: 3000 });
      const initial = probe.stepLog[0];
      await update(page, { wxsResponderStep: 3 });
      await waitUntil(() => probe.stepLog.some((entry) => entry.next === 3), { timeout: 3000 });
      const updated = probe.stepLog.find((entry) => entry.next === 3);
      return [
        { next: initial.next, prev: initial.prev },
        { next: updated.next, prev: updated.prev },
      ];
    },
  );

  await isolated("wxs.owner-call-method", { next: 4, prev: 1 }, async (probe) => {
    await waitUntil(() => probe.stepLog.length >= 1, { timeout: 3000 });
    await update(page, { wxsResponderStep: 4 });
    await waitUntil(() => probe.stepLog.some((entry) => entry.next === 4), { timeout: 3000 });
    const entry = probe.stepLog.find((item) => item.next === 4);
    return { next: entry.next, prev: entry.prev };
  });

  await isolated("wxs.owner-set-style", [30, 50], async (probe) => {
    await waitUntil(() => probe.stepLog.length >= 1, { timeout: 3000 });
    await waitUntil(async () => (await query(probe, "#box", { size: true })).width === 30, {
      timeout: 3000,
    });
    const first = (await query(probe, "#box", { size: true })).width;
    await update(page, { wxsResponderStep: 3 });
    await waitUntil(async () => (await query(probe, "#box", { size: true })).width === 50, {
      timeout: 3000,
    });
    const second = (await query(probe, "#box", { size: true })).width;
    return [first, second];
  });

  await isolated(
    "wxs.owner-class-toggle",
    [
      [15, false],
      [55, true],
      [15, false],
    ],
    async (probe) => {
      await waitUntil(() => probe.classLog.length >= 1, { timeout: 3000 });
      const w1 = (await query(probe, "#flag", { size: true })).width;
      const c1 = probe.classLog[probe.classLog.length - 1];

      await update(page, { wxsResponderStep: 2 });
      await waitUntil(
        async () =>
          probe.classLog.length >= 2 && (await query(probe, "#flag", { size: true })).width === 55,
        { timeout: 3000 },
      );
      const w2 = (await query(probe, "#flag", { size: true })).width;
      const c2 = probe.classLog[probe.classLog.length - 1];

      await update(page, { wxsResponderStep: 0 });
      await waitUntil(
        async () =>
          probe.classLog.length >= 3 && (await query(probe, "#flag", { size: true })).width === 15,
        { timeout: 3000 },
      );
      const w3 = (await query(probe, "#flag", { size: true })).width;
      const c3 = probe.classLog[probe.classLog.length - 1];

      return [
        [w1, c1],
        [w2, c2],
        [w3, c3],
      ];
    },
  );

  await isolated("wxs.owner-get-dataset-and-state", ["wxs-tag", 7, true], async (probe) => {
    await waitUntil(() => probe.stepLog.length >= 1, { timeout: 3000 });
    const firstHits = probe.stepLog[probe.stepLog.length - 1].hits;
    await update(page, { wxsResponderStep: 3 });
    await waitUntil(() => probe.stepLog.some((entry) => entry.next === 3), { timeout: 3000 });
    const entry = probe.stepLog.find((item) => item.next === 3);
    return [entry.tag, entry.num, entry.hits > firstHits];
  });

  await isolated("wxs.owner-select-all-components", [20, 30, 40], async (probe) => {
    await waitUntil(() => probe.stepLog.length >= 1, { timeout: 3000 });
    await update(page, { wxsResponderStep: 5 });
    await waitUntil(
      async () => {
        const boxes = await query(probe, ".wxs-chip", { size: true }, true);
        return boxes.length === 3 && Math.round(boxes[2].width) === 40;
      },
      { timeout: 3000 },
    );
    const boxes = await query(probe, ".wxs-chip", { size: true }, true);
    return boxes.map((box) => Math.round(box.width));
  });

  await isolated("wxs.owner-set-style-string", [44, 14], async (probe) => {
    await waitUntil(() => probe.stepLog.length >= 1, { timeout: 3000 });
    await update(page, { wxsResponderStep: 5 });
    await waitUntil(
      async () => Math.round((await query(probe, "#str-box", { size: true })).width) === 44,
      { timeout: 3000 },
    );
    const box = await query(probe, "#str-box", { size: true });
    return [Math.round(box.width), Math.round(box.height)];
  });

  await isolated(
    "wxs.change-prop-object-payload",
    [
      { label: "a", size: 2 },
      { label: "b", size: 5 },
    ],
    async (probe) => {
      await update(page, { wxsResponderPayload: { label: "a", size: 2 } });
      await waitUntil(
        () => probe.payloadLog.some((entry) => entry.next && entry.next.label === "a"),
        { timeout: 3000 },
      );
      await update(page, { wxsResponderPayload: { label: "b", size: 5 } });
      await waitUntil(
        () => probe.payloadLog.some((entry) => entry.next && entry.next.label === "b"),
        { timeout: 3000 },
      );
      const second = probe.payloadLog.find((entry) => entry.next && entry.next.label === "b");
      return [second.prev, second.next];
    },
  );

  await isolated("wxs.owner-trigger-event", { from: "wxs", step: 5 }, async (probe) => {
    await waitUntil(() => probe.stepLog.length >= 1, { timeout: 3000 });
    await update(page, { wxsResponderStep: 5 });
    await waitUntil(() => page.wxsNotifyTrace.length >= 1, { timeout: 3000 });
    return page.wxsNotifyTrace[0];
  });
}

module.exports = { wxsResponder };
