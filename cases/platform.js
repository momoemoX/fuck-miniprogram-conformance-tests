const { call } = require("./support");

async function platform(check) {
  await check("system.window-dimensions", [true, true, true], () => {
    const info = wx.getWindowInfo();
    return [info.windowWidth > 0, info.windowHeight > 0, info.pixelRatio > 0];
  });
  await check("system.device-platform", true, () => {
    const info = wx.getDeviceInfo();
    return typeof info.platform === "string" && info.platform.length > 0;
  });
  await check("system.api-capability", [true, false], () => [
    wx.canIUse("getStorageSync"),
    wx.canIUse("nonexistentSuiteMethod"),
  ]);
  await check("system.async-window", true, async () => {
    const sync = wx.getSystemInfoSync();
    const asyncInfo = await call(wx, "getSystemInfo");
    return sync.windowWidth > 0 && sync.windowWidth === asyncInfo.windowWidth;
  });
  await check("network.type-result", true, async () => {
    const response = await call(wx, "getNetworkType");
    return typeof response.networkType === "string" && response.networkType.length > 0;
  });
  await check("audio.recorder-singleton", true, () => {
    const manager = wx.getRecorderManager();
    return !!manager && manager === wx.getRecorderManager();
  });
  await check("audio.background-singleton", true, () => {
    const manager = wx.getBackgroundAudioManager();
    return !!manager && manager === wx.getBackgroundAudioManager();
  });
  await check("audio.independent-contexts", [true, 0.25, 0.75], () => {
    const first = wx.createInnerAudioContext();
    try {
      const second = wx.createInnerAudioContext();
      try {
        first.volume = 0.25;
        second.volume = 0.75;
        return [first !== second, first.volume, second.volume];
      } finally {
        second.destroy();
      }
    } finally {
      first.destroy();
    }
  });
  await check("animation.step-snapshot", 2, () => {
    const animation = wx.createAnimation({ duration: 100 });
    animation.opacity(0.5).step();
    animation.translateX(12).step();
    return animation.export().actions.length;
  });
  await check(
    "worker.message-roundtrip",
    [6, "seed"],
    () =>
      new Promise((resolve, reject) => {
        const worker = wx.createWorker("workers/calculator.js");
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error("Worker response timed out"));
        }, 4000);
        worker.onMessage((message) => {
          clearTimeout(timeout);
          worker.terminate();
          resolve(message);
        });
        worker.postMessage({ numbers: [1, 2, 3], label: "seed" });
      }),
  );
}
module.exports = { platform };
