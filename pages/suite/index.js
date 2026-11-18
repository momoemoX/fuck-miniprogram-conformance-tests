const { channelOrder, subscriptions } = require("../../cases/channel");

const { framework } = require("../../cases/framework");
const { files } = require("../../cases/files");
const { platform } = require("../../cases/platform");
const { storage, binary } = require("../../cases/data");
const { http } = require("../../cases/http");
const { rendering } = require("../../cases/render");
const { routes } = require("../../cases/routes");
const { makeReport } = require("../../cases/report");
const { descriptors } = require("../../cases/descriptors");
const { extended } = require("../../cases/extended");
const { composition } = require("../../cases/composition");
const { formats } = require("../../cases/file-formats");
const { sockets } = require("../../cases/socket");
const { controls } = require("../../cases/controls");
const { system } = require("../../cases/system");
const { structure } = require("../../cases/structure");
const { navigation } = require("../../cases/navigation");
const { componentContract } = require("../../cases/component-contract");
const { eventBoundary } = require("../../cases/event-boundary");
const { templateContract } = require("../../cases/template-contract");
const { definitionContract } = require("../../cases/definition-contract");
const { moduleContract } = require("../../cases/module-contract");
const { lifecycleContract } = require("../../cases/lifecycle-contract");
const { reuseContract } = require("../../cases/reuse-contract");
const { errorContract } = require("../../cases/error-contract");
const { appContract } = require("../../cases/app-contract");
const { wxsState } = require("../../cases/wxs-state");
const { inputContract } = require("../../cases/input-contract");
const { componentExtra } = require("../../cases/component-extra");
const { scrollContract } = require("../../cases/scroll-contract");
const { observerContract } = require("../../cases/observer-contract");
const config = require("../../suite-config");

Page({
  data: {
    reuseMounted: false,
    errorMounted: false,
    wxsMounted: false,
    wxsProbeMode: "write",
    wxsPageStep: 0,
    focusA: false,
    focusB: false,
    focusValue: "",
    boundInput: "",
    plpMounted: false,
    animData: null,
    multiSlotMounted: false,
    multiSlotItems: [],
    scrollTopValue: 0,
    scrollIntoTarget: "",
    watchedTop: "1500px",
    definitionMounted: false,
    definitionInputs: {},
    templateMounted: false,
    boundaryMounted: false,
    contractMounted: false,
    contractCount: 0,
    amount: 31,
    appleVisible: true,
    extClass: "small-external",
    started: false,
    summary: "Ready",
    results: [],
    title: "raw",
    recipe: { notes: ["a", "b"] },
    fruit: ["pear", "plum"],
    hot: false,
    mounted: true,
    seasoning: "sweet",
    matrix: [{ x: 1, tag: "x" }, { x: 2 }],
    groups: [
      { label: "a", items: [1, 2] },
      { label: "b", items: [3] },
    ],
    pairs: { a: 2, b: 5 },
    templateName: "alpha",
    wide: false,
    outlet: "lead",
    invisible: false,
    branch: true,
    submitted: { value: 0 },
    control: {
      button: false,
      switch: false,
      slider: 0,
      progress: 0,
      checkbox: false,
      radio: false,
      input: 10,
      textarea: 10,
      picker: 0,
      text: false,
      image: "aspectFit",
      swiper: 200,
    },
    profiles: [
      "Core",
      config.fixtureUrl ? "HTTP enabled" : "HTTP skipped",
      config.socketUrl ? "Socket enabled" : "Socket skipped",
    ].join(" · "),
  },

  async run() {
    if (this.data.started) return;
    this.setData({ started: true, summary: "Running" });
    const report = makeReport(this.selectedIds);
    const { check } = report;

    await check("component.instance-data", [["mint"], []], () => {
      const first = this.selectComponent("#first");
      const second = this.selectComponent("#second");
      first.append("mint");
      return [first.snapshot(), second.snapshot()];
    });

    await check("event.bubble", ["source", "middle", "outer"], () => this.traceNotice("#bubbling"));
    await check("event.catch", ["source", "middle"], () => this.traceNotice("#stopped"));
    await check("channel.queued-order", ["oak", "elm"], channelOrder);

    await subscriptions(check);
    await errorContract(this, check);
    await appContract(check);
    await moduleContract(check);
    await lifecycleContract(check);
    await wxsState(this, check);
    await inputContract(this, check);
    await componentExtra(this, check);
    await scrollContract(this, check);
    await observerContract(this, check);
    await framework(this, check);
    await composition(this, check);
    await structure(this, check);
    await componentContract(this, check);
    await eventBoundary(this, check);
    await templateContract(this, check);
    await definitionContract(this, check);
    await reuseContract(this, check);
    await controls(this, check);
    await rendering(this, check);
    await routes(check);
    await navigation(check);
    await storage(check);
    await binary(check);
    await files(check);
    await descriptors(check);
    await formats(check);
    await platform(check);
    await extended(this, check);
    await system(check);
    if (config.socketUrl) await sockets(config.socketUrl, check);
    if (config.fixtureUrl) await http(config.fixtureUrl, check);

    let reportedSDK = null;
    try {
      reportedSDK = wx.getAppBaseInfo().SDKVersion || null;
    } catch {
      /* A partial implementation can still produce a case report. */
    }
    this.report = {
      target: "3.7.0",
      reportedSDK,
      profiles: { core: true, http: !!config.fixtureUrl, socket: !!config.socketUrl },
      results: report.results,
    };
    this.setData({
      results: report.results,
      summary: report.summary(),
      baselineScore: report.baselineScore(),
    });
  },

  onLoad() {
    const app = getApp();
    if (app && app.bootTrace) app.bootTrace.push("page.load");
  },

  // Diagnostic hook: runs only the listed case IDs. Used to re-check pending
  // expectations in a specific implementation without a full run.
  async runSelected(ids) {
    this.selectedIds = ids;
    await this.run();
  },

  boomLeaf() {
    if (this.errorTrace) this.errorTrace.push("leaf");
  },
  boomInner() {
    if (this.errorTrace) this.errorTrace.push("inner");
    if (this.throwInnerBoom) throw new Error("suite-boom-marker");
  },
  boomOuter() {
    if (this.errorTrace) this.errorTrace.push("outer");
  },

  onFocusA(event) {
    this.pushInputTrace(["focus", typeof event.detail.height === "number", typeof event.detail.value === "string"]);
  },
  onBlurA(event) {
    this.pushInputTrace(["blur", typeof event.detail.height === "number", typeof event.detail.value === "string"]);
  },
  onFocusB(event) {
    this.pushInputTrace(["focus", typeof event.detail.height === "number", typeof event.detail.value === "string"]);
  },
  onBlurB(event) {
    this.pushInputTrace(["blur", typeof event.detail.height === "number", typeof event.detail.value === "string"]);
  },
  pushInputTrace(entry) {
    if (!this.inputTrace) this.inputTrace = [];
    this.inputTrace.push(entry);
    if (this.inputWaiters) {
      const length = this.inputTrace.length;
      this.inputWaiters = this.inputWaiters.filter((waiter) => {
        if (length >= waiter.length) {
          waiter.resolve();
          return false;
        }
        return true;
      });
    }
  },
  waitForInputTrace(length) {
    if (!this.inputTrace) this.inputTrace = [];
    if (this.inputTrace.length >= length) return Promise.resolve();
    if (!this.inputWaiters) this.inputWaiters = [];
    return new Promise((resolve) => this.inputWaiters.push({ length, resolve }));
  },

  getScrollEvents() {
    return this.scrollEvents || [];
  },

  onScrollFixture(event) {
    if (!this.scrollEvents) this.scrollEvents = [];
    this.scrollEvents.push({
      top: Math.round(event.detail.scrollTop),
      height: Math.round(event.detail.scrollHeight),
    });
  },

  boundaryHost(event) {
    getApp().boundaryTrace.push(["host", event.detail.value]);
    if (this.boundaryTargets) this.boundaryTargets.push(event.target.id, event.currentTarget.id);
    if (this.boundaryDatasets) {
      this.boundaryDatasets.push(event.target.dataset.kind, event.currentTarget.dataset.kind);
    }
  },

  boundaryAncestor(event) {
    getApp().boundaryTrace.push(["ancestor", event.detail.value]);
    if (this.boundaryTargets) this.boundaryTargets.push(event.currentTarget.id);
  },

  showReport() {
    this.setData({ reportText: JSON.stringify(this.report) });
  },

  traceNotice(selector) {
    this.trace = [];
    this.selectComponent(selector).announce();
    return this.trace.slice();
  },

  savePayload(event) {
    this.lastNotice = event.detail;
  },
  outerCapture() {
    this.trace.push("outer-capture");
  },
  middleCapture() {
    this.trace.push("middle-capture");
  },
  source() {
    this.trace.push("source");
  },
  middle() {
    this.trace.push("middle");
  },
  outer() {
    this.trace.push("outer");
  },
});
