# Coverage for base library 3.7.0

## Executable suite

| Group | Cases | Evidence collected |
| --- | ---: | --- |
| Core | 353 | App, page and component state, lifetimes, app-level launch and error hooks, error propagation and recovery, behaviors, component relations, generic substitution, observers, event and intersection observation, page scroll events, event propagation, templates, WXS modules and their module state, slots, styles, built-in control properties, selectors, scroll views, navigation, tab caching, redirect replacement, subpackages, worker messages and termination, pull-down refresh callbacks, system and UI callbacks including system settings and authorization shapes, storage and storage info, file operations including the saved-file lifecycle, codecs, archives, canvas and audio context identity, real input bindings and focus events. |
| HTTP fixture | 12 | Request parameters, JSON and binary bodies, response headers, HTTP errors, cancellation, multipart upload, file download and saved-file lifecycle. |
| WebSocket fixture | 2 | Text and binary round trips, followed by a normal close. |
| Interactive input | 16 | Input detail with caret, submitted text, radio, checkbox and switch values, custom form-field component submission, native dialog confirmation, action sheet selection, long-press ordering, caret insertion, confirm key, maxlength 0, typed text retention, bindinput return handling, event delivery to an ancestor view and form reset defaults. |
| Physical device | 9 | Location, accelerometer, compass, gyroscope, device motion, battery, brightness, Bluetooth adapter state and Wi-Fi association. |
| Hosted services | 3 | Test app identity, nonempty login code and authorization settings shape. |

Core, HTTP and WebSocket cases ran on two desktop implementations. In the host configured for SDK 3.7.0, 348 of the 367 expected values were reproduced. The comparison runtime matched 285 of the 305 expectations recorded before the error, app, WXS-state and input additions. Both desktop environments passed the six interactive input checks that existed before this addition; the seven new interactive checks have so far run only in the 3.7.0 browser host through UI automation. Physical-device and hosted-service checks still require execution in their respective environments.

The reference table records the case ID and the expected value from each reproduced case. Changing an expected value removes its reproduced status at run time until it has been checked again. The desktop host supplies native services for files, networking and devices. Host-dependent outcomes require independent confirmation before generalizing them to a physical device. The baseline host also logged exceptions during media-query observer cleanup and batch-storage response handling. The scores above cover the asserted observations; they do not certify an error-free host.

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

Navigation checks observe load/show/ready/hide/unload order, hidden-page state, multi-page return, redirect replacement, repeated route instances, failed navigation, query values and page recreation. Every case restores the starting page stack. The driver waits for the public `wx.onAppRouteDone` event (available since 3.5.5), so implementations running this group need route-completion event support. A successful navigation callback or onShow alone can precede the end of a native transition.

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

The input cases drive the `focus` attribute of two rendered inputs. Focus events carry `{value, height}`; moving focus to a second input delivers the new input's focus before the old input's blur, and the blur detail carries no height; a bound value update reaches the rendered input node.

Eleven further checks extend the same group: the component `error` lifetime receives the thrown error while `wx.onError` still fires, the `App.onError` and `App.onUnhandledRejection` hooks record the same faults their `wx.on*` counterparts deliver, `pageLifetimes` reports hide and show around a page switch, a `multipleSlots` panel projects two same-named slots in document order, a bound `scroll-top` and `scroll-into-view` move a rendered `scroll-view` and fire `bindscroll` with the final position, an `IntersectionObserver` reports the ratio toggling between 1 and 0 and `disconnect` stops delivery, `getStorageInfoSync` lists written keys with numeric sizes, and a worker echoes nested object shapes and stops answering after `terminate`.

Five further checks complete the group: an exported animation reaches the rendered node's computed transform, `getDate(0)` inside WXS evaluates to epoch 0, event handlers on two nesting levels read the source node's dataset, a component reports its `is`, `id` and host dataset, and a canvas-exported temporary file survives `saveFile`, appears in `getSavedFileList` and disappears after `removeSavedFile`.

Six more cover page-level scrolling and system surfaces: a bound page scrolls through `wx.pageScrollTo` and records `onPageScroll`, scrolling to the end fires `onReachBottom`, `wx.setNavigationBarColor` runs its success and complete callbacks, `wx.getSystemSetting` reports device orientation and boolean switches, `wx.getAppAuthorizeSetting` exposes every authorization field, and an observer from a base behavior runs before the component's own observer for the same field. On this host `wx.startPullDownRefresh` completes without delivering the page's `onPullDownRefresh` hook, and authorization fields carry booleans instead of the documented strings; both observations stay recorded pending a simulator run. The reach-bottom check is weak here: the host fires the hook even when the page cannot scroll, so shrinking the fixture spacer did not break the case.

All 43 expected results reproduced in the 3.7.0 desktop host on repeated runs. Temporary mutations — removing the observer throw, dropping the `App.onShow` boot marker, pointing the WXS mirror tag at a copied module, unbinding the input value, dropping the `pageLifetimes` hide report, removing the worker shapes echo, removing the observer `disconnect`, removing `scroll-y` from the scroll fixture, unexporting the WXS date helper, corrupting the expected instance id, and removing the base behavior's observer — each made exactly the corresponding case fail with a reason that named the removed behavior.

The interactive input page grew from six to sixteen checks, driven by real typing, caret moves, Enter presses and clicks. The additions reproduced on the 3.7.0 browser host: input detail carries `value` and `cursor`, caret insertion reports the insertion point, Enter fires `bindconfirm`, `maxlength="0"` keeps the field empty, typed text survives an unrelated `setData` while a changed bound value overwrites it, and form reset empties text, unchecks switches and groups and reports an empty slider value. Three observations differ from the independent engine implementation and stay recorded: a `bindinput` return value does not alter the displayed text on this host, input events do not reach ancestor view handlers, and a reset slider submits an empty string instead of its minimum. Native dialogs render as host overlays: `wx.showModal` resolves with `confirm` after the dialog's confirm button is activated and `wx.showActionSheet` reports the tapped index. A custom component with the built-in `wx://form-field` behavior contributes its `name` and `value` to the submitted form. On this host the behavior exposes `name` and `value` as properties, so `data` fields with the same names are overridden and must not be used. The three observations above need a developer-tool simulator run before becoming compatibility requirements.

## Expectations awaiting confirmation

The desktop baseline produced different results for 19 expected values. Keep the original expected and actual results when reporting these cases. They are excluded from the reproduced-expectation score.

| Area | Open observations |
| --- | --- |
| EventChannel | Removing one of two listeners by reference left both callbacks active in the baseline host. |
| File descriptors and paths | Open, positional reads and writes, closed descriptors, truncate by descriptor or path, and the asynchronous file-tree sequence need an independent host check. |
| File formats and digests | Brotli, ZIP entry reads and extraction, MD5, SHA-1 and SHA-256 require a host that returns file bytes and digests through the same public APIs. |
| Other host calls | Batch storage, random-byte generation and synchronously saving a downloaded temporary file returned a different shape or no usable value. |
| Navigation query | The 3.7.0 desktop host decodes URL query values before onLoad. The independent 3.7.12 simulator preserves their percent encoding. |

## Independent simulator cross-check

The 18 pending expectations were exercised directly in the developer-tool simulator with SDK **3.7.12**, using the same case functions and the page's `runSelected` method, which runs only the listed case IDs. The simulator supplied file, storage, random-byte and navigation operations. Two fresh runs produced the same results. The committed [observation record](fixtures/native-observations.json) includes every expected and actual value, the tool version and the tested suite commit. It contains the original 18 cases.

Seventeen expectations matched. This includes positional file reads and writes, descriptor and path truncation, closed descriptors, Brotli, ZIP entry reads and extraction, three digests, the asynchronous file-tree and descriptor sequences, batch storage, random-byte lengths, and synchronously saving a downloaded file.

For `channel.off-listener`, the receiver registered two callbacks, removed the first callback by reference, and emitted a message. Both callbacks still ran. The expected `["kept"]` was contradicted by the observed `["removed","kept"]`. This expectation requires further investigation before use as a compatibility requirement.

These observations establish results for **3.7.12**. The current tool's version picker offered 3.7.12, while requesting 3.7.0 in project configuration fell back to 3.18.0. The exact **3.7.0** reference table and score therefore retain their existing confirmation status.

The independent run also exposed missing page JSON files. Empty page configurations have been added for every previously unconfigured declared page so the standard simulator can register them.

## API inventory

The desktop host reported SDK **3.7.0**. Among the public declaration names checked, its `wx` object exposed **455 members** (451 functions and four objects), and its file-system manager exposed **45 methods**. The availability page checks each of those names and value types. A stub can pass an availability check. Only a behavioral case contributes to a behavioral score.

The [broader source catalog](https://github.com/wechat-miniprogram/api-typings/blob/e5dc50ccea71e7999a8aa8a942a6f68045e141ca/types/wx/lib.wx.api.d.ts) contains 1,261 member names across 74 interfaces with declared methods. It includes names outside the observed desktop surface. Nested interfaces that require hardware, a user gesture or a service session are listed without constructing them for inventory.

Run `node tools/coverage.cjs` for direct source references and the list of baseline names without one. Add `--json` for the per-member file map. This is a lexical inventory. A method can be referenced only during setup, accessed dynamically, or reached only after an earlier operation succeeds. Use runtime case reports for behavioral evidence.

## Remaining coverage

| Area | Missing or partial behavior |
| --- | --- |
| Framework and rendering | Advanced relation and generic combinations, theme change delivery, window resize events, and the remaining built-in components and their property, event and accessibility combinations. |
| Desktop APIs | Additional success, failure and cancellation paths, task listeners, media playback and decoding, maps, TCP/UDP, native UI and platform-specific branches. |
| Device integration | Camera and microphone hardware, background operation, BLE data exchange with a peripheral, NFC tags, Wi-Fi changes, device model and permission-denial paths. |
| Hosted services | Server-side login exchange, session expiry, cloud operations, subscriptions, advertisements and payment sandbox transactions. The login case checks the response shape only. |

Treat an unrun profile, an untested API and an interrupted case as distinct from a pass. Attach the JSON result and the implementation version to a compatibility claim.
