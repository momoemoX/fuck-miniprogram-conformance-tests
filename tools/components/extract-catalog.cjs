// Extracts the public component attribute catalog from the WXML tag data that the
// official developer tool ships for editor completion. Only names, attribute types and
// documented enum values are kept; documentation prose is not copied.
//
//   node tools/components/extract-catalog.cjs <path to unpacked wx-page-types>/datas/datas.js
//
// The data lives in the tool's WeappPlugin/wx-page-types.wxvpkg package.
const fs = require("fs");
const path = require("path");

const source = process.argv[2];
if (!source) {
  console.error("Pass the path to datas/datas.js from the unpacked wx-page-types package.");
  process.exit(2);
}

// Components a browser-hosted base library is expected to render. Everything else in
// the tool's data is listed in `excluded` with the reason it stays outside the suite.
const EXCLUDED = {
  "ad": "advertising service",
  "ad-custom": "advertising service",
  "aria-component": "no rendered element",
  "block": "WXML language construct",
  "camera": "device hardware",
  "channel-live": "WeChat Channels service",
  "channel-video": "WeChat Channels service",
  "double-tap-gesture-handler": "Skyline renderer only",
  "draggable-sheet": "Skyline renderer only",
  "editor-portal": "requires an editor context",
  "force-press-gesture-handler": "Skyline renderer only",
  "functional-page-navigator": "plugin functional pages",
  "grid-builder": "Skyline renderer only",
  "grid-view": "Skyline renderer only",
  "horizontal-drag-gesture-handler": "Skyline renderer only",
  "import": "WXML language construct",
  "include": "WXML language construct",
  "index": "not a component tag",
  "keyboard-accessory": "Skyline renderer only",
  "list-builder": "Skyline renderer only",
  "list-view": "Skyline renderer only",
  "live-player": "live streaming service",
  "live-pusher": "live streaming service and camera",
  "long-press-gesture-handler": "Skyline renderer only",
  "native-component": "no rendered element",
  "navigation-bar": "only valid inside page-meta",
  "nested-scroll-body": "Skyline renderer only",
  "nested-scroll-header": "Skyline renderer only",
  "official-account": "hosted account service",
  "open-container": "Skyline renderer only",
  "open-data": "hosted user data",
  "open-data-item": "hosted user data",
  "open-data-list": "hosted user data",
  "page-container": "page-level overlay",
  "page-meta": "only valid as the first page node",
  "pan-gesture-handler": "Skyline renderer only",
  "root-portal": "moves its subtree to the page root",
  "scale-gesture-handler": "Skyline renderer only",
  "selection": "Skyline renderer only",
  "share-element": "Skyline renderer only",
  "slot": "WXML language construct",
  "snapshot": "Skyline renderer only",
  "span": "Skyline renderer only",
  "sticky-header": "Skyline renderer only",
  "sticky-section": "Skyline renderer only",
  "store-coupon": "WeChat store service",
  "store-gift": "WeChat store service",
  "store-home": "WeChat store service",
  "store-product": "WeChat store service",
  "tap-gesture-handler": "Skyline renderer only",
  "template": "WXML language construct",
  "vertical-drag-gesture-handler": "Skyline renderer only",
  "voip-room": "VoIP service and camera",
  "web-view": "replaces the whole page",
  "wxs": "WXML language construct",
};

const EVENT_TYPES = new Set(["eventhandle", "eventhandler", "EventHandle", "callback", "worklet"]);

function kind(attrType) {
  const type = String(attrType || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  if (EVENT_TYPES.has(type)) return "event";
  if (/^(boolean|bool|Boolean)$/.test(type)) return "boolean";
  if (type === "number" || type === "number/string") return "number";
  if (type === "string") return "string";
  if (type === "color") return "color";
  return "other";
}

function camel(name) {
  return name.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

const { WxmlTagDatas: data } = require(path.resolve(source));
const components = {};
const excluded = {};
for (const tag of data.tags) {
  if (EXCLUDED[tag.name]) {
    excluded[tag.name] = EXCLUDED[tag.name];
    continue;
  }
  const attributes = [];
  for (const attribute of tag.attributes || []) {
    const type = kind(attribute.attrType);
    // Events are covered by behavioral cases; generic HTML-like attributes are not
    // component properties.
    if (type === "event" || /^(bind|catch|capture-|mut-bind)/.test(attribute.name)) continue;
    if (/^(id|class|style|hidden|slot)$/.test(attribute.name) || attribute.name.startsWith("data-")) continue;
    const entry = { name: attribute.name, property: camel(attribute.name), type };
    if (Array.isArray(attribute.values) && attribute.values.length) {
      entry.values = attribute.values.map((value) => value.name);
    }
    attributes.push(entry);
  }
  const reference = (tag.references || [])[0];
  components[tag.name] = { doc: reference ? reference.url : null, attributes };
}

const out = path.resolve(__dirname, "../../fixtures/component-catalog.js");
fs.writeFileSync(
  out,
  "// Public component attributes from the WXML tag data shipped with the official developer\n" +
    "// tool (data version " +
    data.version +
    "). Generated by tools/components/extract-catalog.cjs; do not edit by hand.\n" +
    "module.exports = " +
    JSON.stringify({ components, excluded }, null, 2) +
    ";\n",
);
console.log(
  Object.keys(components).length +
    " components, " +
    Object.values(components).reduce((n, c) => n + c.attributes.length, 0) +
    " attributes, " +
    Object.keys(excluded).length +
    " excluded → " +
    path.relative(process.cwd(), out),
);
