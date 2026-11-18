// Navigation success and the destination's onReady may occur in either order.
function channelOrder() {
  const app = getApp();
  let receiverReady;
  let failed;
  const receiver = new Promise((resolve, reject) => {
    receiverReady = resolve;
    failed = reject;
  });
  app.channelProbe = { receiverReady, failed };

  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timed out waiting for channel delivery')), 10000);
  });
  const sender = new Promise((resolve, reject) => {
    wx.navigateTo({
      url: '/pages/receiver/index',
      success: result => resolve(result.eventChannel),
      fail: error => reject(new Error(error.errMsg))
    });
  });

  let active = true;
  const delivery = Promise.all([sender, receiver]).then(([outgoing, incoming]) => {
    if (!active) return;
    const messages = [];
    outgoing.emit('entry', 'oak');
    outgoing.emit('entry', 'elm');

    return new Promise(resolve => {
      incoming.on('entry', value => {
        if (value === 'end') resolve(messages.slice());
        else messages.push(value);
      });
      outgoing.emit('entry', 'end');
    });
  });

  return Promise.race([delivery, deadline]).finally(async () => {
    active = false;
    clearTimeout(timer);
    delete app.channelProbe;
    const pages = getCurrentPages();
    if (pages[pages.length - 1].route === 'pages/receiver/index') {
      await new Promise((resolve, reject) => wx.navigateBack({
        success: resolve,
        fail: error => reject(new Error(error.errMsg))
      }));
    }
  });
}

module.exports = { channelOrder };
