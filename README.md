# Mini Program Base Library Conformance Tests

A public suite for independent Mini Program base library implementations. The test project uses page, component, event, and navigation APIs. Each case compares an observable result with a fixed expectation.

## Run the suite

1. Open this directory as a Mini Program project in the implementation under test. The entry point is `app.json`. If your tool requires an app identifier, supply a test identifier in its local project settings.
2. Launch the first page and tap **Run suite**. The channel case opens a second page and returns to the results.
3. Read the summary and the expected and actual values for each case. A complete passing run shows **4/4 passed**. Start a fresh launch to run again.

For automation, perform the same launch and tap operations with your implementation's driver. Wait for the final summary on the first page. A crash, timeout, or missing summary is an incomplete run.

## Cases

| Case | Exercise | Expected observation |
| --- | --- | --- |
| `component.instance-data` | Append an entry to a nested array on one of two instances of the same component. Read both arrays. | The first contains `mint`; the second is empty. |
| `event.bubble` | Emit a bubbling custom event from a component with listeners at the source and two ancestors. | The listeners run in order: source, middle, outer. |
| `event.catch` | Repeat with a catching listener on the middle ancestor. | The source and middle listeners run, in order. |
| `channel.queued-order` | Send `oak` and `elm` from the opener before the destination subscribes, then send an end marker after subscription. | The receiver observes both queued entries, in order, before the marker. |

## Reporting and contributing

Include the suite commit, implementation version, target base library version, runtime environment, and each case result. A passing run covers the behaviors in the table.

For a new case, provide a minimal setup, the operation to perform, and an explicit expected result. Keep implementation-specific launch and automation code outside the test project.

## License

[MIT](LICENSE)
