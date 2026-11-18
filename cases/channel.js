// Navigation success and the destination's onReady may occur in either order.
function exchange(exercise) {
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
    timer = setTimeout(() => reject(new Error("Timed out waiting for channel delivery")), 10000);
  });
  const sender = new Promise((resolve, reject) => {
    wx.navigateTo({
      url: "/pages/receiver/index",
      success: (result) => resolve(result.eventChannel),
      fail: (error) => reject(new Error(error.errMsg)),
    });
  });

  let active = true;
  const delivery = Promise.all([sender, receiver]).then(([outgoing, incoming]) => {
    if (!active) return;
    return exercise(outgoing, incoming);
  });

  return Promise.race([delivery, deadline]).finally(async () => {
    active = false;
    clearTimeout(timer);
    delete app.channelProbe;
    const pages = getCurrentPages();
    if (pages[pages.length - 1].route === "pages/receiver/index") {
      await new Promise((resolve, reject) =>
        wx.navigateBack({
          success: resolve,
          fail: (error) => reject(new Error(error.errMsg)),
        }),
      );
    }
  });
}

function channelOrder() {
  return exchange((outgoing, incoming) => {
    const messages = [];
    outgoing.emit("entry", "oak");
    outgoing.emit("entry", "elm");

    return new Promise((resolve) => {
      incoming.on("entry", (value) => {
        if (value === "end") resolve(messages.slice());
        else messages.push(value);
      });
      outgoing.emit("entry", "end");
    });
  });
}

async function subscriptions(check) {
  await check("channel.once", ["one"], () =>
    exchange((sender, receiver) => {
      const seen = [];
      receiver.once("signal", (value) => seen.push(value));
      sender.emit("signal", "one");
      sender.emit("signal", "two");
      return seen;
    }),
  );
  await check("channel.off-listener", ["kept"], () =>
    exchange((sender, receiver) => {
      const seen = [];
      const removed = () => seen.push("removed");
      receiver.on("signal", removed);
      receiver.on("signal", () => seen.push("kept"));
      receiver.off("signal", removed);
      sender.emit("signal");
      return seen;
    }),
  );
  await check("channel.reverse-direction", ["reply", 3], () =>
    exchange((opener, destination) => {
      const seen = [];
      opener.on("answer", (name, count) => seen.push(name, count));
      destination.emit("answer", "reply", 3);
      return seen;
    }),
  );
}

module.exports = { channelOrder, subscriptions };
