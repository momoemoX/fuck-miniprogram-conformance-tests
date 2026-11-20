Component({
  properties: {
    step: {
      type: Number,
      value: 1,
    },
    payload: {
      type: Object,
      value: null,
    },
  },
  lifetimes: {
    created() {
      this.stepLog = [];
      this.classLog = [];
      this.payloadLog = [];
    },
  },
  methods: {
    onWxsStep(payload) {
      this.stepLog.push(payload);
    },
    onWxsClass(payload) {
      this.classLog.push(payload.has);
    },
    onWxsPayload(entry) {
      this.payloadLog.push(entry);
    },
  },
});
