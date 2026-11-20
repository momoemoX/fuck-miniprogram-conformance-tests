# Mini Program Base Library Conformance Tests

A black-box test suite for independent implementations of the Mini Program base library. The target is base library **3.7.12**, as run by the official WeChat developer-tool simulator. A case supplies an input, observes what an application can see, and compares it with a fixed expected value.

## Run

1. Open the repository root as a Mini Program project. Select base library **3.7.12** and launch `pages/suite/index` with a fresh page stack.
2. Tap **Run suite**. The navigation cases open another page and return automatically.
3. Read the expected and actual values for each case. **Show JSON report** exposes the case IDs, enabled profiles, reported SDK version and outcomes. Relaunch the project for another run.

The default run contains **468 automatic cases**, including 103 generated from the official component catalog. With both network fixtures enabled, it contains **482**. The suite app enables `"style": "v2"`, the component style most mini programs use. All of them reproduced in the 3.7.12 simulator baseline. Each result labels whether its expected value is a `Baseline-confirmed expectation (3.7.12)` (distinct from whether the tested implementation passed), and the summary also reports a score restricted to baseline-confirmed expectations plus a category breakdown (`Behavior` · `Shape` · `Quirk`, where known 3.7.12 runtime quirks such as `channel.off-listener` are tagged separately). An interrupted run has no final score.

Each case has 60 seconds, and each route transition inside it 10 seconds. A case that overruns is recorded as a failure and gets 15 more seconds to finish its cleanup; if cleanup is still pending after 15 seconds, or if a case leaves the page stack changed, the run stops as interrupted so late writes or a different page cannot contaminate later cases.

## Reproduce the baseline

The baseline comes from the official developer tool driven by `miniprogram-automator`. Log in to the tool and enable its service port (Settings → Security). Automation rejects the tourist AppID, so use an AppID that the logged-in account can open:

```sh
npm ci --prefix tools/devtools
node tools/devtools/run.cjs --appid <your AppID> --out report.json
```

The script runs a temporary copy of the repository, prints the simulator's SDK version and every failing case, and writes the JSON report. Add `--fixtures` after starting both network fixtures, `--ids a,b` for selected cases, and `--lib` for another base library. Current tool versions no longer load 3.7.0; requesting it falls back to a newer library, which is why the target is 3.7.12.

The component cases are generated from the attribute catalog that the developer tool ships for WXML completion; `COVERAGE.md` describes how to regenerate and re-record them with `tools/components/`.

## Visual references

The in-app cases measure component boxes and computed styles, but they can't see what a component draws inside its box. `fixtures/visual/` holds 61 reference screenshots of component renderings from the 3.7.12 simulator. Examples are a switch's track, a checked checkbox, image modes, audio controls, rich-text spacing and button types. Capture `pages/gallery/index?cell=<cell>` for each reference in your implementation, then compare:

```sh
npm ci --prefix tools/visual
node tools/visual/compare.cjs --candidate <directory of screenshots> --out diff
```

The comparison works with any device frame, zoom, pixel ratio or Display-P3 encoding; it font-masks only text-bearing cells while checking bounding boxes for glyph-only cells and preserving coloured text ink. `tools/visual/capture-browser.cjs` captures a browser-hosted implementation with Playwright. This layer is reported separately from the suite score; `COVERAGE.md` describes how the references were recorded and checked.

## Offline checks (CI)

Run all offline repository checks without launching the developer tool:

```sh
npm ci --prefix tools/visual
npm run check
```

This checks JavaScript syntax across the repository, verifies that `tools/components/generate.cjs` produces no uncommitted diff, verifies that `fixtures/reference.js` matches `fixtures/devtools-3.7.12-observations.json` (`node tools/reference.cjs --check`), and verifies that every committed visual reference fails on a blank white stage and distinguishes every component state from its default (`node tools/visual/verify.cjs`).

## Optional network fixtures

Run the HTTP fixture with Node.js:

```sh
node tools/http-fixture.mjs
```

For the socket echo fixture, run:

```sh
npm ci --prefix tools/socket
node tools/socket/echo.cjs
```

Set `fixtureUrl` and `socketUrl` in `suite-config.js` to addresses reachable from the test runtime. The defaults for a desktop test host are `http://127.0.0.1:8123` and `ws://127.0.0.1:8124`. For a remote test host, configure the fixture bind address with `HOST` and the port with `PORT`, and use an endpoint allowed by the runtime. Empty settings leave those cases out of the run.

## Other runs

| Entry | What it checks |
| --- | --- |
| Run input and gesture cases | Seventeen checks (expectations recorded on an earlier 3.7.0 host, not yet re-run on 3.7.12) for real text entry, caret movement, selected text range, confirm key, form submission including a custom form-field component, form reset, native dialog and action sheet, control values, event delivery between controls and views, and long press. Follow the instructions on the page. |
| Physical device cases | Nine checks for location, sensors, wireless adapters, battery and brightness. Use a test device connected to Wi-Fi, with Bluetooth enabled and the applicable permissions granted. |
| Hosted service cases | Three checks for account identity, login and settings. Configure a test app ID in the project and set the same value in `suite-config.js`. Login codes are discarded locally. |
| Inspect API availability | Compare public member names and value types with the 3.7.12 simulator baseline. Inspect the broader interface catalog and missing names. |

## Coverage and contributions

The [coverage notes](COVERAGE.md) describe the baseline, the expectations that changed when the target moved to 3.7.12, earlier cross-checks and gaps. To add a behavior, write a minimal case with an explicit expected result. Include the suite commit, implementation version, execution environment and enabled profiles when sharing results.

[MIT license](LICENSE)
