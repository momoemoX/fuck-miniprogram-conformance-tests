// Generates the component gallery and the bound sample values from the catalog.
//
//   node tools/components/generate.cjs
//
// Each catalog component renders twice inside components/gallery: `#d-<tag>` with no
// attributes, and `#b-<tag>` with every scalar attribute bound to a sample value.
const fs = require("fs");
const path = require("path");
const { components } = require("../../fixtures/component-catalog");

const root = path.resolve(__dirname, "../..");

// Attributes left unbound in the sample instance: they move focus or start media, which
// would leak into the cases that run after the gallery.
const UNBOUND = new Set(["focus", "auto-focus", "autoplay", "always-embed"]);

// Built-in components that only render inside a specific parent.
const PARENTS = {
  "swiper-item": (id, attrs) => `<swiper><swiper-item id="${id}"${attrs}/></swiper>`,
  "picker-view-column": (id, attrs) =>
    `<picker-view><picker-view-column id="${id}"${attrs}><view>a</view></picker-view-column></picker-view>`,
  "movable-view": (id, attrs) => `<movable-area><movable-view id="${id}"${attrs}/></movable-area>`,
};

function sample(attribute) {
  const { type, values } = attribute;
  if (type === "boolean") return true;
  if (type === "color") return "#123456";
  if (type === "number") {
    if (values && values.length > 1 && Number.isFinite(Number(values[1]))) return Number(values[1]);
    return 7;
  }
  if (type === "string") return values && values.length ? values[values.length > 1 ? 1 : 0] : "suite";
  return undefined;
}

// Components that wrap text get a one-letter child so their box reflects a line of
// content, as it does in real pages. Fields that then depend on font metrics are
// dropped when the expectations are recorded.
const TEXT_CHILD = new Set(["button", "navigator", "label", "text", "cover-view", "picker"]);

// One render-state instance per documented enum value and per boolean attribute set
// to true. Only states whose box differs from the default are kept as cases.
// Map, video, editor and canvas states change only their inner surface, and rendering
// dozens of them would dominate the gallery's cost.
const NO_STATES = new Set(["map", "video", "editor", "canvas"]);

function variants(tag, attribute) {
  if (NO_STATES.has(tag) || UNBOUND.has(attribute.name)) return [];
  if (attribute.type === "boolean") return [true];
  if (attribute.type === "string" && attribute.values) return attribute.values;
  return [];
}

const values = {};
const states = {};
const cells = [];
// Cells shown one at a time on pages/gallery/index for the visual references. Unlike
// the in-app gallery, each component gets content so it draws something: an empty
// image, input or swiper renders nothing, and a blank reference asserts nothing.
// Map tiles come from a network service, canvas needs drawing code, and form and
// match-media are containers without visuals of their own.
const visualCells = [];
const NO_VISUAL = new Set(["map", "canvas", "form", "match-media"]);
// Cells that render text, either from their content or from the component itself.
const TEXT_TAGS = new Set([...TEXT_CHILD, "input", "textarea", "editor", "rich-text", "picker-view", "picker-view-column", "video"]);
const TEXT_STATES = new Set(["audio.controls=true", "progress.show-info=true", "slider.show-value=true"]);
const SAMPLE = 'src="/fixtures/visual-sample.png" style="width:80px;height:80px;background:#eeeeee"';
const SLIDES = '<swiper-item style="background:#e64340"/><swiper-item style="background:#10aeff"/><swiper-item style="background:#07c160"/>';
const COLUMN = "<view>One</view><view>Two</view><view>Three</view>";
const AREA = 'style="width:120px;height:60px;background:#eeeeee"';
const KNOB = 'style="width:30px;height:30px;background:#07c160"';
const VISUAL = {
  image: (id, a) => `<image id="${id}" ${SAMPLE}${a}/>`,
  "cover-image": (id, a) => `<cover-image id="${id}" ${SAMPLE}${a}/>`,
  icon: (id, a) => `<icon id="${id}" type="success"${a}/>`,
  input: (id, a) => `<input id="${id}" value="Input"${a}/>`,
  textarea: (id, a) => `<textarea id="${id}" value="Text" style="height:60px"${a}/>`,
  editor: (id, a) => `<editor id="${id}" placeholder="Editor" style="height:60px"${a}/>`,
  swiper: (id, a) => `<swiper id="${id}" style="height:60px"${a}>${SLIDES}</swiper>`,
  "swiper-item": (id, a) =>
    `<swiper style="height:60px"><swiper-item id="${id}" style="background:#e64340"${a}/><swiper-item style="background:#10aeff"/></swiper>`,
  "movable-area": (id, a) => `<movable-area id="${id}" ${AREA}${a}><movable-view ${KNOB}/></movable-area>`,
  "movable-view": (id, a) => `<movable-area ${AREA}><movable-view id="${id}" ${KNOB}${a}/></movable-area>`,
  progress: (id, a) => `<progress id="${id}" percent="40"${a}/>`,
  slider: (id, a) => `<slider id="${id}" value="40"${a}/>`,
  "picker-view": (id, a) =>
    `<picker-view id="${id}" style="height:100px"${a}><picker-view-column>${COLUMN}</picker-view-column></picker-view>`,
  "picker-view-column": (id, a) =>
    `<picker-view style="height:100px"><picker-view-column id="${id}"${a}>${COLUMN}</picker-view-column></picker-view>`,
  "scroll-view": (id, a) =>
    `<scroll-view id="${id}" style="height:40px"${a}><view style="height:30px;background:#e64340"/><view style="height:30px;background:#10aeff"/></scroll-view>`,
  "rich-text": (id, a) => `<rich-text id="${id}" nodes="{{'<b>Rich</b>   text'}}"${a}/>`,
  "checkbox-group": (id, a) =>
    `<checkbox-group id="${id}"${a}><checkbox value="a" checked="{{true}}"/><checkbox value="b"/></checkbox-group>`,
  "radio-group": (id, a) => `<radio-group id="${id}"${a}><radio value="a" checked="{{true}}"/><radio value="b"/></radio-group>`,
};
for (const [tag, { attributes }] of Object.entries(components)) {
  const bound = {};
  let boundAttrs = "";
  for (const attribute of attributes) {
    if (UNBOUND.has(attribute.name)) continue;
    const value = sample(attribute);
    if (value === undefined) continue;
    bound[attribute.property] = value;
    boundAttrs += ` ${attribute.name}="{{values['${tag}'].${attribute.property}}}"`;
  }
  values[tag] = bound;
  const render =
    PARENTS[tag] ||
    (TEXT_CHILD.has(tag)
      ? (id, attrs) => `<${tag} id="${id}"${attrs}>A</${tag}>`
      : (id, attrs) => `<${tag} id="${id}"${attrs}/>`);
  cells.push(`  <view class="cell">${render("d-" + tag, "")}</view>`);
  cells.push(`  <view class="cell">${render("b-" + tag, boundAttrs)}</view>`);
  const visual = VISUAL[tag] || render;
  if (!NO_VISUAL.has(tag)) {
    visualCells.push({ key: tag, id: "d-" + tag, text: TEXT_TAGS.has(tag), markup: visual("d-" + tag, "") });
  }
  for (const attribute of attributes) {
    variants(tag, attribute).forEach((value, index) => {
      const key = tag + "." + attribute.name + "=" + value;
      const id = "v-" + tag + "-" + attribute.name + "-" + index;
      states[key] = { tag, selector: "#" + id };
      const literal = value === true ? "{{true}}" : String(value).replace(/"/g, "&quot;");
      const markup = render(id, ` ${attribute.name}="${literal}"`);
      cells.push(`  <view class="cell">${markup}</view>`);
      if (!NO_VISUAL.has(tag)) {
        visualCells.push({
          key: "state." + key,
          id,
          text: TEXT_TAGS.has(tag) || TEXT_STATES.has(key),
          markup: visual(id, ` ${attribute.name}="${literal}"`),
        });
      }
    });
  }
}

const header = "<!-- Generated by tools/components/generate.cjs; do not edit by hand. -->\n";
fs.writeFileSync(
  path.join(root, "components/gallery/index.wxml"),
  header + `<view class="gallery" style="font-family:{{font}}">\n${cells.join("\n")}\n</view>\n`,
);
fs.writeFileSync(
  path.join(root, "fixtures/component-values.js"),
  "// Sample values bound to each scalar attribute of the gallery's #b-<tag> instances.\n" +
    "// Generated by tools/components/generate.cjs; do not edit by hand.\n" +
    "module.exports = " +
    JSON.stringify(values, null, 2) +
    ";\n",
);
fs.writeFileSync(
  path.join(root, "fixtures/component-states.js"),
  "// Render-state instances in the gallery: one per documented enum value and per boolean\n" +
    "// attribute. Generated by tools/components/generate.cjs; do not edit by hand.\n" +
    "module.exports = " +
    JSON.stringify(states, null, 2) +
    ";\n",
);
fs.writeFileSync(
  path.join(root, "pages/gallery/index.wxml"),
  header +
    "<!-- The magenta square lets a screenshot tool find the page origin and scale. -->\n" +
    '<view class="calibration"/>\n<view class="stage" style="font-family:{{font}}">\n' +
    visualCells.map((cell) => `  <block wx:if="{{cell === '${cell.id}'}}">${cell.markup}</block>`).join("\n") +
    "\n</view>\n",
);
fs.writeFileSync(
  path.join(root, "fixtures/visual-cells.js"),
  "// Cells of pages/gallery/index that can have visual references, keyed by visual case;\n" +
    "// `text` marks cells that render text. Generated by tools/components/generate.cjs.\n" +
    "module.exports = " +
    JSON.stringify(Object.fromEntries(visualCells.map((cell) => [cell.key, { cell: cell.id, text: cell.text }])), null, 2) +
    ";\n",
);
console.log(visualCells.length + " visual cells");
console.log(Object.keys(components).length + " components, " + Object.keys(states).length + " render states, " + Object.values(values).reduce((n, v) => n + Object.keys(v).length, 0) + " bound attributes");
