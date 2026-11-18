const { call, uniqueKey } = require("./support");

async function storage(check) {
  for (const [name, value] of [
    ["text", "pêche"],
    ["number", 42],
    ["false", false],
    ["zero", 0],
    ["array", [2, "b"]],
    ["nested", { items: [1, { x: true }] }],
  ]) {
    await check("storage.roundtrip-" + name, value, () => {
      const key = uniqueKey();
      try {
        wx.setStorageSync(key, value);
        return wx.getStorageSync(key);
      } finally {
        wx.removeStorageSync(key);
      }
    });
  }
  await check("storage.overwrite-remove", [2, true, false], () => {
    const key = uniqueKey();
    try {
      wx.setStorageSync(key, 1);
      wx.setStorageSync(key, 2);
      const read = wx.getStorageSync(key);
      const present = wx.getStorageInfoSync().keys.includes(key);
      wx.removeStorageSync(key);
      return [read, present, wx.getStorageInfoSync().keys.includes(key)];
    } finally {
      wx.removeStorageSync(key);
    }
  });
  await check("storage.async-roundtrip", ["x", "y"], async () => {
    const key = uniqueKey();
    try {
      await call(wx, "setStorage", { key, data: ["x", "y"] });
      return (await call(wx, "getStorage", { key })).data;
    } finally {
      await call(wx, "removeStorage", { key });
    }
  });
  await check(
    "storage.missing-callback-order",
    ["fail", "complete"],
    () =>
      new Promise((resolve) => {
        const events = [];
        wx.getStorage({
          key: uniqueKey(),
          success() {
            events.push("success");
          },
          fail() {
            events.push("fail");
          },
          complete() {
            events.push("complete");
            resolve(events);
          },
        });
      }),
  );
}

async function binary(check) {
  for (const [name, bytes, encoded] of [
    ["single", [0], "AA=="],
    ["double", [255, 255], "//8="],
    ["triple", [0, 127, 255], "AH//"],
    ["padding", [1, 2, 3, 4], "AQIDBA=="],
  ]) {
    await check("base64.encode-" + name, encoded, () =>
      wx.arrayBufferToBase64(new Uint8Array(bytes).buffer),
    );
    await check("base64.decode-" + name, bytes, () =>
      Array.from(new Uint8Array(wx.base64ToArrayBuffer(encoded))),
    );
  }
}
module.exports = { storage, binary };
