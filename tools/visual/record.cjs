// Records the committed visual references from three simulator captures.
//
//   node tools/visual/record.cjs raw-default-1/ raw-default-2/ raw-serif/
//
// The first capture becomes the reference. The difference between the two default
// captures measures rendering noise (animations, decoding). Pixels that change in the
// serif capture depend on the platform's fonts; they are stored transparent and are not
// compared. Each reference's limits come from the remaining noise.
const fs = require("fs");
const path = require("path");
const lib = require("./lib.cjs");
const cells = require("../../fixtures/visual-cells");

const [primary, repeat, alternate] = process.argv.slice(2);
if (!alternate) {
  console.error("Pass two default-font captures and one serif capture.");
  process.exit(2);
}
// A cell whose own repeat capture differs this much is animated; it is not referenced.
const UNSTABLE = 0.25;
const FLOOR = 0.03;

const out = path.resolve(__dirname, "../../fixtures/visual");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const heights = JSON.parse(fs.readFileSync(path.join(primary, "stage.json"), "utf8"));
const manifest = {};
const skipped = {};
// Default renderings of each component, for dropping states that look the same.
const defaults = {};
for (const key of Object.keys(cells)) {
  if (!key.startsWith("state.") && fs.existsSync(path.join(primary, key + ".png"))) {
    defaults[key] = lib.normalize(path.join(primary, key + ".png"), heights[key]);
  }
}
for (const key of Object.keys(cells)) {
  const file = (dir) => path.join(dir, key + ".png");
  if (!fs.existsSync(file(primary))) {
    skipped[key] = "not captured";
    continue;
  }
  const height = heights[key];
  const reference = lib.normalize(file(primary), height);
  const reason = lib.redundancy(key, reference, defaults);
  if (reason) {
    skipped[key] = reason;
    continue;
  }
  if (![repeat, alternate].every((dir) => fs.existsSync(file(dir)))) {
    skipped[key] = "missing repeat capture";
    continue;
  }
  const serifImage = lib.normalize(file(alternate), height);
  // Font-dependent pixels (glyphs and what they push around) become transparent in the
  // stored reference and are not compared; the rest of the cell stays strict.
  const masked = lib.fontMask(reference, serifImage);
  const again = lib.compare(masked, lib.normalize(file(repeat), height));
  const serif = lib.compare(masked, serifImage);
  const noise = again.ratio;
  if (noise > UNSTABLE) {
    skipped[key] = "animated: repeat captures differ by " + (noise * 100).toFixed(1) + "%";
    continue;
  }
  // Text that ignores the stage font (inputs and similar keep their own font family)
  // shows no font dependence in the serif capture, so its glyphs cannot be masked; the
  // whole cell is compared loosely instead.
  const unmaskedFont = lib.compare(reference, serifImage).ratio;
  const glyphs = Boolean(cells[key].text) && unmaskedFont < 0.001;
  lib.write(path.join(out, key + ".png"), masked);
  manifest[key] = {
    cell: cells[key].cell,
    height,
    glyphs,
    tolerance: Number(Math.max(FLOOR, 2 * noise, 1.5 * serif.ratio).toFixed(4)),
    // Local defects and missing colours are only asserted as far as the baseline's own
    // repeat and serif captures stay clean of them.
    blocks: Math.max(again.blocks, serif.blocks),
    palette: again.missing.length === 0 && serif.missing.length === 0,
    noise: Number(noise.toFixed(4)),
    fontNoise: Number(unmaskedFont.toFixed(4)),
  };
}
fs.writeFileSync(
  path.join(out, "manifest.json"),
  JSON.stringify({ stageWidth: lib.STAGE.width, references: manifest, skipped }, null, 2) + "\n",
);
console.log(Object.keys(manifest).length + " references, " + Object.keys(skipped).length + " skipped → " + out);
for (const [key, reason] of Object.entries(skipped)) console.log("  skipped " + key + ": " + reason);
