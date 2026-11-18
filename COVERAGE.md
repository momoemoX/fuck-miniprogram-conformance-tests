# Coverage for base library 3.7.0

## Executable suite

| Group | Cases | Evidence collected |
| --- | ---: | --- |
| Core | 258 | App, page and component state, lifetimes, behaviors, component relations, generic substitution, observers, event propagation, templates, WXS, slots, styles, built-in control properties, selectors, navigation, tab caching, redirect replacement, subpackages, worker messages, system and UI callbacks, storage, file operations, codecs, archives, canvas and audio context identity. |
| HTTP fixture | 12 | Request parameters, JSON and binary bodies, response headers, HTTP errors, cancellation, multipart upload, file download and saved-file lifecycle. |
| WebSocket fixture | 2 | Text and binary round trips, followed by a normal close. |
| Interactive input | 6 | Input detail, submitted text, radio, checkbox and switch values, plus long-press ordering. |
| Physical device | 9 | Location, accelerometer, compass, gyroscope, device motion, battery, brightness, Bluetooth adapter state and Wi-Fi association. |
| Hosted services | 3 | Test app identity, nonempty login code and authorization settings shape. |

Core, HTTP and WebSocket cases ran on two desktop implementations. In the host configured for SDK 3.7.0, 254 of the 272 expected values were reproduced. The comparison runtime matched 242 of those 254. Both desktop environments passed the six interactive input checks through UI automation. Physical-device and hosted-service checks still require execution in their respective environments.

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

## Expectations awaiting confirmation

The desktop baseline produced different results for 18 expected values. Keep the original expected and actual results when reporting these cases. They are excluded from the reproduced-expectation score.

| Area | Open observations |
| --- | --- |
| EventChannel | Removing one of two listeners by reference left both callbacks active in the baseline host. |
| File descriptors and paths | Open, positional reads and writes, closed descriptors, truncate by descriptor or path, and the asynchronous file-tree sequence need an independent host check. |
| File formats and digests | Brotli, ZIP entry reads and extraction, MD5, SHA-1 and SHA-256 require a host that returns file bytes and digests through the same public APIs. |
| Other host calls | Batch storage, random-byte generation and synchronously saving a downloaded temporary file returned a different shape or no usable value. |

## API inventory

The desktop host reported SDK **3.7.0**. Among the public declaration names checked, its `wx` object exposed **455 members** (451 functions and four objects), and its file-system manager exposed **45 methods**. The availability page checks each of those names and value types. A stub can pass an availability check. Only a behavioral case contributes to a behavioral score.

The [broader source catalog](https://github.com/wechat-miniprogram/api-typings/blob/e5dc50ccea71e7999a8aa8a942a6f68045e141ca/types/wx/lib.wx.api.d.ts) contains 1,261 member names across 74 interfaces with declared methods. It includes names outside the observed desktop surface. Nested interfaces that require hardware, a user gesture or a service session are listed without constructing them for inventory.

Run `node tools/coverage.cjs` for direct source references and the list of baseline names without one. Add `--json` for the per-member file map. This is a lexical inventory. A method can be referenced only during setup, accessed dynamically, or reached only after an earlier operation succeeds. Use runtime case reports for behavioral evidence.

## Remaining coverage

| Area | Missing or partial behavior |
| --- | --- |
| Framework and rendering | Advanced relation and generic combinations, error recovery, platform-specific styling, and the remaining built-in components and their property, event and accessibility combinations. |
| Desktop APIs | Additional success, failure and cancellation paths, task listeners, media playback and decoding, maps, TCP/UDP, native UI and platform-specific branches. |
| Device integration | Camera and microphone hardware, background operation, BLE data exchange with a peripheral, NFC tags, Wi-Fi changes, device model and permission-denial paths. |
| Hosted services | Server-side login exchange, session expiry, cloud operations, subscriptions, advertisements and payment sandbox transactions. The login case checks the response shape only. |

Treat an unrun profile, an untested API and an interrupted case as distinct from a pass. Attach the JSON result and the implementation version to a compatibility claim.
