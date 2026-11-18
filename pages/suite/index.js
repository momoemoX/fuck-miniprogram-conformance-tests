const { channelOrder } = require('../../cases/channel');

Page({
  data: { started: false, summary: 'Ready', results: [] },

  async run() {
    if (this.data.started) return;
    this.setData({ started: true, summary: 'Running' });
    const results = [];

    async function check(id, expected, exercise) {
      let actual;
      let passed = false;
      try {
        actual = JSON.stringify(await exercise());
        passed = actual === JSON.stringify(expected);
      } catch (error) {
        actual = String(error);
      }
      results.push({ id, status: passed ? 'PASS' : 'FAIL', expected: JSON.stringify(expected), actual });
    }

    await check('component.instance-data', [['mint'], []], () => {
      const first = this.selectComponent('#first');
      const second = this.selectComponent('#second');
      first.append('mint');
      return [first.snapshot(), second.snapshot()];
    });

    await check('event.bubble', ['source', 'middle', 'outer'], () => this.traceNotice('#bubbling'));
    await check('event.catch', ['source', 'middle'], () => this.traceNotice('#stopped'));
    await check('channel.queued-order', ['oak', 'elm'], channelOrder);

    const passed = results.filter(result => result.status === 'PASS').length;
    this.setData({ results, summary: passed + '/' + results.length + ' passed' });
  },

  traceNotice(selector) {
    this.trace = [];
    this.selectComponent(selector).announce();
    return this.trace.slice();
  },

  source() { this.trace.push('source'); },
  middle() { this.trace.push('middle'); },
  outer() { this.trace.push('outer'); }
});
