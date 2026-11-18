worker.onMessage((input) => {
  worker.postMessage([input.numbers.reduce((sum, value) => sum + value, 0), input.label]);
});
