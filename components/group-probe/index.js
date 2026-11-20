Component({
  data: { value: 0 },
  methods: {
    onSeen(value) {
      (this.seen = this.seen || []).push(value);
    },
    takeSeen() {
      const seen = this.seen || [];
      this.seen = [];
      return seen;
    },
    separate(first, second) {
      this.setData({ value: first });
      this.setData({ value: second });
    },
    grouped(first, second) {
      this.groupSetData(() => {
        this.setData({ value: first });
        this.setData({ value: second });
      });
    },
  },
});
