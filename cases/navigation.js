const { call } = require('./support');

function waitFor(setup) {
  let timer;
  return new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Navigation did not complete')), 5000);
    setup(resolve, reject);
  }).finally(() => clearTimeout(timer));
}

async function navigation(check) {
  await check(
    'route.tab-rejects-navigate',
    ['fail', 'complete'],
    () =>
      new Promise(resolve => {
        const events = [];
        wx.navigateTo({
          url: '/pages/tab/index',
          success() {
            events.push('success');
          },
          fail() {
            events.push('fail');
          },
          complete() {
            events.push('complete');
            resolve(events);
          }
        });
      })
  );
  await check('route.switch-tab-reuses-page', [1, 1, 2, 1], async () => {
    const app = getApp(),
      seen = [];
    try {
      for (let i = 0; i < 2; i++) {
        const shown = waitFor(resolve => {
          app.tabJourney = resolve;
        });
        const [visit] = await Promise.all([shown, call(wx, 'switchTab', { url: '/pages/tab/index' })]);
        seen.push(visit, getCurrentPages().length);
        await call(wx, 'switchTab', { url: '/pages/suite/index' });
      }
      return seen;
    } finally {
      delete app.tabJourney;
      if (getCurrentPages().slice(-1)[0].route === 'pages/tab/index') await call(wx, 'switchTab', { url: '/pages/suite/index' });
    }
  });
  await check('route.redirect-replaces-top', ['arrive:first', 'depart:first', 'arrive:second', 2, 'depart:second'], async () => {
    const app = getApp(),
      events = [];
    let arrived;
    app.replacementJourney = {
      arrive(leg) {
        events.push('arrive:' + leg);
        arrived();
      },
      depart(leg) {
        events.push('depart:' + leg);
      }
    };
    try {
      for (const [method, leg] of [
        ['navigateTo', 'first'],
        ['redirectTo', 'second']
      ]) {
        const ready = waitFor(resolve => {
          arrived = resolve;
        });
        await Promise.all([ready, call(wx, method, { url: '/pages/transit/index?leg=' + leg })]);
      }
      events.push(getCurrentPages().length);
      await call(wx, 'navigateBack', { delta: 1 });
      return events;
    } finally {
      delete app.replacementJourney;
      if (getCurrentPages().slice(-1)[0].route === 'pages/transit/index') await call(wx, 'navigateBack', { delta: 1 });
    }
  });
}
module.exports = { navigation };
