# Coverage for base library 3.7.12

## Executable suite

| Group | Cases | Evidence collected |
| --- | ---: | --- |
| Core | 593 | App, page and component state, lifetimes, app-level launch and error hooks, error propagation and recovery, behaviors, component relations (`parent`/`child`, `ancestor`/`descendant` with `linkChanged` and behavior targets), generic substitution, observers, event and intersection observation (viewport, `relativeTo(selector, margins)` and custom `thresholds`), page scroll events, event propagation (`bind`/`catch`/`capture`/`mut-bind`/`mark:`), templates, WXS modules, module state and `change:prop`/`ownerInstance` event responders, two-way `model:` bindings, `Component()`-defined pages, component options (`virtualHost`, `addGlobalClass`, all `styleIsolation` modes), slots, styles, built-in control properties, modern Canvas 2D (`type="2d"` with dpr/clip/gradients/compositing/Path2D/offscreen interop), `SelectorQuery` (`node`/`context`/`computedStyle`/`scrollOffset`/`mark`/`in(comp)`/`boundingClientRect`), keyframe `animate`/`clearAnimation` (including scroll-driven keyframes), `<page-meta>`/`<navigation-bar>`/`<page-container>`, scroll-view edge/into-view events, navigation, tab caching, redirect replacement, `reLaunch` and 10-page stack overflow, `switchTab` boundaries, subpackages and async subpackage loading (`require.async`, callback `require`, `componentPlaceholder`), async `wx.*` Promise contract, worker messages and termination, pull-down refresh callbacks, system, device and account info shapes, API category, tab bar and background style callbacks, image metadata and offscreen canvas pixels, system and UI callbacks including system settings and authorization shapes, clipboard round trip, storage (including `clearStorage`, special value serialization and quota limit) and `setData` special-value serialization, file operations including the saved-file lifecycle, codecs, archives, canvas and audio/bufferURL context lifecycles, real input bindings and focus events. |
| HTTP fixture | 25 | Request parameters, JSON and binary bodies, response headers, HTTP errors, timeout, 302 redirect following/chaining/manual quirk, large/chunked transfers, concurrency, cancellation/abort isolation, multipart upload, file download, saved-file lifecycle and `VideoContext` playback/seek/timeupdate/ended. |
| WebSocket fixture | 2 | Text and binary round trips, followed by a normal close. |
| Interactive input | 17 | Input detail with caret, submitted text, radio, checkbox and switch values, custom form-field component submission, selected text range while typing, native dialog confirmation, action sheet selection, long-press ordering, caret insertion, confirm key, maxlength 0, typed text retention, bindinput return handling, event delivery to an ancestor view and form reset defaults. |
| Physical device | 9 | Location, accelerometer, compass, gyroscope, device motion, battery, brightness, Bluetooth adapter state and Wi-Fi association. |
| Hosted services | 3 | Test app identity, nonempty login code and authorization settings shape. |

## Baseline

Every expected value in the reference table was reproduced in the official WeChat developer tool (2.02.2611062 Nightly) with base library **3.7.12**, driven by `tools/devtools/run.cjs`. The core profile passed 593 of 593 cases, and a second run with both network fixtures passed 620 of 620. The app enables `"style": "v2"`, so built-in components use the style that most mini programs ship with. The component cases were also recorded under three font families, as described below. The [observation record](fixtures/devtools-3.7.12-observations.json) contains every expected and actual value. The simulator supplies emulated native services for files, networking and devices, so host-dependent outcomes still need a device run before they generalize. The scores cover the asserted observations; they do not certify an error-free host.

The target used to be 3.7.0, observed in a desktop host whose origin and tool version were not recorded. Current developer-tool versions no longer list 3.7.0, and requesting it loads 3.18.0, so that baseline could not be reproduced. The sections below keep the history of each group; observations attributed to the 3.7.0 host are historical unless the 3.7.12 run confirms them.

## Changes when the target moved to 3.7.12

| Case | Before | Now | Reason |
| --- | --- | --- | --- |
| `channel.off-listener` | `["kept"]` | `["removed","kept"]` | 3.7.12 stores each listener wrapped in a try/catch shim, and `off(name, fn)` compares `fn.toString()` with the shim's source. Removing by reference matches nothing, so both callbacks run. Both the 3.7.0 host and the 3.7.12 simulator observed this. Tagged `category: "quirk"` in reports so spec-clean implementations can separate it from standard behavior scores. |
| `channel.off-all-listeners` | — | `[[],["other"]]` | New. `off(name)` without a callback drops every listener for that event and leaves other events alone. |
| `ui.pull-down-refresh` | `[[],"success"]` | `[["refresh"],"success"]` | The suite page did not enable pull-down refresh, so the old case observed its configuration rather than the API. With `enablePullDownRefresh`, `wx.startPullDownRefresh` runs `onPullDownRefresh`. Removing the setting makes the case fail with the old value. |
| `ui.navigation-bar-color` | same | same | The case read the callback order synchronously and passed only because the 3.7.0 host ran callbacks synchronously. It now waits for `complete`. |
| `error.*` onError cases | same | same | 3.7.12 delivers `wx.onError` on a zero-delay timer, ahead of the `setData` callback the cases awaited. The listener now returns a message that already arrived. |
| `input.focus-and-blur-events` | focus, focus, blur | renamed `input.focus-events`: focus, focus | The 3.7.12 simulator reports no blur when the `focus` attribute moves to another input or is cleared. Blur delivery is listed under remaining coverage. |
| `page.reach-bottom` | `[true]` | `[false,true]` | Strengthened: no report while the page rests at the top, a report at the end. |
| `system.setting-shape`, `system.authorize-setting-values` | presence checks | value checks | Switches are booleans when present. Authorization fields are the documented strings `authorized`, `denied` or `not determined`; the 3.7.0 host returned booleans. |
| `system.api-category` | non-empty string | `"default"` | A normal launch reports the documented `default` category. |
| `system.device-info-shape` | `ios`, `android` or `devtools` | documented platform list | `ohos`, `windows` and `mac` are valid platforms; the old list failed desktop and HarmonyOS clients. |
| `system.device-platform` | non-empty string | documented platform list | Same list as above. |
| `system.account-info-shape` | app ID only | app ID and `envVersion` | `envVersion` is one of `develop`, `trial` or `release`. |
| `network.type-result` | non-empty string | documented network types | |
| `image.info-from-canvas` | positive sizes | positive square size, `png` type | The exported size scales with pixel density, so only the shape and format are fixed. |
| `lifecycle.query-encoded-values` and the 17 file, digest, storage and random-byte cases | pending | reproduced | They already expected the 3.7.12 behavior. |

The harness also changed. A case that times out gets up to 15 seconds for its cleanup to settle; if cleanup is still pending after 15 seconds, or if a case leaves the page stack changed, the run stops as interrupted so late writes cannot contaminate later cases. Shared page-level fixture data is restored after each mutating case so `runSelected` and arbitrary case order stay isolated. The route driver's fallback waits for the stack to change instead of matching the route name alone, which used to match at once when a lifecycle page opened another lifecycle page. Positive checks wait for their observation instead of a fixed delay; the remaining fixed windows are negative checks, marked in the source. The run starts with a preflight of timers and `setData` callbacks. Reports label baseline provenance as `Baseline-confirmed expectation (3.7.12)` (distinct from the current run's pass/fail outcome) and break scores down into `behavior`, `shape` and `quirk` categories. `tools/reference.cjs --check` keeps `fixtures/reference.js` synchronized with `fixtures/devtools-3.7.12-observations.json`.

## Built-in component contract

The component layer checks 34 built-in components against the public attribute list that the official developer tool ships for WXML completion (data version 1.1). `fixtures/component-catalog.js` keeps each documented attribute's name, type and enum values, without the documentation prose. The other 55 tags in that data are listed in the catalog with the reason they stay out: advertising, live streaming, camera, VoIP, store and Channels services, Skyline-only components, page-level elements such as `page-meta`, `web-view` and `page-container`, and WXML language constructs.

`components/gallery` renders every component twice, once with no attributes and once with each scalar attribute bound to a sample value, plus one instance per documented enum value and per boolean attribute. Four case families read them through the component's selector scope:

| Family | Cases | What is asserted |
| --- | ---: | --- |
| `component.defaults.<tag>` | 31 | Every documented attribute's default, read as a property |
| `component.bound.<tag>` | 31 | The value each attribute reports after binding a sample value |
| `render.<tag>` | 34 | The host box: size and 29 computed style fields |
| `render.state.<tag>.<attr>=<value>` | 7 | Enum or boolean states that change the host box, such as `button type="primary"`, `type="default"`, `size="mini"`, `plain` and `disabled`, and `audio controls` |

All expected values were recorded in the 3.7.12 simulator with `"style": "v2"`; under the legacy style a default button is a full-width 46px block instead of a centered 184×40 box. The gallery was recorded three times with the default, serif and monospace font families; fields that changed between those runs depend on font metrics, which differ across operating systems, and are not asserted. Eight fields were dropped that way: the width and height of inline text-bearing components (`text`, `label`) and the height of `checkbox`, `radio`, `navigator` and `picker`. A render state becomes a case only when a stable field differs from the default box.

The layer asserts the host box, not the component's inner rendering. Of 149 generated states, 142 leave the host box unchanged and change only inner elements, such as a checked `switch` or `checkbox`, or progress `show-info`. The inner structure is implementation-specific, so those states are compared through the visual references below rather than an in-app assertion. Map, video, editor and canvas states are not generated, because they change only the inner surface.

Regenerate the layer after a catalog or tool update:

```sh
node tools/components/extract-catalog.cjs <unpacked wx-page-types>/datas/datas.js
node tools/components/generate.cjs
# record with empty fixtures/component-expectations.js, once per gallery font
node tools/components/record-expectations.cjs default.json serif.json monospace.json
```

## Visual references

The in-app layer cannot see inside a component, so `fixtures/visual/` holds 61 reference images of component renderings. `pages/gallery/index?cell=<cell>` shows one cell on a white stage below a 40px magenta calibration square. Unlike the in-app gallery, each visual cell has content so it draws something: `image` and `cover-image` show an asymmetric sample image in a grey 80px box, so every `mode` crops or aligns it differently; `input` and `textarea` hold text, `swiper` has coloured slides, `progress` and `slider` have values, `picker-view` has options, and `rich-text` contains three spaces so `ensp` and `emsp` produce measurable width changes. `map` (network tiles), `canvas` (needs drawing code), `form` and `match-media` (containers without visuals of their own) have no cells.

Of 178 generated cells, 117 are not referenced: 4 draw nothing, 107 are states whose raw rendering is pixel-identical to the component's default (such as `open-type`, `form-type`, `confirm-type`, `lang` and `easing-function`), and 6 become indistinguishable from their default after font masking (`button.disabled`, `button.loading`, `rich-text.space=nbsp`, `rich-text.user-select`, `scroll-view.refresher-enabled` and `text.user-select`; note that `button.disabled` is still asserted in-app via `render.state.button.disabled=true`). The remaining 61 include every image mode, checked and disabled `switch`, `checkbox` and `radio`, the v2 button types (`primary`, `default`, `warn`), `size="mini"` and `plain`, `input` `password`, `progress` `show-info`, `slider` `show-value`, swiper indicator dots, `rich-text` `ensp`/`emsp` spacing, `audio` controls (`state.audio.controls=true`), and default `video` rendering (which renders its built-in controls; `video` itself has no generated `state.video.*` cells).

`tools/visual/compare.cjs` accepts any screenshot of the gallery page. It finds the calibration square to the sub-pixel, derives the page origin and scale from it, crops the stage and resamples it to one pixel per CSS pixel, so device frames, zoom and device pixel ratio do not matter. Screenshots that carry Display-P3 values, as the simulator writes on wide-gamut displays, are recognised from the square's colour and converted to sRGB. Each reference is checked three ways (shared with `record.cjs` and `verify.cjs` via `lib.evaluate`):

| Check | Fails when |
| --- | --- |
| Pixel share | Differing pixels (pixelmatch threshold 0.025, excluding anti-aliased edges) exceed the reference's tolerance as a share of the pixels either image draws |
| Local defects | More 4×4 blocks (>6 differing pixels) than the baseline itself showed have changed, such as a missing tick, dot or fine control element |
| Palette | A solid colour (64-level quantization, at least 12 uniform 3×3 pixels, excluding pure white bin 63 while retaining `#f8f8f8`/`#fafafa` in bin 62) or a chromatic font-masked glyph ink colour (e.g. warn red `#fa5151` vs default green `#06ae56`) is nearly absent from the candidate |

Each cell was captured three times in the 3.7.12 simulator: twice with the default font and once with serif. Only text-bearing cells (`text: true` in `fixtures/visual-cells.js`) are font-masked; non-text controls such as `checkbox` and `radio` are never font-masked, so ticks and icons cannot be erased by serif line-height shifts. For text cells, pixels that change under serif are stored transparent and excluded from pixel-by-pixel diffing, while their chromatic ink hue is still enforced by the palette check. Thirteen text cells either kept their own font family under serif (`input`, `state.input.password=true`, `cover-view`) or had all drawn pixels masked as glyphs (`text`, `label`, `navigator`, `picker`, `editor`, `textarea`, `state.textarea.auto-height=true`, `rich-text`, `state.rich-text.space=ensp`, `state.rich-text.space=emsp`); they are compared by their drawn bounding box (`glyphBox`, derived from the baseline's own repeat and serif box variance, minimum 3px) plus palette. The other 48 are compared pixel by pixel. Before admitting a reference, `record.cjs` verifies that a blank white stage fails and that every state reference fails against its own component default; `node tools/visual/verify.cjs` (also run in CI via `npm run check`) enforces the same invariants offline with 0 blank false negatives and 0 redundant states.

```sh
npm ci --prefix tools/visual
# references: one capture of every cell, then the repeat and serif captures of the cells worth keeping
node tools/visual/capture-devtools.cjs --appid <AppID> --out raw-1
node tools/visual/capture-devtools.cjs --appid <AppID> --out raw-2 --only "$(node tools/visual/select.cjs raw-1)"
node tools/visual/capture-devtools.cjs --appid <AppID> --out raw-serif --font serif --only "$(node tools/visual/select.cjs raw-1)"
node tools/visual/record.cjs raw-1 raw-2 raw-serif
node tools/visual/verify.cjs
# an implementation: capture its screenshots any way its host allows, then compare
node tools/visual/capture-browser.cjs --url http://localhost:3000/ --out shots
node tools/visual/compare.cjs --candidate shots --out diff
```

The visual layer is a separate profile: its outcome depends on how an implementation is screenshotted, and agreement across rendering engines carries more noise than the in-app assertions. It is reported by `compare.cjs`, not by the suite page. Its thresholds were validated against the official renderer only; no second conforming implementation exists yet to measure how much two correct renderers differ.

## Component and event cases

The `contract.*` and `pure.*` cases recreate their component fixtures for each check and dispose of them afterward. They cover array and object property defaults, instance isolation, synchronous data updates, render callbacks, nested paths, observer matching and batching, behavior inheritance and lifetime order, and pure-data fields.

The `event.boundary-*` cases emit a custom event inside a component, vary `bubbles` and `composed`, and record listeners reached inside the component, on its host, and on its page ancestor. `event.current-target` checks target and current-target IDs at two listeners. These cases also remount their fixtures independently.

All 35 cases in this addition reproduced their expected values in both desktop environments. A temporary mutation of the component’s own method return value caused `contract.behavior-method-priority` to fail.

## Template and WXS cases

The template fixture is recreated for each of 29 checks. The cases cover if/elif/else selection and reentry, custom loop aliases, keyed reordering, empty lists and regrowth, nested loops, object keys, imported template parameters, dynamic templates and include scope. Expressions exercise arithmetic, boolean operators, ternaries, embedded braces and missing deep paths. WXS cases cover a required helper module, copied inputs, string methods, regular expressions and object updates.

In the 3.7.0 desktop baseline, setting `sample.items[1]` from 2 to 5 updates a direct field binding to 5, while the WXS call receiving the whole `sample` object retains its earlier `seed/3` output. Replacing the whole object produces `seed/6`. Both observations are asserted separately. The comparison implementation recalculates the WXS call for the path update, which is reported as a compatibility difference.

All 29 new expected results were reproduced in the baseline. The comparison implementation matched 28. A temporary change to WXS uppercase normalization was also checked against the string-method case.

## Definition and property cases

The 24 definition, property and component-export checks remount their fixtures for each operation. They cover diamond-shaped behavior inheritance, lifecycle order, object data merging and array replacement, and definition filters that extend component data and methods. Property checks exercise parent-to-child number, string and boolean conversion, optional types, unrestricted values, null objects, replacement arrays, derived observer data and rendered property values.

Component-export checks read a public object, update its instance through an exported method, check that private data is absent from that object, and exercise null and undefined export results with both component selectors. All 24 expectations reproduced in both desktop environments. A temporary mutation of the filter-inserted value caused the filter data and method checks to fail.

## Module and lifecycle cases

The 26 module and lifecycle checks cover module identity and shared state, explicit file extensions, relative parent paths, replaced exports, callable and constructor exports, directory references, circular dependencies and repeated module failures. In both the 3.7.0 desktop baseline and the independent 3.7.12 simulator, a directory shorthand without an index filename is rejected. In a cycle, a peer can retain the initial exports object after the other module replaces `module.exports`.

Navigation checks observe load/show/ready/hide/unload order, hidden-page state, multi-page return, redirect replacement, repeated route instances, failed navigation, query values and page recreation. Every case restores the starting page stack. The driver waits for `wx.onAppRouteDone` when the runtime provides it, because a successful navigation callback or onShow alone can precede the end of a native transition. Without it, the driver polls `getCurrentPages()` until the top of the stack has changed to the target page.

All 26 expected results reproduced in the independent **3.7.12** simulator. The [observation record](fixtures/native-module-lifecycle.json) contains each expected and actual result. Twenty-five also reproduced in the existing 3.7.0 desktop host. The remaining query case expects percent-encoded values as observed in 3.7.12 and stays outside the 3.7.0 reproduced-expectation score.

Temporary mutations of an exported module value and the fixture's hide event caused their corresponding checks to fail.

## Component instance reuse

Twenty-six checks remount a list fixture for each case. They compare component references obtained through `selectComponent` and `selectAllComponents`, component-owned draft values, property updates, event payloads and lifecycle observations.

The keyed-list cases cover reordering, prepend/append, removal, changed keys, replacement objects, path updates, clearing and regrowth, conditional removal, hidden-state preservation, event indices and repeated detachment. Positional-list cases track state by index when items reorder or shift. Separate loops exercise identical keys without sharing component state, including moving an item between loops.

All 26 expected results reproduced in the 3.7.0 desktop host and the independent **3.7.12** simulator. The comparison implementation passed 25. When an existing item changes its key from b to d, all three environments replace the component instance. In the old instance’s detached callback, the desktop baseline and native simulator report b, while the comparison implementation reports d. The [native observation record](fixtures/native-reuse.json) contains the expected and actual values.

A temporary removal of the main list's `wx:key` caused eight checks to fail, including reordering identity, state placement, prepend, deletion and event positions.

## Error, app lifecycle, WXS state and real input cases

Twenty-one checks extend the suite: six error-propagation cases, seven app-lifecycle cases, six WXS module-state cases and two real-input binding cases. The app and WXS-state groups reuse the shared route harness that drives `pages/lifecycle/index` and restores the starting page stack.

The error cases mount a probe whose observer, detached lifetime and event handlers throw. `wx.onError` receives each thrown error once, as an Error object or a string whose text contains the original message. A handler that throws does not stop the remaining bubbling listeners of the same dispatch, a throwing `success` callback still runs `complete`, a detached throw does not block removal, an observer throw does not block later updates, an unhandled rejection arrives with its `reason` and a thenable `promise`, and `console.error` does not reach `onError`.

The app cases read what the public `App` hooks recorded at launch: the order launch, show and entry-page load, an empty page stack during `onLaunch`, the launch options types (`path` string, `query` and `referrerInfo` objects, `scene` number), equal enter and launch option paths, no `wx.onAppShow`, `wx.onAppHide` or `onPageNotFound` activity during page navigation, and an app-instance token visible from a pushed page.

The WXS state cases load one counter module through two tags. Two tags with the same source in one template share a module instance, two probe instances stay isolated, the module variable persists across render passes, an explicit remount starts fresh, page-level and component-level modules are separate, and a pushed page gets a fresh module while the hidden suite page retains its value. Because the 3.7.0 host re-runs WXS calls on every render pass, the fixtures write through an idempotent `setValue(next)` call so repeated renders cannot drift the observed value.

The input cases drive the `focus` attribute of two rendered inputs. Focus events carry `{value, height}`; moving focus to a second input delivers a second focus event (the 3.7.0 host also delivered the old input's blur after it, without a height; the 3.7.12 simulator delivers no blur); a bound value update reaches the rendered input node.

Eleven further checks extend the same group: the component `error` lifetime receives the thrown error while `wx.onError` still fires, the `App.onError` and `App.onUnhandledRejection` hooks record the same faults their `wx.on*` counterparts deliver, `pageLifetimes` reports hide and show around a page switch, a `multipleSlots` panel projects two same-named slots in document order, a bound `scroll-top` and `scroll-into-view` move a rendered `scroll-view` and fire `bindscroll` with the final position, an `IntersectionObserver` reports the ratio toggling between 1 and 0 and `disconnect` stops delivery, `getStorageInfoSync` lists written keys with numeric sizes, and a worker echoes nested object shapes and stops answering after `terminate`.

Five further checks complete the group: an exported animation reaches the rendered node's computed transform, `getDate(0)` inside WXS evaluates to epoch 0, event handlers on two nesting levels read the source node's dataset, a component reports its `is`, `id` and host dataset, and a canvas-exported temporary file survives `saveFile`, appears in `getSavedFileList` and disappears after `removeSavedFile`.

Six more cover page-level scrolling and system surfaces: a bound page scrolls through `wx.pageScrollTo` and records `onPageScroll`, scrolling to the end fires `onReachBottom`, `wx.setNavigationBarColor` runs its success and complete callbacks, `wx.getSystemSetting` reports device orientation and boolean switches, `wx.getAppAuthorizeSetting` exposes every authorization field, and an observer from a base behavior runs before the component's own observer for the same field. On the 3.7.0 host `wx.startPullDownRefresh` did not deliver `onPullDownRefresh` because the suite page had not enabled pull-down refresh, and authorization fields carried booleans; the 3.7.12 baseline resolves both, as listed under the target change. The reach-bottom check was weak on that host, which fired the hook even when the page could not scroll; the case now also asserts that no report arrives while the page rests at the top.

Five final checks round out the portable surface: the clipboard round-trips a fixed string, `wx.pageScrollTo` accepts a selector and scrolls the bound page, `wx.getDeviceInfo` exposes brand, model, system and platform strings, `wx.getAccountInfoSync` exposes the configured app ID, and a property defined by a behavior carries its own observer. Five more close the canvas and UI surface: a canvas export feeds `wx.getImageInfo` with real dimensions, an offscreen 2D canvas fills and reads pixels, `wx.getApiCategory` returns a string, and the tab bar badge and background style callbacks report `:ok`.

All 53 expected results reproduced in the 3.7.0 desktop host on repeated runs. The interactive page records `wx.getSelectedTextRange` during a real input event, reporting the caret position after an insertion. Temporary mutations — removing the observer throw, dropping the `App.onShow` boot marker, pointing the WXS mirror tag at a copied module, unbinding the input value, dropping the `pageLifetimes` hide report, removing the worker shapes echo, removing the observer `disconnect`, removing `scroll-y` from the scroll fixture, unexporting the WXS date helper, corrupting the expected instance id, removing the base behavior's observers, and corrupting the expected clipboard value — each made exactly the corresponding case fail with a reason that named the removed behavior.

The interactive input page grew from six to sixteen checks, driven by real typing, caret moves, Enter presses and clicks. The additions reproduced on the 3.7.0 browser host: input detail carries `value` and `cursor`, caret insertion reports the insertion point, Enter fires `bindconfirm`, `maxlength="0"` keeps the field empty, typed text survives an unrelated `setData` while a changed bound value overwrites it, and form reset empties text, unchecks switches and groups and reports an empty slider value. Three observations differ from the independent engine implementation and stay recorded: a `bindinput` return value does not alter the displayed text on this host, input events do not reach ancestor view handlers, and a reset slider submits an empty string instead of its minimum. Native dialogs render as host overlays: `wx.showModal` resolves with `confirm` after the dialog's confirm button is activated and `wx.showActionSheet` reports the tapped index. A custom component with the built-in `wx://form-field` behavior contributes its `name` and `value` to the submitted form. On this host the behavior exposes `name` and `value` as properties, so `data` fields with the same names are overridden and must not be used. The three observations above need a developer-tool simulator run before becoming compatibility requirements.

## Expectations awaiting confirmation

None in the automatic profiles: every expected value reproduced in the 3.7.12 baseline. The 3.7.0 host had disagreed with 19 of them; the table above records how each was resolved.

## Earlier simulator cross-check

The 18 pending expectations were exercised directly in the developer-tool simulator with SDK **3.7.12**, using the same case functions and the page's `runSelected` method, which runs only the listed case IDs. The simulator supplied file, storage, random-byte and navigation operations. Two fresh runs produced the same results. The committed [observation record](fixtures/native-observations.json) includes every expected and actual value, the tool version and the tested suite commit. It contains the original 18 cases.

Seventeen expectations matched. This includes positional file reads and writes, descriptor and path truncation, closed descriptors, Brotli, ZIP entry reads and extraction, three digests, the asynchronous file-tree and descriptor sequences, batch storage, random-byte lengths, and synchronously saving a downloaded file.

For `channel.off-listener`, the receiver registered two callbacks, removed the first callback by reference, and emitted a message. Both callbacks still ran. The expected `["kept"]` was contradicted by the observed `["removed","kept"]`. This expectation requires further investigation before use as a compatibility requirement.

These observations were the first results for **3.7.12**; the current baseline supersedes them, including `channel.off-listener`, whose expected value now matches the observed one.

The independent run also exposed missing page JSON files. Empty page configurations have been added for every previously unconfigured declared page so the standard simulator can register them.

## Framework and WXML/WXSS core contracts (25 cases)

Twenty-five isolated checks cover high-frequency framework and WXML/WXSS contracts that independent engines commonly get wrong:

- **Async `wx.*` Promise contract (`promise.*`, 4 cases)**: Calling async APIs without `success`/`fail`/`complete` returns a Promise that resolves on success and rejects with `errMsg` on failure; passing callbacks suppresses Promise return; task-returning APIs such as `wx.request` return a task with `abort()` rather than a Promise.
- **WXS event responder & `ownerInstance` (`wxs.change-*` / `wxs.owner-*`, 4 cases)**: `change:prop` delivers initial and updated values, `ownerInstance.callMethod` bridges structured payloads back to the logic layer, `instance.setStyle` updates rendered box width, and `ownerInstance.selectComponent(...).addClass/removeClass/hasClass` toggles CSS classes on rendered nodes.
- **Simple two-way binding (`model.*`, 3 cases)**: `model:value` and `model:count` propagate parent updates to the child, propagate child `setData` writes back to parent page data and DOM, and preserve numeric types.
- **Advanced event bindings (`event.mark-*` / `event.mut-bind-*`, 4 cases)**: `mark:` merges along the bubble path with inner nodes overriding outer keys, respects component shadow-tree boundaries without leaking component-internal marks to outer host listeners, and `mut-bind:` suppresses ancestor `mut-bind:` handlers while still allowing regular `bind:` handlers to fire.
- **`Component()`-defined pages (`component-page.*`, 2 cases)**: Opening `/pages/comp-page/index?code=alpha&count=7` maps and coerces route query parameters onto `properties` (`String` and `Number`) and runs lifetimes and `methods` page hooks in `created → attached → onLoad → onShow → ready → onReady → onUnload → detached` order.
- **Component options & tree relations (`component-options.*`, 6 cases)**: `virtualHost: true` exposes children directly to a parent flex layout, `addGlobalClass: true` applies `app.wxss` and page styles inside the component, `styleIsolation: "shared"` shares styles bidirectionally with the page while `"page-apply-shared"` flows styles one-way into the component, and `ancestor`/`descendant` relations connect across intermediate `<view>` wrappers and fire `linkChanged` on reorder.
- **Subpackage async loading (`subpackage.*`, 2 cases)**: `require.async("../pack/async-mod.js")` loads a subpackage module asynchronously, and `componentPlaceholder` renders a placeholder before replacing it with the loaded subpackage component.

All 25 cases reproduced in the 3.7.12 simulator (493/493 core, 507/507 with network fixtures).

## Modern rendering, node query and Canvas 2D contracts (20 cases)

Twenty isolated checks modernize the rendering, node-query and canvas layers:

- **Canvas 2D (`canvas2d.*`, 8 cases)**: Acquires `<canvas type="2d">` via `SelectorQuery.node()`, validates `getContext("2d")` / `createImage` / `createImageData`, checks `fillRect` + `getImageData` pixel round trips, `putImageData` + `clearRect`, `save`/`translate`/`restore` transform and style stacks, local image loading + `drawImage`, `toDataURL("image/png")` + `wx.canvasToTempFilePath({ canvas })` export, `measureText`, and `requestAnimationFrame` / `cancelAnimationFrame`.
- **Modern SelectorQuery (`query.*`, 6 cases)**: `ScrollViewContext` via `select("#node-scroll").node()` with `scrollTo`, `VideoContext` via `context()`, combined `size`/`rect`/`computedStyle`, batched `selectViewport().scrollOffset()` + box `scrollOffset()`, node `mark: true` field extraction, and `selectAll().boundingClientRect()` ordering and spacing.
- **Keyframe animations, page-meta, page-container and scroll edges (`animate.*`, `page-meta.*`, `page-container.*`, `scroll-view.*`, 6 cases)**: Page-scoped and component-scoped `animate()` + `clearAnimation()`, `<page-meta>` dynamic `root-font-size` rem scaling, `page-style` inheritance and `scroll-top` binding alongside `<navigation-bar>`, `<page-container>` `beforeenter → afterenter → beforeleave → afterleave` lifecycle events, and `<scroll-view>` `bindscrolltolower` / `bindscrolltoupper` boundary delivery.

All 20 cases reproduced in the 3.7.12 simulator (513/513 core, 527/527 with network fixtures).

## Deep framework, rendering, routing, storage, HTTP & media boundaries (90 cases)

Ninety additional isolated cases close 21 `PARTIAL` and `MISSING` clauses in [`SPEC_MATRIX.md`](SPEC_MATRIX.md) (bringing the matrix to **50/53 covered, 0 missing**):

- **Deep framework & WXML/WXSS contracts (+26 cases)**: Promise complete-only/fail-only/errMsg-parity/sync-API boundaries; WXS `getDataset`/`getState`/`selectAllComponents`/string `setStyle`/object `change:payload`/`ownerInstance.triggerEvent`; `model:` child observers, sibling convergence, falsy `false`/`""` roundtrips and native `<input model:value>`; dynamic `mark:`, `mark:` vs `dataset`, `mut-bind:` + `catch:` and `capture-bind:` ordering; `Component()` page behaviors, observers, query defaults/Boolean coercion/URL decoding; `virtualHost` selector/methods, `styleIsolation: "page-shared"` & `"isolated"` blocking `app.wxss`, Behavior-targeted relations lifecycle; callback `require(path, cb, errCb)` + missing module rejection, and `componentPlaceholder` prop/event continuity.
- **Deep Canvas 2D, SelectorQuery & rendering contracts (+24 cases)**: Canvas 2D `dpr` scaling, path stroke/fill, `arc`, `clip`, linear gradient, `globalAlpha`, `destination-out` compositing, `Path2D`, offscreen-to-onscreen `drawImage` and `onerror`; `SelectorQuery.in(comp)` scope isolation, missing `select` vs `selectAll`, dynamic native properties, mixed batch ordering, horizontal `ScrollViewContext.scrollTo({ left })`, `selectAll` dataset order; partial `clearAnimation`, animation override, scroll-driven keyframes (`scrollSource`), missing-selector no-throw, `<page-meta>` dynamic `page-style`, `<page-container>` top/bottom/overlay/z-index, and horizontal `scroll-into-view`.
- **Routing, storage/setData serialization, HTTP & media boundaries (+40 cases)**: 10-page stack limit overflow, `switchTab` non-tab rejection / query-strip quirk / non-tab stack clearing, `wx.reLaunch` stack reset & tab relaunch, in-app `onPageNotFound` isolation (plus standalone cold-start verification via `tools/devtools/check-page-not-found.cjs`); `clearStorage`/`clearStorageSync`, `undefined`/`NaN`/`Infinity`/`Date`/`ArrayBuffer`/sparse-array/large-payload serialization in both `Storage` and `setData`; HTTP timeout, 302 redirect follow/chain/manual quirk, 512KB/chunked transfers, concurrent requests and `abort()` isolation; `InnerAudioContext` play/pause/seek/timeupdate/ended/stop, `wx.createBufferURL`/`revokeBufferURL`, and `VideoContext` playback/seek/timeupdate/ended.

All 90 cases reproduced in the 3.7.12 simulator (590/590 core, 617/617 with network fixtures).

## IntersectionObserver reference nodes & thresholds (3 cases)

Three isolated cases close the last `PARTIAL` P0 clause, `RENDER-03`, bringing P0 coverage to **42/42**. They mount a fixed reference box (`#io-root`) and a target (`#io-target`) on demand, and keep the target inside the viewport so only the reference node decides intersection:

- **`observer.relative-to-selector`**: `relativeTo("#io-root")` reports ratio 1 inside the root and 0 outside it, and `relativeRect` reflects the root's 100×100 bounds.
- **`observer.relative-to-margins`**: `relativeTo("#io-root", { left: 30 })` reports a target sitting 2px left of the root as fully intersecting, while an unmargined observer on the same moves stays silent.
- **`observer.custom-thresholds`**: `thresholds: [0.5]` fires only on 0.5 crossings (`[0.75, 0.25]`), while a default-threshold observer on the same moves fires on 0 crossings (`[0.25, 0]`).

All 3 cases reproduced in the 3.7.12 simulator (593/593 core, 620/620 with network fixtures).

## Independent web-runtime cross-check (historical 363-case snapshot)

> **Historical snapshot**: Recorded at commit `b79b8e6` when the default suite had **363 cases** (before expansions to the current **593 core cases**). Do not compare the `177/363` denominator directly with the current 593-case suite without re-running.

The suite was built for the experimental `@weapp-vite/web` H5 runtime (`weapp-vite` 7.6.0, self-described POC) and driven headlessly. The committed suite is unchanged; one build blocker was worked around in a throwaway copy: their wxs resolver cannot resolve wxs-to-wxs `require`, so `format.wxs`'s dependency on `arithmetic.wxs` had to be inlined for the build to succeed. Because the runtime never renders page data into the DOM, results were collected through the page instance instead of the rendered summary.

The full default run completed **177/363**. The [observation record](fixtures/weapp-vite-web-observations.json) holds every expected and actual value. Strong groups include component reuse (24/26), page lifecycles (8/10), storage (13/15), module loading (13/17) and system info (13/17). Zero-scored groups trace to a small set of gaps: `wx.onError`/`wx.onUnhandledRejection`/`wx.getPerformance`/`wx.arrayBufferToBase64`/`wx.canvasGetImageData`/`wx.createWorker`/`wx.createMediaQueryObserver` and the file-system manager are absent (error, base64, canvas, worker, clock, file groups); page `getOpenerEventChannel` is missing (channel 0/4); `hasBehavior` and `getRelationNodes` are missing and generic components do not expose their methods; template data spread `{{...payload}}` cannot be parsed, which prevents the template probe from mounting and zeroes the template, expression and wxs-template cases; dataset and WXS-rendered values arrive as strings; and module loading diverges (directory shorthand accepted, failed modules cached as successes).

This run also drove a suite-side portability fix: the navigation harness no longer requires the official `wx.onAppRouteDone` extension and falls back to polling `getCurrentPages()` when it is absent. The official-host regression after the fix is unchanged (345/363, 345/345 reproduced).

## API inventory

The 3.7.12 simulator's `wx` object exposes **464** of the public declaration names checked (460 functions and four objects), and its file-system manager exposes **45 methods**. Compared with the earlier 3.7.0 host, nine names were added and none removed: `cancelIdleCallback`, `createGlobalPayment`, `getShowSplashAdStatus`, `loadBuiltInFontFace`, `offUserTriggerTranslation`, `onUserTriggerTranslation`, `openStoreOrderDetail`, `postMessageToReferrerPage` and `requestIdleCallback`. The availability page checks each name and value type. A stub can pass an availability check. Only a behavioral case contributes to a behavioral score.

The [broader source catalog](https://github.com/wechat-miniprogram/api-typings/blob/e5dc50ccea71e7999a8aa8a942a6f68045e141ca/types/wx/lib.wx.api.d.ts) contains 1,261 member names across 74 interfaces with declared methods. It includes names outside the observed desktop surface. Nested interfaces that require hardware, a user gesture or a service session are listed without constructing them for inventory.

Run `node tools/coverage.cjs` for direct source references and the list of baseline names without one. Add `--json` for the per-member file map. This is a lexical inventory. A method can be referenced only during setup, accessed dynamically, or reached only after an earlier operation succeeds. Use runtime case reports for behavioral evidence.

## Remaining coverage

| Area | Missing or partial behavior |
| --- | --- |
| Framework and rendering | Blur delivery when focus moves between inputs (absent in the 3.7.12 simulator; needs a device run), advanced relation and generic combinations, theme change delivery, window resize events, and the remaining built-in components and their property, event and accessibility combinations. |
| Component rendering | Inner rendering is compared through the visual references, outside the in-app score. Animated cells, `map`, and interaction states such as hover, focus and pressed have no reference. |
| Interactive input | The 17 interactive checks were recorded on the earlier 3.7.0 host and have not been re-run on 3.7.12. They need real keystrokes, native dialogs and gestures that the automation driver does not reproduce faithfully. |
| Desktop APIs | Additional success, failure and cancellation paths, task listeners, media playback and decoding, maps, TCP/UDP, native UI and platform-specific branches. |
| Device integration | Camera and microphone hardware, background operation, BLE data exchange with a peripheral, NFC tags, Wi-Fi changes, device model and permission-denial paths. |
| Hosted services | Server-side login exchange, session expiry, cloud operations, subscriptions, advertisements and payment sandbox transactions. The login case checks the response shape only. |

Treat an unrun profile, an untested API and an interrupted case as distinct from a pass. Attach the JSON result and the implementation version to a compatibility claim.
