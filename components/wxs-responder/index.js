Component({
  properties: {
    step: {
      type: Number,
      value: 1,
    },
  },
  lifetimes: {
    created() {
      this.stepLog = [];
      this.classLog = [];
    },
  },
  methods: {
    onWxsStep(payload) {
      this.stepLog.push(payload);
    },
    onWxsClass(payload) {
      this.classLog.push(payload.has);
    },
  },
});
