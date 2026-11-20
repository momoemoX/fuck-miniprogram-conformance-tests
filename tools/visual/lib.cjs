// Shared image handling for the visual references.
//
// Any screenshot of pages/gallery/index works: the magenta calibration square gives the
// page origin and scale, the stage is cropped from there and resampled to one pixel per
// CSS pixel, so references and candidates compare regardless of device frame, zoom or
// device pixel ratio.
const fs = require("fs");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch");

// Mirrors pages/gallery/index.wxss.
const SQUARE = { left: 8, top: 8, size: 40 };
const STAGE = { left: 0, top: 56, width: 375 };

// Strict enough to detect #f8f8f8 vs #ffffff (7/255) and light-grey spinners, while
// absorbing small cross-renderer and Display-P3 rounding differences (<= 6/255).
const MATCH_THRESHOLD = 0.025;
// Default bounding-box tolerance (in CSS pixels) for glyph-only cells.
const GLYPH_BOX = 3;

// Some hosts, including the developer-tool simulator on wide-gamut displays, write
// Display-P3 values into an untagged screenshot. sRGB magenta then reads (234, 51, 247),
// so the calibration square tells which space an image uses.
const P3_TO_SRGB = [
  [1.2249401, -0.2249404, 0],
  [-0.0420569, 1.0420571, 0],
  [-0.0196376, -0.0786361, 1.0982735],
];
const DECODE = Array.from({ length: 256 }, (_, v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
function encode(v) {
  const c = Math.max(0, Math.min(1, v));
  return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
}

function squareColor(image) {
  // Mean colour of clearly magenta pixels in either colour space.
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    const [pr, pg, pb] = [image.data[i], image.data[i + 1], image.data[i + 2]];
    if (pr > 200 && pb > 200 && pg < 90 && Math.abs(pr - pb) < 40) {
      r += pr;
      g += pg;
      b += pb;
      n++;
    }
  }
  if (!n) throw new Error("Calibration square not found");
  return [r / n, g / n, b / n];
}

function toSrgb(image) {
  const cache = new Map();
  for (let i = 0; i < image.data.length; i += 4) {
    const key = (image.data[i] << 16) | (image.data[i + 1] << 8) | image.data[i + 2];
    let rgb = cache.get(key);
    if (!rgb) {
      const l = [DECODE[image.data[i]], DECODE[image.data[i + 1]], DECODE[image.data[i + 2]]];
      rgb = P3_TO_SRGB.map((row) => encode(row[0] * l[0] + row[1] * l[1] + row[2] * l[2]));
      cache.set(key, rgb);
    }
    image.data[i] = rgb[0];
    image.data[i + 1] = rgb[1];
    image.data[i + 2] = rgb[2];
  }
}

// Reads a screenshot and returns it in sRGB.
function read(file) {
  const image = PNG.sync.read(fs.readFileSync(file));
  const [, g] = squareColor(image);
  image.colorSpace = g > 25 ? "display-p3" : "srgb";
  if (image.colorSpace === "display-p3") toSrgb(image);
  return image;
}

function readPlain(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function write(file, image) {
  fs.writeFileSync(file, PNG.sync.write(image));
}

function blankImage(width, height) {
  const image = new PNG({ width, height });
  image.data.fill(255);
  return image;
}

// How much of a pixel the magenta square covers. Its neighbours are white, so the green
// channel falls linearly from 255 (white) to 0 (magenta) across anti-aliased edges.
function coverage(image, x, y) {
  const i = (image.width * y + x) * 4;
  const [r, g, b] = [image.data[i], image.data[i + 1], image.data[i + 2]];
  if (r < 200 || b < 200) return 0;
  return Math.max(0, Math.min(1, 1 - g / 255));
}

function locateSquare(image) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (coverage(image, x, y) > 0.98) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("Calibration square not found");
  const midY = Math.round((minY + maxY) / 2);
  const midX = Math.round((minX + maxX) / 2);
  // Sum the coverage across the middle row and column, and locate the leading edge
  // from the partially covered pixel just before the first full one.
  let width = 0;
  for (let x = Math.max(0, minX - 2); x <= Math.min(image.width - 1, maxX + 2); x++) width += coverage(image, x, midY);
  let height = 0;
  for (let y = Math.max(0, minY - 2); y <= Math.min(image.height - 1, maxY + 2); y++) height += coverage(image, midX, y);
  const left = minX - (minX > 0 ? coverage(image, minX - 1, midY) : 0);
  const top = minY - (minY > 0 ? coverage(image, midX, minY - 1) : 0);
  return { left, top, scale: (width + height) / 2 / SQUARE.size };
}

// Area-averages the source region onto a grid of one pixel per CSS pixel.
function resample(image, x0, y0, scale, width, height) {
  const out = new PNG({ width, height });
  for (let ty = 0; ty < height; ty++) {
    const sy0 = y0 + ty * scale;
    const sy1 = sy0 + scale;
    for (let tx = 0; tx < width; tx++) {
      const sx0 = x0 + tx * scale;
      const sx1 = sx0 + scale;
      let r = 0,
        g = 0,
        b = 0,
        total = 0;
      for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) {
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        if (sy < 0 || sy >= image.height || wy <= 0) continue;
        for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          if (sx < 0 || sx >= image.width || wx <= 0) continue;
          const weight = wx * wy;
          const i = (image.width * sy + sx) * 4;
          r += image.data[i] * weight;
          g += image.data[i + 1] * weight;
          b += image.data[i + 2] * weight;
          total += weight;
        }
      }
      const o = (width * ty + tx) * 4;
      out.data[o] = total ? Math.round(r / total) : 255;
      out.data[o + 1] = total ? Math.round(g / total) : 255;
      out.data[o + 2] = total ? Math.round(b / total) : 255;
      out.data[o + 3] = 255;
    }
  }
  return out;
}

// Crops the stage of a gallery screenshot to `height` CSS pixels.
function normalize(file, height) {
  const image = read(file);
  const { left, top, scale } = locateSquare(image);
  const originX = left - SQUARE.left * scale;
  const originY = top - SQUARE.top * scale;
  return resample(image, originX + STAGE.left * scale, originY + STAGE.top * scale, scale, STAGE.width, height);
}

// Anything but white is drawn: WeUI backgrounds and borders use greys as light as #fafafa.
function ink(image, i) {
  return image.data[i] < 253 || image.data[i + 1] < 253 || image.data[i + 2] < 253;
}

// Bounding box of drawn pixels (ignoring alpha), or null for a blank image.
function inkBox(image) {
  let left = Infinity,
    top = Infinity,
    right = -1,
    bottom = -1;
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++)
      if (ink(image, (image.width * y + x) * 4)) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
  return right < 0 ? null : { left, top, right, bottom };
}

function boxDiff(expected, found) {
  if (!expected && !found) return 0;
  if (!expected || !found) return Infinity;
  return Math.max(...["left", "top", "right", "bottom"].map((side) => Math.abs(found[side] - expected[side])));
}

// Colours that cover a meaningful area, quantized to 64 levels per channel (step 4).
// Bin 63 covers 252..255 (pure white stage), keeping light WeUI greys like #f8f8f8 (248)
// and #fafafa (250) in bin 62 so missing light fills are caught.
const LEVELS = 6;
const MAX = (1 << LEVELS) - 1;
const WHITE = (MAX << (2 * LEVELS)) | (MAX << LEVELS) | MAX;
function bin(r, g, b) {
  return ((r >> (8 - LEVELS)) << (2 * LEVELS)) | ((g >> (8 - LEVELS)) << LEVELS) | (b >> (8 - LEVELS));
}

// Coarser 32-level quantization for coloured glyph ink inside font-masked areas.
const INK_LEVELS = 5;
const INK_MAX = (1 << INK_LEVELS) - 1;
function inkBin(r, g, b) {
  return ((r >> (8 - INK_LEVELS)) << (2 * INK_LEVELS)) | ((g >> (8 - INK_LEVELS)) << INK_LEVELS) | (b >> (8 - INK_LEVELS));
}

// With `solidOnly`, a pixel counts only when its 3x3 neighbourhood has the same colour:
// edges blend with their surroundings differently at every resampling scale, so only
// filled areas are required colours.
function palette(image, solidOnly) {
  const bins = new Map();
  const { width, height, data } = image;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (width * y + x) * 4;
      if (data[i + 3] < 128) continue;
      if (solidOnly) {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) continue;
        let uniform = true;
        for (let dy = -1; dy <= 1 && uniform; dy++)
          for (let dx = -1; dx <= 1 && uniform; dx++) {
            const j = (width * (y + dy) + (x + dx)) * 4;
            if (Math.abs(data[j] - data[i]) > 4 || Math.abs(data[j + 1] - data[i + 1]) > 4 || Math.abs(data[j + 2] - data[i + 2]) > 4) uniform = false;
          }
        if (!uniform) continue;
      }
      const key = bin(data[i], data[i + 1], data[i + 2]);
      bins.set(key, (bins.get(key) || 0) + 1);
    }
  }
  return bins;
}

// Chromatic glyph ink (saturation >= 48) in font-masked pixels (or the whole candidate).
// Font shape varies across platforms, but coloured text (e.g. warn red vs default green)
// keeps its hue regardless of the font family.
function chromaticInk(image, maskedOnly) {
  const bins = new Map();
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    if (maskedOnly && data[i + 3] >= 128) continue;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) < 48) continue;
    const key = inkBin(r, g, b);
    bins.set(key, (bins.get(key) || 0) + 1);
  }
  return bins;
}

// Filled reference colours (at least 12 solid pixels, not white) and chromatic masked
// glyph colours (at least 10 pixels) that the candidate lacks. Pure white never counts
// as a match, so a missing light grey background is not excused by the white stage.
function missingColors(reference, candidate) {
  const ref = palette(reference, true);
  const cand = palette(opaque(candidate), false);
  const missing = [];
  for (const [key, count] of ref) {
    if (count < 12 || key === WHITE) continue;
    const r = key >> (2 * LEVELS);
    const g = (key >> LEVELS) & MAX;
    const b = key & MAX;
    let found = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dg = -1; dg <= 1; dg++)
        for (let db = -1; db <= 1; db++) {
          const [nr, ng, nb] = [r + dr, g + dg, b + db];
          if (nr < 0 || ng < 0 || nb < 0 || nr > MAX || ng > MAX || nb > MAX) continue;
          const near = (nr << (2 * LEVELS)) | (ng << LEVELS) | nb;
          if (near !== WHITE) found += cand.get(near) || 0;
        }
    if (found < count / 4) {
      const hex = [r, g, b].map((v) => ((v << (8 - LEVELS)) | 2).toString(16).padStart(2, "0")).join("");
      missing.push("#" + hex + "×" + count);
    }
  }
  const refInk = chromaticInk(reference, true);
  if (refInk.size > 0) {
    const candInk = chromaticInk(candidate, false);
    for (const [key, count] of refInk) {
      if (count < 10) continue;
      const r = key >> (2 * INK_LEVELS);
      const g = (key >> INK_LEVELS) & INK_MAX;
      const b = key & INK_MAX;
      let found = 0;
      for (let dr = -2; dr <= 2; dr++)
        for (let dg = -2; dg <= 2; dg++)
          for (let db = -2; db <= 2; db++) {
            const [nr, ng, nb] = [r + dr, g + dg, b + db];
            if (nr < 0 || ng < 0 || nb < 0 || nr > INK_MAX || ng > INK_MAX || nb > INK_MAX) continue;
            found += candInk.get((nr << (2 * INK_LEVELS)) | (ng << INK_LEVELS) | nb) || 0;
          }
      if (found < count / 4) {
        const hex = [r, g, b].map((v) => ((v << (8 - INK_LEVELS)) | 4).toString(16).padStart(2, "0")).join("");
        missing.push("ink:#" + hex + "×" + count);
      }
    }
  }
  return missing;
}

// 4×4 blocks in which >6 pixels differ: a local defect such as a missing tick, dot or spinner.
function blockDefects(diff, width, height, masked) {
  let blocks = 0;
  for (let by = 0; by + 4 <= height; by += 4) {
    for (let bx = 0; bx + 4 <= width; bx += 4) {
      let bad = 0;
      for (let y = by; y < by + 4; y++)
        for (let x = bx; x < bx + 4; x++) {
          const i = (width * y + x) * 4;
          // pixelmatch paints differing pixels red and anti-aliased ones yellow.
          if (!masked[width * y + x] && diff.data[i] === 255 && diff.data[i + 1] === 0 && diff.data[i + 2] === 0) bad++;
        }
      if (bad > 6) blocks++;
    }
  }
  return blocks;
}

// Reference pixels with alpha 0 are font-dependent (see fontMask) and not compared.
function maskOf(reference) {
  const masked = new Uint8Array(reference.width * reference.height);
  for (let p = 0; p < masked.length; p++) masked[p] = reference.data[p * 4 + 3] < 128 ? 1 : 0;
  return masked;
}

function opaque(image) {
  const copy = new PNG({ width: image.width, height: image.height });
  image.data.copy(copy.data);
  for (let i = 3; i < copy.data.length; i += 4) copy.data[i] = 255;
  return copy;
}

// Differing pixels as a share of the pixels either image draws on, so a small control
// on a large white stage is not diluted by its background. Anti-aliased pixels are not
// counted, since edge smoothing differs between rendering engines, and neither are the
// reference's font-dependent pixels.
function compare(reference, candidate) {
  const { width, height } = reference;
  if (candidate.width !== width || candidate.height !== height) {
    throw new Error("Size mismatch " + candidate.width + "x" + candidate.height);
  }
  const masked = maskOf(reference);
  const diff = new PNG({ width, height });
  pixelmatch(opaque(reference).data, opaque(candidate).data, diff.data, width, height, {
    threshold: MATCH_THRESHOLD,
    includeAA: false,
    diffColor: [255, 0, 0],
    aaColor: [255, 255, 0],
  });
  let mismatched = 0,
    drawn = 0;
  for (let p = 0; p < masked.length; p++) {
    const i = p * 4;
    if (masked[p]) {
      diff.data[i] = diff.data[i + 1] = diff.data[i + 2] = 200;
      continue;
    }
    if (ink(reference, i) || ink(candidate, i)) drawn++;
    if (diff.data[i] === 255 && diff.data[i + 1] === 0 && diff.data[i + 2] === 0) mismatched++;
  }
  return {
    ratio: drawn ? mismatched / drawn : 0,
    mismatched,
    drawn,
    blocks: blockDefects(diff, width, height, masked),
    missing: missingColors(reference, candidate),
    diff,
  };
}

// Evaluates a candidate image against a reference and its manifest entry.
// Shared by compare.cjs, record.cjs and verify.cjs so recording and checking agree.
function evaluate(reference, actual, entry) {
  const { ratio, blocks, missing, diff } = compare(reference, actual);
  const problems = [];
  if (entry.glyphs) {
    const limit = entry.glyphBox || GLYPH_BOX;
    const off = boxDiff(inkBox(reference), inkBox(actual));
    if (off > limit) problems.push("drawn area off by " + off + "px (limit " + limit + "px)");
  } else {
    if (ratio > entry.tolerance) {
      problems.push((ratio * 100).toFixed(1) + "% of drawn pixels differ (limit " + (entry.tolerance * 100).toFixed(1) + "%)");
    }
    if (blocks > entry.blocks) problems.push(blocks + " local defects (limit " + entry.blocks + ")");
  }
  if (entry.palette && missing.length) problems.push("missing colours " + missing.join(" "));
  return {
    passed: problems.length === 0,
    ratio,
    blocks,
    missing,
    problems,
    diff,
  };
}

// Pixels that change when only the font family changes, widened by two pixels: glyphs
// and anything they push around. Returned as a copy of `reference` with those pixels
// made transparent.
function fontMask(reference, alternate) {
  const { width, height } = reference;
  const diff = new PNG({ width, height });
  pixelmatch(opaque(reference).data, opaque(alternate).data, diff.data, width, height, {
    threshold: MATCH_THRESHOLD,
    includeAA: true,
  });
  const changed = new Uint8Array(width * height);
  for (let p = 0; p < changed.length; p++) {
    const i = p * 4;
    const white = diff.data[i] === diff.data[i + 1] && diff.data[i + 1] === diff.data[i + 2];
    if (!white) changed[p] = 1;
  }
  const out = opaque(reference);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++)
        for (let dx = -2; dx <= 2 && !near; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height && changed[width * ny + nx]) near = true;
        }
      if (near) out.data[(width * y + x) * 4 + 3] = 0;
    }
  return out;
}

// Count of pixels that draw anything on the white stage.
function drawn(image) {
  let count = 0;
  for (let i = 0; i < image.data.length; i += 4) if (ink(image, i)) count++;
  return count;
}

// Count of unmasked (alpha >= 128) drawn pixels in a reference image.
function unmaskedDrawn(image) {
  let count = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3] >= 128 && ink(image, i)) count++;
  }
  return count;
}

function maskedCount(image) {
  let count = 0;
  for (let i = 3; i < image.data.length; i += 4) if (image.data[i] < 128) count++;
  return count;
}

// Two captures from the same renderer count as the same picture only when practically
// identical: attributes without visual effect render byte for byte the same.
const SAME = 0.001;

// Explains why a cell would assert nothing, or returns null when it carries a picture
// of its own: blank cells and states that look like their component's default are
// dropped. `defaults` maps a tag to its normalized default image.
function redundancy(key, image, defaults) {
  if (drawn(image) === 0) return "draws nothing";
  const match = /^state\.([^.]+)\./.exec(key);
  const base = match && defaults[match[1]];
  if (base && base.height === image.height) {
    const result = compare(base, image);
    if (result.ratio <= SAME && result.blocks === 0 && result.missing.length === 0) return "same as the default";
  }
  return null;
}

module.exports = {
  read,
  readPlain,
  write,
  blankImage,
  opaque,
  normalize,
  compare,
  evaluate,
  fontMask,
  inkBox,
  boxDiff,
  locateSquare,
  redundancy,
  drawn,
  unmaskedDrawn,
  maskedCount,
  STAGE,
  SAME,
  GLYPH_BOX,
  MATCH_THRESHOLD,
};
