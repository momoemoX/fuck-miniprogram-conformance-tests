# Mini Program Base Library Conformance Tests

A shared test suite for independent implementations of the Mini Program base library. Each case describes an observable behavior so that anyone building a runtime can check it against the same expectations.

## Project status

Executable test cases and a runner are planned. The suite does not yet produce conformance results.

## Contributing a test case

Choose one behavior and describe the setup, the action to perform, and the expected result. For example, a callback-order test can record each callback as it runs and assert the exact sequence. Include the applicable base library versions and any environment requirements so others can reproduce the case.

## Reporting results

Record the implementation version, target base library version, test suite commit, and runtime environment. Report passed, failed, and skipped cases separately. A passing run demonstrates compatibility with the behaviors exercised by those cases in that environment.

## License

[MIT](LICENSE)
