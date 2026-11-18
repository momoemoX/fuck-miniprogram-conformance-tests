const { call } = require("./support");

async function system(check) {
  await check("system.sync-and-split", [true, true, true], () => {
    const all = wx.getSystemInfoSync(),
      win = wx.getWindowInfo(),
      device = wx.getDeviceInfo();
    return [
      all.platform === device.platform,
      all.screenWidth === win.screenWidth,
      all.pixelRatio === win.pixelRatio,
    ];
  });
  await check("system.async-callback", true, async () => {
    const result = await call(wx, "getSystemInfoAsync");
    return result.windowWidth === wx.getWindowInfo().windowWidth;
  });
  await check("system.enter-path", "pages/suite/index", () => wx.getEnterOptionsSync().path);
  await check("system.app-language", true, () => {
    const info = wx.getAppBaseInfo();
    return typeof info.language === "string" && info.language.length > 0;
  });
  await check("system.safe-area", true, () => {
    const bounds = wx.getWindowInfo();
    const { left, right, top, bottom } = bounds.safeArea;
    return (
      left >= 0 &&
      top >= 0 &&
      right > left &&
      bottom > top &&
      right <= bounds.screenWidth &&
      bottom <= bounds.screenHeight
    );
  });
  await check("storage.async-info", true, async () => {
    const info = await call(wx, "getStorageInfo");
    return Array.isArray(info.keys) && info.currentSize >= 0 && info.limitSize >= info.currentSize;
  });
  await check(
    "ui.navigation-title",
    ["success", "complete"],
    () =>
      new Promise((resolve) => {
        const seen = [];
        wx.setNavigationBarTitle({
          title: "Conformance tests",
          success() {
            seen.push("success");
          },
          fail() {
            seen.push("fail");
          },
          complete() {
            seen.push("complete");
            resolve(seen);
          },
        });
      }),
  );
  await check(
    "ui.navigation-loading",
    ["showNavigationBarLoading:ok", "hideNavigationBarLoading:ok"],
    async () => {
      const show = await call(wx, "showNavigationBarLoading");
      const hide = await call(wx, "hideNavigationBarLoading");
      return [show.errMsg, hide.errMsg];
    },
  );
  await check("ui.navigation-bar-color", ["success", "complete"], () => {
    const seen = [];
    wx.setNavigationBarColor({
      frontColor: "#ffffff",
      backgroundColor: "#1f2d3d",
      success() {
        seen.push("success");
      },
      fail() {
        seen.push("fail");
      },
      complete() {
        seen.push("complete");
      },
    });
    return seen;
  });
  await check("system.setting-shape", [true, true, true, true], () => {
    const setting = wx.getSystemSetting();
    const authorize = wx.getAppAuthorizeSetting();
    return [
      setting.deviceOrientation === "portrait" || setting.deviceOrientation === "landscape",
      setting.bluetoothEnabled === undefined || typeof setting.bluetoothEnabled === "boolean",
      authorize.cameraAuthorized !== undefined,
      authorize.locationAuthorized !== undefined,
    ];
  });
  await check("ui.loading-roundtrip", ["showLoading:ok", "hideLoading:ok"], async () => {
    const show = await call(wx, "showLoading", { title: "Checking" });
    const hide = await call(wx, "hideLoading");
    return [show.errMsg, hide.errMsg];
  });
  await check("ui.toast-roundtrip", ["showToast:ok", "hideToast:ok"], async () => {
    const show = await call(wx, "showToast", { title: "Checking", icon: "none", duration: 500 });
    const hide = await call(wx, "hideToast");
    return [show.errMsg, hide.errMsg];
  });
  await check("ui.scroll-top", true, async () => {
    await call(wx, "pageScrollTo", { scrollTop: 0, duration: 0 });
    const position = await new Promise((resolve) =>
      wx.createSelectorQuery().selectViewport().scrollOffset(resolve).exec(),
    );
    return position.scrollTop === 0;
  });
  await check(
    "system.next-tick",
    ["sync", "tick"],
    () =>
      new Promise((resolve) => {
        const order = [];
        wx.nextTick(() => {
          order.push("tick");
          resolve(order);
        });
        order.push("sync");
      }),
  );
}
module.exports = { system };
