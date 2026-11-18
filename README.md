# Mini Program Base Library Conformance Tests

A black-box test suite for independent implementations of the Mini Program base library. The target is **3.7.0**. A case supplies an input, observes what an application can see, and compares it with a fixed expected value.

## Run

1. Open the repository root as a Mini Program project. Select base library **3.7.0** and launch `pages/suite/index` with a fresh page stack.
2. Tap **Run suite**. The navigation cases open another page and return automatically.
3. Read the expected and actual values for each case. **Show JSON report** exposes the case IDs, enabled profiles, reported SDK version and outcomes. Relaunch the project for another run.

The default run contains **284 automatic cases**. With both network fixtures enabled, it contains **298**. The page also reports a score restricted to expectations reproduced in the desktop baseline. Cases pending confirmation remain visible. An interrupted run has no final score.

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
| Run input and gesture cases | Six checks for real text entry, form submission, control values and long press. Follow the instructions on the page. |
| Physical device cases | Nine checks for location, sensors, wireless adapters, battery and brightness. Use a test device connected to Wi-Fi, with Bluetooth enabled and the applicable permissions granted. |
| Hosted service cases | Three checks for account identity, login and settings. Configure a test app ID in the project and set the same value in `suite-config.js`. Login codes are discarded locally. |
| Inspect API availability | Compare public member names and value types with the desktop baseline. Inspect the broader interface catalog and missing names. |

## Coverage and contributions

The [coverage notes](COVERAGE.md) describe the baseline observations, the independent 3.7.12 simulator cross-check, outstanding disagreements and gaps. To add a behavior, write a minimal case with an explicit expected result. Include the suite commit, implementation version, execution environment and enabled profiles when sharing results.

[MIT license](LICENSE)
