const { channelOrder, subscriptions } = require("../../cases/channel");

const { framework } = require("../../cases/framework");
const { files } = require("../../cases/files");
const { platform } = require("../../cases/platform");
const { storage, binary } = require("../../cases/data");
const { http } = require("../../cases/http");
const { rendering } = require("../../cases/render");
const { routes } = require("../../cases/routes");
const { makeReport, TARGET } = require("../../cases/report");
const { update, delay } = require("../../cases/support");
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
const { pageScrollContract } = require("../../cases/page-scroll");
const { componentCatalog } = require("../../cases/component-catalog");
const { promiseContract } = require("../../cases/promise-contract");
const { wxsResponder } = require("../../cases/wxs-responder");
const { modelContract } = require("../../cases/model-contract");
const { eventAdvanced } = require("../../cases/event-advanced");
const { componentPage } = require("../../cases/component-page");
const { componentOptions } = require("../../cases/component-options");
const { subpackageAsync } = require("../../cases/subpackage-async");
const config = require("../../suite-config");

// Fails fast when the primitives every case depends on are unavailable.
async function preflight(page) {
  const within = (promise, what) =>
    Promise.race([
      promise,
      delay(3000).then(() => {
        throw new Error("Harness preflight failed: " + what + " did not complete");
      }),
    ]);
  await within(delay(1), "setTimeout");
  await within(update(page, { preflight: true }), "setData callback");
  if (page.data.preflight !== true) throw new Error("Harness preflight failed: setData did not apply");
}

Page({
  data: {
    preflight: false,
    wxsResponderMounted: false,
    wxsResponderStep: 1,
    modelMounted: false,
    modelText: "seed",
    modelCount: 5,
    eventAdvMounted: false,
    virtualHostMounted: false,
    globalClassMounted: false,
    styleSharedMounted: false,
    stylePageApplyMounted: false,
    treeRelMounted: false,
    treeOrder: ["first", "second"],
    asyncWidgetMounted: false,
    galleryMounted: false,
    galleryFont: "",
    target: TARGET,
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
    let interrupted = null;
    try {
      // The harness itself relies on timers, promises and setData callbacks. Without
      // them every case would stall until its timeout, so stop with a clear reason.
      await preflight(this);
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
      await pageScrollContract(this, check);
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
      await componentCatalog(this, check);
      await promiseContract(check);
      await wxsResponder(this, check);
      await modelContract(this, check);
      await eventAdvanced(this, check);
      await componentPage(check);
      await componentOptions(this, check);
      await subpackageAsync(this, check);
      if (config.socketUrl) await sockets(config.socketUrl, check);
      if (config.fixtureUrl) await http(config.fixtureUrl, check);
    } catch (error) {
      interrupted = String(error && error.message ? error.message : error);
    }

    let reportedSDK = null;
    try {
      reportedSDK = wx.getAppBaseInfo().SDKVersion || null;
    } catch {
      /* A partial implementation can still produce a case report. */
    }
    this.report = {
      target: TARGET,
      interrupted,
      reportedSDK,
      profiles: { core: true, http: !!config.fixtureUrl, socket: !!config.socketUrl },
      breakdown: report.breakdown(),
      results: report.results,
    };
    this.setData({
      results: report.results,
      summary: interrupted ? "Interrupted: " + interrupted : report.summary(),
      baselineScore: interrupted ? "No final score for an interrupted run" : report.baselineScore(),
      breakdownSummary: interrupted ? "" : report.breakdownSummary(),
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
  waitForInputTrace(length, timeout = 3000) {
    if (!this.inputTrace) this.inputTrace = [];
    if (this.inputTrace.length >= length) return Promise.resolve();
    if (!this.inputWaiters) this.inputWaiters = [];
    return new Promise((resolve, reject) => {
      const waiter = { length, resolve };
      this.inputWaiters.push(waiter);
      setTimeout(() => {
        this.inputWaiters = this.inputWaiters.filter((entry) => entry !== waiter);
        reject(new Error("Expected " + length + " input events, got " + this.inputTrace.length));
      }, timeout);
    });
  },

  getScrollEvents() {
    return this.scrollEvents || [];
  },

  onPageScroll(event) {
    if (!this.pageScrollTrace) this.pageScrollTrace = [];
    this.pageScrollTrace.push(Math.round(event.scrollTop));
  },
  onReachBottom() {
    if (this.pageScrollTrace) this.pageScrollTrace.push("bottom");
  },
  onPullDownRefresh() {
    if (this.pullDownTrace) this.pullDownTrace.push("refresh");
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

  recordAdvEvent(at, event) {
    const app = getApp();
    if (app.advEventTrace) {
      app.advEventTrace.push({ at, mark: Object.assign({}, event.mark || {}) });
    }
  },
  advBindHost(event) {
    this.recordAdvEvent("bind-host", event);
  },
  advMutMid(event) {
    this.recordAdvEvent("mut-mid", event);
  },
  advMutOuter(event) {
    this.recordAdvEvent("mut-outer", event);
  },
  advBindOuter(event) {
    this.recordAdvEvent("bind-outer", event);
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
