// Report source references separately from runtime results and interface availability.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const baseline = require("../fixtures/baseline-surface");
const catalog = require("../fixtures/api-surface");
const reference = require("../fixtures/reference");
function sources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(name) : entry.name.endsWith(".js") ? [name] : [];
  });
}
const sourceFiles = ["cases", "pages", "components", "workers"]
  .flatMap((dir) => sources(path.join(root, dir)))
  .filter((file) => !file.includes(path.join("pages", "surface")));
const usage = {};
for (const [group, receiver] of [
  ["Wx", "wx"],
  ["FileSystemManager", "fs"],
]) {
  const byName = Object.fromEntries(baseline[group].map((name) => [name, []]));
  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, "utf8");
    const patterns = [
      new RegExp("\\b" + receiver + "\\.(\\w+)", "g"),
      new RegExp("\\bcall\\(\\s*" + receiver + "\\s*,\\s*[\"'](\\w+)[\"']", "g"),
    ];
    const seen = new Set(
      patterns.flatMap((pattern) => Array.from(source.matchAll(pattern), (m) => m[1])),
    );
    for (const name of seen)
      if (Object.hasOwn(byName, name)) byName[name].push(path.relative(root, file));
  }
  usage[group] = byName;
}
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ target: baseline.sdk, usage }, null, 2));
} else {
  console.log(
    "Target " +
      baseline.sdk +
      " | " +
      Object.keys(reference).length +
      " reproduced expected values",
  );
  for (const [group, entries] of Object.entries(usage)) {
    const missing = Object.keys(entries).filter((name) => !entries[name].length);
    console.log(
      group +
        ": " +
        (Object.keys(entries).length - missing.length) +
        "/" +
        Object.keys(entries).length +
        " observed names referenced in source; " +
        catalog[group].length +
        " catalog names",
    );
    console.log("Without a direct reference: " + missing.join(", "));
  }
}
