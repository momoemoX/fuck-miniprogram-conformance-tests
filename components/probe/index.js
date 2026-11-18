Component({
  data: {
    ledger: { entries: [] }
  },

  methods: {
    append(value) {
      this.data.ledger.entries.push(value);
    },

    snapshot() {
      return this.data.ledger.entries.slice();
    },

    announce() {
      this.triggerEvent('notice', {}, { bubbles: true });
    }
  }
});
