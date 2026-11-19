const { update } = require("./support");
const { components } = require("../fixtures/component-catalog");
const values = require("../fixtures/component-values");
const states = require("../fixtures/component-states");
const expectations = require("../fixtures/component-expectations");

// Computed style fields read from each component's host element. They describe the
// box a page lays out, without depending on how the component renders internally.
const STYLE_FIELDS = [
  "display",
  "position",
  "box-sizing",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-top-color",
  "border-top-left-radius",
  "background-color",
  "color",
  "font-size",
  "font-weight",
  "line-height",
  "text-align",
  "overflow-x",
  "overflow-y",
  "vertical-align",
  "white-space",
  "opacity",
];

// JSON cannot carry undefined, so an absent property reads as null.
function plain(value) {
  return value === undefined ? null : value;
}

function round(value) {
  return typeof value === "number" ? Math.round(value * 100) / 100 : value;
}

// Keeps only the fields the recorded expectation asserts. Render fields that changed
// with the font family in the baseline are not asserted.
function pick(actual, expected) {
  if (!expected || typeof expected !== "object") return actual;
  const out = {};
  for (const key of Object.keys(expected)) out[key] = Object.prototype.hasOwnProperty.call(actual, key) ? actual[key] : null;
  return out;
}

async function readProperties(gallery, selector, names) {
  const node = await gallery.inspect(selector, { properties: names });
  if (!node) return null;
  const out = {};
  for (const name of names) out[name] = plain(node[name]);
  return out;
}

async function readRender(gallery, selector) {
  const node = await gallery.inspect(selector, { size: true, computedStyle: STYLE_FIELDS });
  if (!node) return null;
  const out = { width: round(node.width), height: round(node.height) };
  for (const field of STYLE_FIELDS) out[field] = plain(node[field]);
  return out;
}

// Public component contract: documented attribute defaults, bound attribute values and
// the host box each built-in component lays out. The attribute list comes from the
// official tool's WXML catalog; every expected value was recorded in the baseline.
async function componentCatalog(page, check) {
  let gallery = null;
  async function mounted() {
    if (!gallery) {
      await update(page, { galleryMounted: true });
      gallery = page.selectComponent("#gallery");
      if (!gallery) throw new Error("Component gallery did not mount");
    }
    return gallery;
  }
  try {
    for (const [tag, { attributes }] of Object.entries(components)) {
      const names = attributes.map((attribute) => attribute.property);
      if (names.length) {
        await check("component.defaults." + tag, expectations.defaults[tag], async () =>
          readProperties(await mounted(), "#d-" + tag, names),
        );
      }
      const bound = Object.keys(values[tag] || {});
      if (bound.length) {
        await check("component.bound." + tag, expectations.bound[tag], async () =>
          readProperties(await mounted(), "#b-" + tag, bound),
        );
      }
      await check("render." + tag, expectations.render[tag], async () => {
        const actual = await readRender(await mounted(), "#d-" + tag);
        return actual && pick(actual, expectations.render[tag]);
      });
    }
    // Render states: documented enum values and boolean attributes that change the box.
    // A recording run (no expectations yet) visits every generated state.
    const recording = !expectations.states || !Object.keys(expectations.states).length;
    for (const [key, { selector }] of Object.entries(states)) {
      if (!recording && !expectations.states[key]) continue;
      const expected = recording ? undefined : expectations.states[key];
      await check("render.state." + key, expected, async () => {
        const actual = await readRender(await mounted(), selector);
        return actual && pick(actual, expected);
      });
    }
  } finally {
    if (gallery) await update(page, { galleryMounted: false });
  }
}

module.exports = { componentCatalog, STYLE_FIELDS };
