// Lists the cells of one simulator capture that carry a picture of their own, as a
// comma-separated --only value for the repeat captures.
//
//   node tools/visual/select.cjs raw-1/
const fs = require("fs");
const path = require("path");
const lib = require("./lib.cjs");

const dir = process.argv[2];
const heights = JSON.parse(fs.readFileSync(path.join(dir, "stage.json"), "utf8"));
const images = {};
for (const key of Object.keys(heights)) images[key] = lib.normalize(path.join(dir, key + ".png"), heights[key]);
const defaults = Object.fromEntries(Object.entries(images).filter(([key]) => !key.startsWith("state.")));
const kept = [];
const reasons = {};
for (const [key, image] of Object.entries(images)) {
  const reason = lib.redundancy(key, image, defaults);
  if (reason) reasons[reason] = (reasons[reason] || 0) + 1;
  else kept.push(key);
}
console.error(kept.length + " of " + Object.keys(images).length + " cells kept; dropped " + JSON.stringify(reasons));
console.log(kept.join(","));
