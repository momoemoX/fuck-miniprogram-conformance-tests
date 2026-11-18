const { update, query } = require("./support");

async function templateContract(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, { templateMounted: true });
        const probe = page.selectComponent("#template-probe");
        const values = async (selector) =>
          (await query(probe, selector, { dataset: true }, true)).map((node) => node.dataset.value);
        const value = async (selector) => (await values(selector))[0];
        return await exercise(probe, values, value);
      } finally {
        await update(page, { templateMounted: false });
      }
    });
  }
  await isolated("template.branch-initial", ["zero"], (_, values) => values(".branch"));
  await isolated("template.branch-elif", ["one"], async (probe, values) => {
    await update(probe, { phase: 1 });
    return values(".branch");
  });
  await isolated("template.branch-else", ["other"], async (probe, values) => {
    await update(probe, { phase: 2 });
    return values(".branch");
  });
  await isolated("template.branch-reentry", [["one"], ["zero"]], async (probe, values) => {
    await update(probe, { phase: 1 });
    const middle = await values(".branch");
    await update(probe, { phase: 0 });
    return [middle, await values(".branch")];
  });
  await isolated("template.loop-custom-names", ["0:a:pear", "1:b:plum"], (_, values) =>
    values(".entry"),
  );
  await isolated("template.loop-item-path", ["0:a:lime", "1:b:plum"], async (probe, values) => {
    await update(probe, { "entries[0].label": "lime" });
    return values(".entry");
  });
  await isolated("template.loop-keyed-reorder", ["0:b:plum", "1:a:pear"], async (probe, values) => {
    await update(probe, { entries: [probe.data.entries[1], probe.data.entries[0]] });
    return values(".entry");
  });
  await isolated("template.loop-empty", [], async (probe, values) => {
    await update(probe, { entries: [] });
    return values(".entry");
  });
  await isolated("template.loop-regrow", ["0:c:fig"], async (probe, values) => {
    await update(probe, { entries: [] });
    await update(probe, { entries: [{ code: "c", label: "fig" }] });
    return values(".entry");
  });
  await isolated(
    "template.loop-nested-scope",
    ["north:0:2", "north:1:3", "south:0:5"],
    (_, values) => values(".nested"),
  );
  await isolated(
    "template.loop-nested-path",
    ["north:0:2", "north:1:8", "south:0:5"],
    async (probe, values) => {
      await update(probe, { "groups[0].items[1]": 8 });
      return values(".nested");
    },
  );
  await isolated("template.loop-object-keys", ["left:4", "right:9"], async (_, values) =>
    (await values(".dictionary")).sort(),
  );
  await isolated("template.argument-scope", ["inner/2"], (_, values) => values(".badge"));
  await isolated("template.argument-update", ["renamed/2"], async (probe, values) => {
    await update(probe, { "payload.title": "renamed" });
    return values(".badge");
  });
  await isolated("template.dynamic-selection", ["2:inner"], async (probe, values) => {
    await update(probe, { templateName: "alternate" });
    return values(".badge");
  });
  await isolated("template.include-data", "revised", async (probe, _, value) => {
    await update(probe, { title: "revised" });
    return value("#included");
  });
  await isolated("expression.arithmetic", 14, (_, __, value) => value("#arithmetic"));
  await isolated("expression.ternary", ["no", "yes"], async (probe, _, value) => {
    const before = await value("#ternary");
    await update(probe, { flag: true });
    return [before, await value("#ternary")];
  });
  await isolated("expression.logical-fallback", "alpha", (_, __, value) => value("#logical"));
  await isolated("expression.boolean-negation", true, (_, __, value) => value("#not"));
  await isolated("expression.comparisons", true, (_, __, value) => value("#comparison"));
  await isolated("expression.braces-in-string", "left}}right", (_, __, value) => value("#literal"));
  await isolated("expression.absent-deep-path", "fallback", (_, __, value) => value("#missing"));
  await isolated("wxs.required-module", "seed/3", (_, __, value) => value("#description"));
  await isolated(
    "wxs.input-copy",
    ["local/10", { items: [1, 2], name: "seed" }],
    async (probe, _, value) => [
      await value("#copy"),
      { items: probe.data.copySample.items.slice(), name: probe.data.copySample.name },
    ],
  );
  await isolated("wxs.string-methods", "BLUE/GREEN", async (probe, _, value) => {
    await update(probe, { word: " blue-green " });
    return value("#normalized");
  });
  await isolated("wxs.date-epoch", 0, (_, __, value) => value("#date-epoch"));
  await isolated("wxs.regexp-match", [false, true, false], async (probe, _, value) => {
    const results = [await value("#regex")];
    await update(probe, { word: "a123" });
    results.push(await value("#regex"));
    await update(probe, { word: "a123z" });
    results.push(await value("#regex"));
    return results;
  });
  await isolated("wxs.object-replacement", "seed/6", async (probe, _, value) => {
    await update(probe, { sample: { items: [1, 5], name: "seed" } });
    return value("#description");
  });
  await isolated("wxs.object-argument-path-update", [5, "seed/3"], async (probe, _, value) => {
    await update(probe, { "sample.items[1]": 5 });
    return [await value("#direct-item"), await value("#description")];
  });
}
module.exports = { templateContract };
