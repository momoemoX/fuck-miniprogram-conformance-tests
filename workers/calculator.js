worker.onMessage((input) => {
  if (input.shapes) {
    worker.postMessage({ shapes: input.shapes });
    return;
  }
  worker.postMessage([input.numbers.reduce((sum, value) => sum + value, 0), input.label]);
});
