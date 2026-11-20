// Contract for automatic Promise return values on asynchronous wx.* APIs.
async function promiseContract(check) {
  await check("promise.resolves-without-callbacks", [true, true, "ok"], async () => {
    const key = "__suite_promise_key__";
    try {
      const setRes = wx.setStorage({ key, data: "ok" });
      const setThenable = !!setRes && typeof setRes.then === "function";
      await setRes;
      const getRes = wx.getStorage({ key });
      const getThenable = !!getRes && typeof getRes.then === "function";
      const result = await getRes;
      return [setThenable, getThenable, result.data];
    } finally {
      try {
        wx.removeStorageSync(key);
      } catch {
        /* ignore */
      }
    }
  });

  await check("promise.rejects-on-failure", [true, true], async () => {
    const missing = "__suite_promise_missing_" + Date.now() + "__";
    const promise = wx.getStorage({ key: missing });
    const isThenable = !!promise && typeof promise.then === "function";
    try {
      await promise;
      return [isThenable, false];
    } catch (error) {
      return [isThenable, !!(error && typeof error.errMsg === "string" && error.errMsg.length > 0)];
    }
  });

  await check("promise.callback-disables-promise", [false, true], () => {
    return new Promise((resolve) => {
      let returned;
      let called = false;
      returned = wx.getStorageInfo({
        success() {
          called = true;
        },
        complete() {
          const isThenable = !!returned && typeof returned.then === "function";
          resolve([isThenable, called]);
        },
      });
    });
  });

  await check("promise.task-api-not-promisified", [true, false], () => {
    const task = wx.request({
      url: "http://127.0.0.1:1/never",
      fail() {},
    });
    const hasAbort = !!task && typeof task.abort === "function";
    const isThenable = !!task && typeof task.then === "function";
    if (hasAbort) {
      try {
        task.abort();
      } catch {
        /* ignore */
      }
    }
    return [hasAbort, isThenable];
  });
}

module.exports = { promiseContract };
