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

  await check("promise.complete-only-disables-promise", [false, true], () => {
    return new Promise((resolve) => {
      let returned;
      returned = wx.getStorageInfo({
        complete(res) {
          const isThenable = !!returned && typeof returned.then === "function";
          resolve([isThenable, !!(res && typeof res.errMsg === "string")]);
        },
      });
    });
  });

  await check("promise.fail-only-disables-promise", [false, true], () => {
    const missing = "__suite_promise_fail_only_" + Date.now() + "__";
    return new Promise((resolve) => {
      let returned;
      returned = wx.getStorage({
        key: missing,
        fail(err) {
          const isThenable = !!returned && typeof returned.then === "function";
          resolve([isThenable, !!(err && typeof err.errMsg === "string" && err.errMsg.length > 0)]);
        },
      });
    });
  });

  await check("promise.reject-matches-fail-errMsg", [true, true], async () => {
    const missing = "__suite_promise_same_err_" + Date.now() + "__";
    const failErr = await new Promise((resolve) => {
      wx.getStorage({
        key: missing,
        fail: (err) => resolve(err && err.errMsg),
      });
    });
    let catchErr = null;
    try {
      await wx.getStorage({ key: missing });
    } catch (err) {
      catchErr = err && err.errMsg;
    }
    return [typeof failErr === "string" && failErr.length > 0, failErr === catchErr];
  });

  await check("promise.sync-api-returns-value-directly", [false, "sync-val", false], () => {
    const key = "__suite_promise_sync__";
    try {
      const setRet = wx.setStorageSync(key, "sync-val");
      const got = wx.getStorageSync(key);
      const noop = () => {};
      const onRet = wx.onError(noop);
      wx.offError(noop);
      return [
        !!setRet && typeof setRet.then === "function",
        got,
        !!onRet && typeof onRet.then === "function",
      ];
    } finally {
      try {
        wx.removeStorageSync(key);
      } catch {
        /* ignore */
      }
    }
  });
}

module.exports = { promiseContract };
