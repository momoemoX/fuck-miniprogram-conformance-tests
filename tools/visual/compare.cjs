// Compares an implementation's gallery screenshots with the committed references.
//
//   node tools/visual/compare.cjs --candidate shots/ [--out diff/] [--json report.json]
//
// shots/ holds one screenshot of pages/gallery/index?cell=<cell> per reference, named
// <key>.png, taken in any way the implementation's host allows. Each must show the
// whole calibration square and stage; device frames, zoom, pixel ratio and Display-P3
// encoding are handled. A reference passes when the differing share of drawn pixels,
// the count of local 4x4 defects and the reference's colour palette all stay within the
// limits recorded for it.
const fs = require("fs");
const path = require("path");
const lib = require("./lib.cjs");

function option(name, fallback) {
  const index = process.argv.indexOf("--" + name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const candidate = option("candidate", null);
if (!candidate) {
  console.error("Pass --candidate <directory of screenshots>.");
  process.exit(2);
}
const diffDir = option("out", null);
// How far the drawn area of a text-only cell may move, in CSS pixels.
const GLYPH_BOX = 3;
const jsonOut = option("json", null);
const references = path.resolve(__dirname, "../../fixtures/visual");
const { references: manifest } = JSON.parse(fs.readFileSync(path.join(references, "manifest.json"), "utf8"));
if (diffDir) fs.mkdirSync(diffDir, { recursive: true });

const results = [];
for (const [key, entry] of Object.entries(manifest)) {
  const shot = path.join(candidate, key + ".png");
  const result = { id: "visual." + key, cell: entry.cell, tolerance: entry.tolerance };
  if (!fs.existsSync(shot)) {
    results.push({ ...result, status: "MISSING" });
    continue;
  }
  try {
    const reference = lib.readPlain(path.join(references, key + ".png"));
    const actual = lib.normalize(shot, entry.height);
    const { ratio, blocks, missing, diff } = lib.compare(reference, actual);
    const problems = [];
    if (entry.glyphs) {
      // Text in the platform's own font: glyph pixels cannot be compared across
      // platforms, so the drawn area must sit in the same place within a few pixels.
      const expected = lib.inkBox(reference);
      const found = lib.inkBox(actual);
      const off = found
        ? Math.max(...["left", "top", "right", "bottom"].map((side) => Math.abs(found[side] - expected[side])))
        : Infinity;
      if (off > GLYPH_BOX) problems.push("drawn area off by " + off + "px (limit " + GLYPH_BOX + "px)");
    } else {
      if (ratio > entry.tolerance) {
        problems.push((ratio * 100).toFixed(1) + "% of drawn pixels differ (limit " + (entry.tolerance * 100).toFixed(1) + "%)");
      }
      if (blocks > entry.blocks) problems.push(blocks + " local defects (limit " + entry.blocks + ")");
    }
    if (entry.palette && missing.length) problems.push("missing colours " + missing.join(" "));
    const passed = problems.length === 0;
    results.push({
      ...result,
      status: passed ? "PASS" : "FAIL",
      ratio: Number(ratio.toFixed(4)),
      blocks,
      missing,
      problems,
    });
    if (diffDir && !passed) {
      lib.write(path.join(diffDir, key + ".actual.png"), actual);
      lib.write(path.join(diffDir, key + ".diff.png"), diff);
    }
  } catch (error) {
    results.push({ ...result, status: "ERROR", error: String(error.message || error) });
  }
}

const passed = results.filter((result) => result.status === "PASS").length;
console.log(passed + "/" + results.length + " visual references matched");
for (const result of results) {
  if (result.status === "PASS") continue;
  const detail = result.problems ? result.problems.join("; ") : result.error || "";
  console.log(result.status + " " + result.id + " " + detail);
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ passed, total: results.length, results }, null, 2));
process.exitCode = passed === results.length ? 0 : 1;
