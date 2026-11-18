const { update } = require("./support");

async function reuseContract(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, { reuseMounted: true });
        return await exercise(page.selectComponent("#reuse-list"));
      } finally {
        await update(page, { reuseMounted: false });
      }
    });
  }
  const keyed = (parent) => parent.selectAllComponents(".keyed");
  const positional = (parent) => parent.selectAllComponents(".position");
  const codes = (children) => children.map((child) => child.properties.code);
  const detached = (parent, kind) =>
    parent.transitions
      .filter((event) => event.phase === "detached" && event.kind === kind)
      .map((event) => event.code);
  const reverse = (parent) => update(parent, { rows: parent.data.rows.slice().reverse() });
  await isolated("reuse.initial-keyed-order", ["a", "b", "c"], (parent) => codes(keyed(parent)));
  await isolated("reuse.keyed-reorder-identity", [true, true, true], async (parent) => {
    const before = keyed(parent);
    await reverse(parent);
    return keyed(parent).map((child, index) => child === before[2 - index]);
  });
  await isolated(
    "reuse.keyed-state-follows-key",
    [
      ["c", "-"],
      ["b", "-"],
      ["a", "edited-a"],
    ],
    async (parent) => {
      await update(parent.selectComponent("#keyed-a"), { draft: "edited-a" });
      await reverse(parent);
      return keyed(parent).map((child) => [child.properties.code, child.data.draft]);
    },
  );
  await isolated("reuse.keyed-prepend", [true, true, true, "-"], async (parent) => {
    const before = keyed(parent);
    await update(parent, { rows: [{ code: "z", label: "New" }].concat(parent.data.rows) });
    const after = keyed(parent);
    return [
      after[1] === before[0],
      after[2] === before[1],
      after[3] === before[2],
      after[0].data.draft,
    ];
  });
  await isolated("reuse.keyed-delete", [true, true, ["b"]], async (parent) => {
    const before = keyed(parent);
    await update(parent, { rows: [parent.data.rows[0], parent.data.rows[2]] });
    const after = keyed(parent);
    return [after[0] === before[0], after[1] === before[2], detached(parent, "keyed")];
  });
  await isolated("reuse.key-change-replaces-instance", [true, true, "-", ["b"]], async (parent) => {
    const before = keyed(parent);
    await update(before[1], { draft: "edited" });
    await update(parent, { "rows[1].code": "d" });
    const after = keyed(parent);
    return [
      after[0] === before[0],
      after[1] !== before[1],
      after[1].data.draft,
      detached(parent, "keyed"),
    ];
  });
  await isolated(
    "reuse.same-key-object-replacement",
    [true, "Changed", "edited"],
    async (parent) => {
      const before = parent.selectComponent("#keyed-a");
      await update(before, { draft: "edited" });
      await update(parent, { "rows[0]": { code: "a", label: "Changed" } });
      const after = parent.selectComponent("#keyed-a");
      return [after === before, after.properties.label, after.data.draft];
    },
  );
  await isolated("reuse.keyed-label-path", [true, "Updated", "edited"], async (parent) => {
    const before = parent.selectComponent("#keyed-b");
    await update(before, { draft: "edited" });
    await update(parent, { "rows[1].label": "Updated" });
    const after = parent.selectComponent("#keyed-b");
    return [after === before, after.properties.label, after.data.draft];
  });
  await isolated("reuse.keyed-empty", [0, ["a", "b", "c"]], async (parent) => {
    await update(parent, { rows: [] });
    return [keyed(parent).length, detached(parent, "keyed").sort()];
  });
  await isolated("reuse.keyed-regrow", [true, "-"], async (parent) => {
    const previous = parent.selectComponent("#keyed-a");
    await update(previous, { draft: "edited" });
    await update(parent, { rows: [] });
    await update(parent, { rows: [{ code: "a", label: "Again" }] });
    const next = parent.selectComponent("#keyed-a");
    return [next !== previous, next.data.draft];
  });
  await isolated("reuse.unrelated-update", [true, true, true], async (parent) => {
    const before = keyed(parent);
    await update(parent, { caption: "changed" });
    return keyed(parent).map((child, index) => child === before[index]);
  });
  await isolated("reuse.position-reorder-identity", [true, true, true], async (parent) => {
    const before = positional(parent);
    await update(parent, { positions: parent.data.positions.slice().reverse() });
    return positional(parent).map((child, index) => child === before[index]);
  });
  await isolated(
    "reuse.position-state-stays-at-index",
    ["c", "a", "edited-first"],
    async (parent) => {
      const first = positional(parent)[0];
      await update(first, { draft: "edited-first" });
      await update(parent, { positions: parent.data.positions.slice().reverse() });
      const after = positional(parent)[0];
      return [after.properties.code, after.initialCode, after.data.draft];
    },
  );
  await isolated("reuse.position-prepend", [true, "z", "a", "edited"], async (parent) => {
    const first = positional(parent)[0];
    await update(first, { draft: "edited" });
    await update(parent, {
      positions: [{ code: "z", label: "New" }].concat(parent.data.positions),
    });
    const after = positional(parent)[0];
    return [after === first, after.properties.code, after.initialCode, after.data.draft];
  });
  await isolated("reuse.position-truncate", [true, true, ["c"]], async (parent) => {
    const before = positional(parent);
    await update(parent, { positions: parent.data.positions.slice(0, 2) });
    const after = positional(parent);
    return [after[0] === before[0], after[1] === before[1], detached(parent, "position")];
  });
  await isolated("reuse.keyed-append", [true, true, true, "-"], async (parent) => {
    const before = keyed(parent);
    await update(parent, { rows: parent.data.rows.concat({ code: "d", label: "Delta" }) });
    const after = keyed(parent);
    return [
      after[0] === before[0],
      after[1] === before[1],
      after[2] === before[2],
      after[3].data.draft,
    ];
  });
  await isolated(
    "reuse.condition-recreates-state",
    [true, "-", ["a", "b", "c"]],
    async (parent) => {
      const first = parent.selectComponent("#keyed-a");
      await update(first, { draft: "edited" });
      await update(parent, { visible: false });
      await update(parent, { visible: true });
      const after = parent.selectComponent("#keyed-a");
      return [after !== first, after.data.draft, detached(parent, "keyed").sort()];
    },
  );
  await isolated("reuse.hidden-preserves-state", [true, "edited", []], async (parent) => {
    const before = parent.selectComponent("#persistent");
    await update(before, { draft: "edited" });
    await update(parent, { hidden: true });
    await update(parent, { hidden: false });
    const after = parent.selectComponent("#persistent");
    return [after === before, after.data.draft, detached(parent, "persistent")];
  });
  await isolated(
    "reuse.keyed-event-position",
    { code: "c", draft: "edited-c", position: 0 },
    async (parent) => {
      await update(parent.selectComponent("#keyed-c"), { draft: "edited-c" });
      await reverse(parent);
      parent.selectComponent("#keyed-c").announce();
      return parent.lastEvent;
    },
  );
  await isolated(
    "reuse.position-event-payload",
    { code: "c", draft: "edited-first", position: 0 },
    async (parent) => {
      await update(positional(parent)[0], { draft: "edited-first" });
      await update(parent, { positions: parent.data.positions.slice().reverse() });
      positional(parent)[0].announce();
      return parent.lastEvent;
    },
  );
  await isolated("reuse.owner-after-reorder", [true, true, true], async (parent) => {
    await reverse(parent);
    return keyed(parent).map((child) => child.selectOwnerComponent() === parent);
  });
  await isolated("reuse.removed-selector", true, async (parent) => {
    await update(parent, { rows: parent.data.rows.filter((row) => row.code !== "b") });
    return parent.selectComponent("#keyed-b") == null;
  });
  await isolated("reuse.detach-once", 1, async (parent) => {
    await update(parent, { rows: parent.data.rows.filter((row) => row.code !== "b") });
    await update(parent, { rows: [] });
    return detached(parent, "keyed").filter((code) => code === "b").length;
  });
  await isolated("reuse.reinsert-key-is-fresh", [true, "-", true], async (parent) => {
    const before = keyed(parent);
    await update(before[1], { draft: "edited" });
    await update(parent, { rows: [parent.data.rows[0], parent.data.rows[2]] });
    await update(parent, {
      rows: [parent.data.rows[0], { code: "b", label: "Again" }, parent.data.rows[1]],
    });
    const after = keyed(parent);
    return [
      after[1] !== before[1],
      after[1].data.draft,
      after[0] === before[0] && after[2] === before[2],
    ];
  });
  await isolated("reuse.keys-scoped-to-loop", [true, "other-edit", "-"], async (parent) => {
    const first = parent.selectComponent("#keyed-a"),
      other = parent.selectComponent("#other-a");
    await update(other, { draft: "other-edit" });
    await reverse(parent);
    return [first !== other, other.data.draft, first.data.draft];
  });
  await isolated("reuse.move-between-loops", [true, "-", true], async (parent) => {
    const previous = parent.selectComponent("#keyed-c");
    await update(previous, { draft: "edited" });
    await update(parent, {
      rows: parent.data.rows.slice(0, 2),
      others: parent.data.others.concat({ code: "c", label: "Moved" }),
    });
    const after = parent.selectComponent("#other-c");
    return [after !== previous, after.data.draft, parent.selectComponent("#keyed-c") == null];
  });
}
module.exports = { reuseContract };
