// Offline self-check for the committed visual references in fixtures/visual/.
//
//   node tools/visual/verify.cjs
//
// Fails if any reference:
//  - is missing or disagrees with visual-cells / manifest dimensions;
//  - carries font-mask alpha on a non-text cell;
//  - fails against itself;
//  - passes against a blank white stage (false negative);
//  - is a component state that passes against its own default rendering.
const fs = require("fs");
const path = require("path");
const lib = require("./lib.cjs");
const cells = require("../../fixtures/visual-cells");

const dir = path.resolve(__dirname, "../../fixtures/visual");
const { stageWidth, references: manifest, skipped } = JSON.parse(
  fs.readFileSync(path.join(dir, "manifest.json"), "utf8"),
);

const errors = [];
const refs = {};

for (const [key, entry] of Object.entries(manifest)) {
  if (!cells[key]) {
    errors.push(key + ": not in fixtures/visual-cells.js");
    continue;
  }
  const file = path.join(dir, key + ".png");
  if (!fs.existsSync(file)) {
    errors.push(key + ": missing PNG file");
    continue;
  }
  const ref = lib.readPlain(file);
  refs[key] = ref;
  if (ref.width !== stageWidth || ref.height !== entry.height) {
    errors.push(key + ": expected " + stageWidth + "x" + entry.height + ", got " + ref.width + "x" + ref.height);
  }
  if (!cells[key].text && lib.maskedCount(ref) > 0) {
    errors.push(key + ": non-text cell has " + lib.maskedCount(ref) + " masked pixels");
  }
  const self = lib.evaluate(ref, lib.opaque(ref), entry);
  if (!self.passed) {
    errors.push(key + ": fails against itself (" + self.problems.join("; ") + ")");
  }
  const blank = lib.evaluate(ref, lib.blankImage(ref.width, ref.height), entry);
  if (blank.passed) {
    errors.push(key + ": PASSES against a blank white image (false negative)");
  }
}

for (const [key, entry] of Object.entries(manifest)) {
  const match = /^state\.([^.]+)\./.exec(key);
  if (!match || !refs[key] || !refs[match[1]]) continue;
  const base = refs[match[1]];
  if (base.height !== refs[key].height) continue;
  const againstDefault = lib.evaluate(refs[key], lib.opaque(base), entry);
  if (againstDefault.passed) {
    errors.push(key + ": PASSES against its default (" + match[1] + ")");
  }
}

if (refs["state.button.type=warn"] && refs["state.button.type=default"]) {
  const warnAsDef = lib.evaluate(
    refs["state.button.type=warn"],
    lib.opaque(refs["state.button.type=default"]),
    manifest["state.button.type=warn"],
  );
  if (warnAsDef.passed) errors.push("state.button.type=warn: PASSES against state.button.type=default");
}

const accounted = Object.keys(manifest).length + Object.keys(skipped || {}).length;
if (accounted !== Object.keys(cells).length) {
  errors.push(
    "manifest (" +
      Object.keys(manifest).length +
      ") + skipped (" +
      Object.keys(skipped || {}).length +
      ") != visual-cells (" +
      Object.keys(cells).length +
      ")",
  );
}

if (errors.length) {
  console.error("Visual reference verification failed (" + errors.length + " issues):");
  for (const error of errors) console.error("  - " + error);
  process.exit(1);
}
console.log(
  "Verified " +
    Object.keys(manifest).length +
    " visual references (" +
    Object.keys(skipped || {}).length +
    " skipped): 0 blank false negatives, 0 redundant states.",
);
