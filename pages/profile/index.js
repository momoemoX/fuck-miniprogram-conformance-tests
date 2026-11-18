const { makeReport } = require("../../cases/report");
const { device } = require("../../cases/device");
const { services } = require("../../cases/services");
const { hardware } = require("../../cases/hardware");
const config = require("../../suite-config");

Page({
  data: {
    profile: "",
    instructions: "",
    available: false,
    started: false,
    summary: "Not run",
    results: [],
  },
  onLoad(options) {
    if (options.kind === "device") {
      this.setData({
        profile: "Physical device",
        available: true,
        instructions:
          "Run on a test device. Connect to Wi-Fi and enable Bluetooth. Allow location, motion and wireless access. Only range checks and result statuses are displayed.",
      });
    } else if (options.kind === "service") {
      this.setData({
        profile: "Hosted services",
        available: !!config.testAppId,
        instructions:
          "Use a test account and set testAppId in suite-config.js. This run requests a login code and discards it locally.",
      });
    }
  },
  async run() {
    if (!this.data.available || this.data.started) return;
    this.setData({ started: true, summary: "Running" });
    const report = makeReport();
    if (this.data.profile === "Physical device") {
      await device(report.check);
      await hardware(report.check);
    } else await services(config.testAppId, report.check);
    this.setData({ summary: report.summary(), results: report.results });
  },
});
