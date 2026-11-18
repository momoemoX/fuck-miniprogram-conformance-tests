const { channelOrder, subscriptions } = require('../../cases/channel');

const { framework } = require('../../cases/framework');
const { files } = require('../../cases/files');
const { platform } = require('../../cases/platform');
const { storage, binary } = require('../../cases/data');
const { http } = require('../../cases/http');
const { rendering } = require('../../cases/render');
const { routes } = require('../../cases/routes');
const { makeReport } = require('../../cases/report');
const { descriptors } = require('../../cases/descriptors');
const { extended } = require('../../cases/extended');
const { composition } = require('../../cases/composition');
const { formats } = require('../../cases/file-formats');
const { sockets } = require('../../cases/socket');
const { controls } = require('../../cases/controls');
const { system } = require('../../cases/system');
const { structure } = require('../../cases/structure');
const { navigation } = require('../../cases/navigation');
const config = require('../../suite-config');

Page({
  data: {
    amount: 31,
    appleVisible: true,
    extClass: 'small-external',
    started: false,
    summary: 'Ready',
    results: [],
    title: 'raw',
    recipe: { notes: ['a', 'b'] },
    fruit: ['pear', 'plum'],
    hot: false,
    mounted: true,
    seasoning: 'sweet',
    matrix: [{ x: 1, tag: 'x' }, { x: 2 }],
    groups: [
      { label: 'a', items: [1, 2] },
      { label: 'b', items: [3] }
    ],
    pairs: { a: 2, b: 5 },
    templateName: 'alpha',
    wide: false,
    outlet: 'lead',
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
      image: 'aspectFit',
      swiper: 200
    },
    profiles: ['Core', config.fixtureUrl ? 'HTTP enabled' : 'HTTP skipped', config.socketUrl ? 'Socket enabled' : 'Socket skipped'].join(
      ' · '
    )
  },

  async run() {
    if (this.data.started) return;
    this.setData({ started: true, summary: 'Running' });
    const report = makeReport();
    const { check } = report;

    await check('component.instance-data', [['mint'], []], () => {
      const first = this.selectComponent('#first');
      const second = this.selectComponent('#second');
      first.append('mint');
      return [first.snapshot(), second.snapshot()];
    });

    await check('event.bubble', ['source', 'middle', 'outer'], () => this.traceNotice('#bubbling'));
    await check('event.catch', ['source', 'middle'], () => this.traceNotice('#stopped'));
    await check('channel.queued-order', ['oak', 'elm'], channelOrder);

    await subscriptions(check);
    await framework(this, check);
    await composition(this, check);
    await structure(this, check);
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
      target: '3.7.0',
      reportedSDK,
      profiles: { core: true, http: !!config.fixtureUrl, socket: !!config.socketUrl },
      results: report.results
    };
    this.setData({
      results: report.results,
      summary: report.summary(),
      baselineScore: report.baselineScore()
    });
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
    this.trace.push('outer-capture');
  },
  middleCapture() {
    this.trace.push('middle-capture');
  },
  source() {
    this.trace.push('source');
  },
  middle() {
    this.trace.push('middle');
  },
  outer() {
    this.trace.push('outer');
  }
});
