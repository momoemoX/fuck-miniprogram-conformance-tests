const { call, uniqueKey, query } = require("./support");

async function extended(page, check) {
  await check("storage.batch-order", ["second", "first", "second"], () => {
    const a = uniqueKey(),
      b = uniqueKey();
    try {
      wx.batchSetStorageSync([
        { key: a, value: "first" },
        { key: b, value: "second" },
      ]);
      return wx.batchGetStorageSync([b, a, b]);
    } finally {
      wx.removeStorageSync(a);
      wx.removeStorageSync(b);
    }
  });
  await check("storage.detached-copy", [1], () => {
    const key = uniqueKey();
    const value = [1];
    try {
      wx.setStorageSync(key, value);
      value.push(2);
      const read = wx.getStorageSync(key);
      read.push(3);
      return wx.getStorageSync(key);
    } finally {
      wx.removeStorageSync(key);
    }
  });
  await check("storage.promise-form", "promise-value", async () => {
    const key = uniqueKey();
    try {
      await wx.setStorage({ key, data: "promise-value" });
      return (await wx.getStorage({ key })).data;
    } finally {
      wx.removeStorageSync(key);
    }
  });
  await check("system.launch-path", "pages/suite/index", () => wx.getLaunchOptionsSync().path);
  await check("system.menu-geometry", true, () => {
    const r = wx.getMenuButtonBoundingClientRect();
    return (
      r.width > 0 &&
      r.height > 0 &&
      Math.abs(r.right - r.left - r.width) < 1 &&
      Math.abs(r.bottom - r.top - r.height) < 1
    );
  });
  await check("system.base-version", true, () => /^\d+\.\d+/.test(wx.getAppBaseInfo().SDKVersion));
  await check("clock.monotonic", true, async () => {
    const clock = wx.getPerformance();
    const before = clock.now();
    await new Promise((resolve) => setTimeout(resolve, 10));
    return Number.isFinite(before) && clock.now() > before;
  });
  await check("random.requested-lengths", [2, 17], async () => {
    const lengths = [];
    for (const length of [2, 17])
      lengths.push((await call(wx, "getRandomValues", { length })).randomValues.byteLength);
    return lengths;
  });
  await check(
    "query.viewport-offset",
    true,
    () =>
      new Promise((resolve) => {
        page
          .createSelectorQuery()
          .selectViewport()
          .scrollOffset((item) =>
            resolve(Number.isFinite(item.scrollTop) && Number.isFinite(item.scrollLeft)),
          )
          .exec();
      }),
  );
  await check(
    "canvas.png-export",
    [137, 80, 78, 71, 13, 10, 26, 10],
    () =>
      new Promise((resolve, reject) => {
        wx.canvasToTempFilePath(
          {
            canvasId: "swatch",
            fileType: "png",
            success: async (result) => {
              try {
                const bytes = (
                  await call(wx.getFileSystemManager(), "readFile", {
                    filePath: result.tempFilePath,
                  })
                ).data;
                resolve(Array.from(new Uint8Array(bytes).slice(0, 8)));
              } catch (error) {
                reject(error);
              }
            },
            fail: (error) => reject(new Error(error.errMsg)),
          },
          page,
        );
      }),
  );
  await check("animation.export-clears-queue", [1, 0], () => {
    const plan = wx.createAnimation({ duration: 0 });
    plan.rotate(30).step();
    return [plan.export().actions.length, plan.export().actions.length];
  });
  await check("animation.applies-computed-style", [true], async () => {
    const animation = wx.createAnimation({ duration: 100 });
    animation.translateX(42).step();
    page.setData({ animData: animation.export() });
    await new Promise((resolve) => setTimeout(resolve, 400));
    const node = await query(page, "#animated", { computedStyle: ["transform"] });
    return [typeof node.transform === "string" && node.transform.indexOf("42") !== -1];
  });
  await check("fs.save-remove-cycle", [true, true, true], async () => {
    const fs = wx.getFileSystemManager();
    try {
      const exported = await call(wx, "canvasToTempFilePath", {
        canvasId: "swatch",
        fileType: "png",
      });
      const saved = await call(fs, "saveFile", { tempFilePath: exported.tempFilePath });
      const path = saved.savedFilePath || saved.appliedFilePath;
      const listed = await call(fs, "getSavedFileList");
      const hasEntry = (listed.fileList || []).some((item) => item.filePath === path);
      await call(fs, "removeSavedFile", { filePath: path });
      let readableAfterRemove = true;
      try {
        await call(fs, "readFile", { filePath: path, encoding: "ascii" });
      } catch {
        readableAfterRemove = false;
      }
      return [typeof path === "string" && path.length > 0, hasEntry, !readableAfterRemove];
    } finally {
      // Saved files are tracked separately; remove any leftovers from this case.
      const listed = await call(fs, "getSavedFileList");
      for (const item of listed.fileList || []) {
        await call(fs, "removeSavedFile", { filePath: item.filePath }).catch(() => null);
      }
    }
  });
  await check("clipboard.roundtrip", "suite-clip", async () => {
    await call(wx, "setClipboardData", { data: "suite-clip" });
    const result = await call(wx, "getClipboardData");
    return result.data;
  });
  await check("page.scroll-to-selector", [true, true], async () => {
    try {
      page.pageScrollTrace = [];
      await call(wx, "pageScrollTo", { selector: "#scroll-fixture", duration: 0 });
      await new Promise((resolve) => setTimeout(resolve, 700));
      const trace = page.pageScrollTrace || [];
      return [trace.length > 0, trace.some((value) => typeof value === "number" && value >= 500)];
    } finally {
      await call(wx, "pageScrollTo", { scrollTop: 0, duration: 0 }).catch(() => null);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  });
  await check("storage.missing-sync", "", () => wx.getStorageSync(uniqueKey()));
  await check("storage.info-sync-shape", [true, true, true], () => {
    const key = uniqueKey();
    try {
      wx.setStorageSync(key, "info-marker");
      const info = wx.getStorageInfoSync();
      return [
        Array.isArray(info.keys) && info.keys.indexOf(key) !== -1,
        typeof info.currentSize === "number" && info.currentSize >= 0,
        info.limitSize === undefined || info.limitSize >= info.currentSize,
      ];
    } finally {
      wx.removeStorageSync(key);
    }
  });
}
module.exports = { extended };
