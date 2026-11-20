const { query, uniqueKey, update } = require("./support");

function makeDeepSparseArray() {
  const inner = new Array(4);
  inner[1] = "mid";
  inner[3] = 9;
  const outer = new Array(3);
  outer[2] = { list: inner };
  return outer;
}

async function storageSerialization(page, check) {
  await check("storage.clear-sync", [true, true, 0, "", ""], () => {
    const a = uniqueKey();
    const b = uniqueKey();
    try {
      wx.setStorageSync(a, "first");
      wx.setStorageSync(b, { n: 2 });
      const before = wx.getStorageInfoSync().keys;
      const hadA = before.indexOf(a) !== -1;
      const hadB = before.indexOf(b) !== -1;
      wx.clearStorageSync();
      const after = wx.getStorageInfoSync().keys;
      return [hadA, hadB, after.length, wx.getStorageSync(a), wx.getStorageSync(b)];
    } finally {
      wx.removeStorageSync(a);
      wx.removeStorageSync(b);
    }
  });

  await check("storage.clear-async", [["success", "complete"], 0, "", ""], async () => {
    const a = uniqueKey();
    const b = uniqueKey();
    try {
      wx.setStorageSync(a, "alpha");
      wx.setStorageSync(b, "beta");
      const callbacks = await new Promise((resolve) => {
        const seen = [];
        wx.clearStorage({
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
      });
      return [
        callbacks,
        wx.getStorageInfoSync().keys.length,
        wx.getStorageSync(a),
        wx.getStorageSync(b),
      ];
    } finally {
      wx.removeStorageSync(a);
      wx.removeStorageSync(b);
    }
  });

  await check(
    "storage.special-undefined",
    ["", ["keep"], 1, false, [1, null, 3]],
    () => {
      const keyTop = uniqueKey();
      const keyObj = uniqueKey();
      const keyArr = uniqueKey();
      try {
        wx.setStorageSync(keyTop, undefined);
        wx.setStorageSync(keyObj, { keep: 1, drop: undefined });
        wx.setStorageSync(keyArr, [1, undefined, 3]);
        const readTop = wx.getStorageSync(keyTop);
        const readObj = wx.getStorageSync(keyObj);
        const readArr = wx.getStorageSync(keyArr);
        return [
          readTop,
          Object.keys(readObj),
          readObj.keep,
          Object.prototype.hasOwnProperty.call(readObj, "drop"),
          readArr,
        ];
      } finally {
        wx.removeStorageSync(keyTop);
        wx.removeStorageSync(keyObj);
        wx.removeStorageSync(keyArr);
      }
    },
  );

  await check(
    "storage.special-nan-infinity",
    [{ nan: null, pos: null, neg: null, ok: 7 }, [null, null, null]],
    () => {
      const keyObj = uniqueKey();
      const keyArr = uniqueKey();
      try {
        wx.setStorageSync(keyObj, { nan: NaN, pos: Infinity, neg: -Infinity, ok: 7 });
        wx.setStorageSync(keyArr, [NaN, Infinity, -Infinity]);
        return [wx.getStorageSync(keyObj), wx.getStorageSync(keyArr)];
      } finally {
        wx.removeStorageSync(keyObj);
        wx.removeStorageSync(keyArr);
      }
    },
  );

  // Top-level Date is revived as a real Date instance, whereas nested Date values inside
  // objects undergo JSON serialization and read back as ISO-8601 strings.
  await check(
    "storage.special-date",
    [true, "2025-01-02T03:04:05.678Z", "string", "2025-01-02T03:04:05.678Z"],
    () => {
      const keyTop = uniqueKey();
      const keyObj = uniqueKey();
      const iso = "2025-01-02T03:04:05.678Z";
      const date = new Date(iso);
      try {
        wx.setStorageSync(keyTop, date);
        wx.setStorageSync(keyObj, { when: date });
        const readTop = wx.getStorageSync(keyTop);
        const readObj = wx.getStorageSync(keyObj);
        return [
          readTop instanceof Date,
          readTop instanceof Date ? readTop.toISOString() : String(readTop),
          typeof readObj.when,
          readObj.when,
        ];
      } finally {
        wx.removeStorageSync(keyTop);
        wx.removeStorageSync(keyObj);
      }
    },
  );

  // Top-level ArrayBuffer is dropped (reads back as empty string), and nested ArrayBuffer
  // loses its binary payload and serializes as an empty plain object.
  await check("storage.special-arraybuffer", [false, "", false, {}, "ok"], () => {
    const keyTop = uniqueKey();
    const keyObj = uniqueKey();
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;
    try {
      wx.setStorageSync(keyTop, bytes);
      wx.setStorageSync(keyObj, { buf: bytes, tag: "ok" });
      const readTop = wx.getStorageSync(keyTop);
      const readObj = wx.getStorageSync(keyObj);
      return [
        readTop instanceof ArrayBuffer,
        readTop,
        readObj.buf instanceof ArrayBuffer,
        readObj.buf,
        readObj.tag,
      ];
    } finally {
      wx.removeStorageSync(keyTop);
      wx.removeStorageSync(keyObj);
    }
  });

  await check(
    "storage.special-sparse-array",
    [[null, null, { list: [null, "mid", null, 9] }], true, true, true, true],
    () => {
      const key = uniqueKey();
      try {
        wx.setStorageSync(key, makeDeepSparseArray());
        const read = wx.getStorageSync(key);
        return [
          read,
          0 in read,
          1 in read,
          0 in read[2].list,
          2 in read[2].list,
        ];
      } finally {
        wx.removeStorageSync(key);
      }
    },
  );

  await check(
    "storage.large-payload-limit",
    [262144, "aaaa", "aaaa", ["fail", "complete"], true],
    async () => {
      const keyOk = uniqueKey();
      const keyOver = uniqueKey();
      const validPayload = "a".repeat(256 * 1024);
      const info = wx.getStorageInfoSync();
      const limitKb = typeof info.limitSize === "number" && info.limitSize > 0 ? info.limitSize : 10240;
      const overLimitPayload = "x".repeat((limitKb + 64) * 1024);
      try {
        wx.setStorageSync(keyOk, validPayload);
        const readOk = wx.getStorageSync(keyOk);

        const asyncFail = await new Promise((resolve) => {
          const seen = [];
          wx.setStorage({
            key: keyOver,
            data: overLimitPayload,
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
        });

        let syncThrew = false;
        try {
          wx.setStorageSync(keyOver, overLimitPayload);
        } catch {
          syncThrew = true;
        }

        return [
          readOk.length,
          readOk.slice(0, 4),
          readOk.slice(-4),
          asyncFail,
          syncThrew,
        ];
      } finally {
        wx.removeStorageSync(keyOk);
        wx.removeStorageSync(keyOver);
      }
    },
  );

  async function isolatedSerial(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, { serialMounted: true });
        const probe = page.selectComponent("#serial-probe");
        const readView = async () => (await query(probe, "#serial-view", { dataset: true })).dataset;
        return await exercise(probe, readView);
      } finally {
        await update(page, { serialMounted: false });
      }
    });
  }

  // Top-level undefined updates the logic-layer data to undefined while being dropped across
  // the view bridge (leaving the view's previous value intact); nested object keys with
  // undefined are omitted, and array slots become null.
  await isolatedSerial(
    "setdata.special-undefined",
    [true, "string:before", "string:after", false, 3, "number:1", "null", "number:3"],
    async (probe, readView) => {
      await update(probe, {
        topField: undefined,
        nested: { keep: "after", drop: undefined },
        list: [1, undefined, 3],
      });
      const view = await readView();
      return [
        probe.data.topField === undefined,
        view.topField,
        view.nestedKeep,
        view.nestedHasDrop,
        view.listLen,
        view.listA,
        view.listB,
        view.listC,
      ];
    },
  );

  await isolatedSerial(
    "setdata.special-nan-infinity",
    ["null", "null", "null", "number:7"],
    async (probe, readView) => {
      await update(probe, {
        nanVal: NaN,
        posInf: Infinity,
        negInf: -Infinity,
        okNum: 7,
      });
      const view = await readView();
      return [view.nan, view.posInf, view.negInf, view.okNum];
    },
  );

  // setData clones plain own enumerable properties, so Date instances (which have no own
  // enumerable keys) arrive in the view layer as empty objects.
  await isolatedSerial(
    "setdata.special-date",
    "object:{}",
    async (probe, readView) => {
      await update(probe, { dateVal: new Date("2025-01-02T03:04:05.678Z") });
      const view = await readView();
      return view.date;
    },
  );

  await isolatedSerial(
    "setdata.special-arraybuffer",
    ["object:{}", "string:alive"],
    async (probe, readView) => {
      await update(probe, {
        bufVal: new Uint8Array([1, 2, 3, 4]).buffer,
        marker: "alive",
      });
      const view = await readView();
      return [view.buf, view.marker];
    },
  );

  await isolatedSerial(
    "setdata.special-sparse-array",
    [3, "null", "null", 4, "null", "string:mid", "null", "number:9"],
    async (probe, readView) => {
      await update(probe, { sparse: makeDeepSparseArray() });
      const view = await readView();
      return [
        view.sparseLen,
        view.sparseA,
        view.sparseB,
        view.sparseInnerLen,
        view.sparseInnerA,
        view.sparseInnerB,
        view.sparseInnerC,
        view.sparseInnerD,
      ];
    },
  );

  await isolatedSerial(
    "setdata.large-payload",
    [262144, 262144, "string:committed"],
    async (probe, readView) => {
      const text = "z".repeat(256 * 1024);
      await update(probe, { largeText: text, largeTag: "committed" });
      const view = await readView();
      return [probe.data.largeText.length, view.largeLen, view.largeTag];
    },
  );
}

module.exports = { storageSerialization };
