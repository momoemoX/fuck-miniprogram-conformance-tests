const { update, query, waitUntil } = require("./support");

// WXS change:prop observer and ownerInstance DOM/method bridge.
async function wxsResponder(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, { wxsResponderStep: 1, wxsResponderMounted: true });
        const probe = page.selectComponent("#wxs-responder");
        return await exercise(probe);
      } finally {
        await update(page, { wxsResponderMounted: false, wxsResponderStep: 1 });
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
      return [initial, updated];
    },
  );

  await isolated("wxs.owner-call-method", { next: 4, prev: 1 }, async (probe) => {
    await waitUntil(() => probe.stepLog.length >= 1, { timeout: 3000 });
    await update(page, { wxsResponderStep: 4 });
    await waitUntil(() => probe.stepLog.some((entry) => entry.next === 4), { timeout: 3000 });
    return probe.stepLog.find((entry) => entry.next === 4);
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
}

module.exports = { wxsResponder };
