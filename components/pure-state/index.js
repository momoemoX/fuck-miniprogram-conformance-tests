Component({
  options: { pureDataPattern: /^_/ },
  data: { _counter: 1, visible: 3 },
  observers: {
    _counter(value) {
      if (this.changes) this.changes.push(value);
    },
  },
});
