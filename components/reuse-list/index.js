Component({
  data: {
    visible: true,
    hidden: false,
    caption: "initial",
    rows: [
      { code: "a", label: "Alpha" },
      { code: "b", label: "Beta" },
      { code: "c", label: "Gamma" },
    ],
    positions: [
      { code: "a", label: "Alpha" },
      { code: "b", label: "Beta" },
      { code: "c", label: "Gamma" },
    ],
    others: [
      { code: "a", label: "Other Alpha" },
      { code: "b", label: "Other Beta" },
    ],
  },
  lifetimes: {
    created() {
      this.transitions = [];
    },
  },
  methods: {
    record(phase, kind, code) {
      this.transitions.push({ phase, kind, code });
    },
    receive(event) {
      this.lastEvent = {
        code: event.detail.code,
        draft: event.detail.draft,
        position: event.currentTarget.dataset.position,
      };
    },
  },
});
