const { call } = require("./support");

// Documented values of DeviceInfo.platform.
const PLATFORMS = ["ios", "android", "ohos", "windows", "mac", "devtools"];

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
  await check("system.device-info-shape", [true, true, true, true], () => {
    const info = wx.getDeviceInfo();
    return [
      typeof info.brand === "string" && info.brand.length > 0,
      typeof info.model === "string" && info.model.length > 0,
      typeof info.system === "string" && info.system.length > 0,
      PLATFORMS.indexOf(info.platform) !== -1,
    ];
  });
  await check("system.account-info-shape", [true, true], () => {
    const { miniProgram } = wx.getAccountInfoSync();
    return [
      typeof miniProgram.appId === "string" && miniProgram.appId.length > 0,
      ["develop", "trial", "release"].indexOf(miniProgram.envVersion) !== -1,
    ];
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
  // API callbacks run asynchronously, so the order is read once complete has run.
  await check(
    "ui.navigation-bar-color",
    ["success", "complete"],
    () =>
      new Promise((resolve) => {
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
            resolve(seen);
          },
        });
      }),
  );
  await check("system.setting-shape", [true, true], () => {
    const setting = wx.getSystemSetting();
    return [
      setting.deviceOrientation === "portrait" || setting.deviceOrientation === "landscape",
      ["bluetoothEnabled", "locationEnabled", "wifiEnabled"].every(
        (name) => setting[name] === undefined || typeof setting[name] === "boolean",
      ),
    ];
  });
  // Authorization fields are documented strings, not booleans.
  await check("system.authorize-setting-values", [true, true], () => {
    const authorize = wx.getAppAuthorizeSetting();
    const states = ["authorized", "denied", "not determined"];
    const fields = ["albumAuthorized", "bluetoothAuthorized", "cameraAuthorized", "locationAuthorized", "microphoneAuthorized", "notificationAuthorized", "phoneCalendarAuthorized"];
    return [
      fields.every((name) => authorize[name] === undefined || states.indexOf(authorize[name]) !== -1),
      states.indexOf(authorize.locationAuthorized) !== -1 && states.indexOf(authorize.cameraAuthorized) !== -1,
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
  await check("ui.tabbar-callbacks", ["ok", "ok"], async () => {
    const badge = await call(wx, "setTabBarBadge", { index: 0, text: "1" });
    const remove = await call(wx, "removeTabBarBadge", { index: 0 });
    return [badge.errMsg.split(":")[1], remove.errMsg.split(":")[1]];
  });
  await check("ui.background-style", ["ok", "ok"], async () => {
    const color = await call(wx, "setBackgroundColor", {
      backgroundColorTop: "#ffffff",
      backgroundColorBottom: "#ffffff",
    });
    const style = await call(wx, "setBackgroundTextStyle", { textStyle: "light" });
    return [color.errMsg.split(":")[1], style.errMsg.split(":")[1]];
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
