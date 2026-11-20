// Records the committed visual references from three simulator captures.
//
//   node tools/visual/record.cjs raw-default-1/ raw-default-2/ raw-serif/
//
// The first capture becomes the reference. The difference between the two default
// captures measures rendering noise (animations, decoding). For text-bearing cells,
// pixels that change in the serif capture depend on the platform's fonts; they are
// stored transparent and are not compared. Non-text controls are never font-masked,
// and every recorded reference is verified against both a blank stage and its component
// default before being admitted to the manifest.
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
  const repeatImage = lib.normalize(file(repeat), height);
  const isText = Boolean(cells[key].text);
  const serifImage = isText ? lib.normalize(file(alternate), height) : null;
  // Only text-bearing cells are font-masked; masking non-text controls (e.g. checkbox)
  // wipes out ticks and icons shifted by the stage's serif line-height metrics.
  const masked = isText ? lib.fontMask(reference, serifImage) : lib.opaque(reference);
  const again = lib.compare(masked, repeatImage);
  const serif = isText ? lib.compare(masked, serifImage) : null;
  const noise = again.ratio;
  if (noise > UNSTABLE) {
    skipped[key] = "animated: repeat captures differ by " + (noise * 100).toFixed(1) + "%";
    continue;
  }
  const unmaskedFont = isText ? lib.compare(reference, serifImage).ratio : 0;
  // Use bounding-box (glyphs) matching when a text cell either ignores the stage font
  // (nothing could be masked) or has no unmasked ink left after font masking.
  const unmaskedInk = lib.unmaskedDrawn(masked);
  const glyphs = isText && (lib.maskedCount(masked) === 0 || unmaskedInk === 0);
  const entry = {
    cell: cells[key].cell,
    height,
    glyphs,
    tolerance: Number(Math.max(FLOOR, 2 * noise, serif ? 1.5 * serif.ratio : 0).toFixed(4)),
    // Local defects and missing colours are only asserted as far as the baseline's own
    // repeat (and for text cells, serif) captures stay clean of them.
    blocks: serif ? Math.max(again.blocks, serif.blocks) : again.blocks,
    palette: again.missing.length === 0 && (!serif || serif.missing.length === 0),
    noise: Number(noise.toFixed(4)),
    fontNoise: Number(unmaskedFont.toFixed(4)),
  };
  if (glyphs) {
    const refBox = lib.inkBox(reference);
    const repeatOff = lib.boxDiff(refBox, lib.inkBox(repeatImage));
    const serifOff = serifImage ? lib.boxDiff(refBox, lib.inkBox(serifImage)) : 0;
    entry.glyphBox = Math.max(
      lib.GLYPH_BOX,
      Number.isFinite(repeatOff) ? repeatOff : 0,
      Number.isFinite(serifOff) ? serifOff : 0,
    );
  }
  // Never admit a reference that passes on a blank white stage or cannot distinguish
  // a component state from its own default rendering under the real comparator.
  const blankCheck = lib.evaluate(masked, lib.blankImage(masked.width, masked.height), entry);
  if (blankCheck.passed) {
    skipped[key] = "indistinguishable from blank";
    continue;
  }
  const stateMatch = /^state\.([^.]+)\./.exec(key);
  const defaultImg = stateMatch && defaults[stateMatch[1]];
  if (defaultImg && defaultImg.height === height) {
    const defaultCheck = lib.evaluate(masked, defaultImg, entry);
    if (defaultCheck.passed) {
      skipped[key] = "same as the default after masking";
      continue;
    }
  }
  lib.write(path.join(out, key + ".png"), masked);
  manifest[key] = entry;
}
fs.writeFileSync(
  path.join(out, "manifest.json"),
  JSON.stringify({ stageWidth: lib.STAGE.width, references: manifest, skipped }, null, 2) + "\n",
);
console.log(Object.keys(manifest).length + " references, " + Object.keys(skipped).length + " skipped → " + out);
for (const [key, reason] of Object.entries(skipped)) console.log("  skipped " + key + ": " + reason);
