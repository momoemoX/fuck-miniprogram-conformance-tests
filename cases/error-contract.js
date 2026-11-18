const { update } = require("./support");

// Registers a wx.onError listener that collects normalized messages for one marker.
// Error arguments arrive as Error objects or plain strings depending on the host.
function watchError(marker) {
  const messages = [];
  let notify = null;
  const listener = (error) => {
    const text = error && typeof error === "object" ? String(error.message || error) : String(error);
    if (text.indexOf(marker) === -1) return;
    messages.push(text);
    if (notify) {
      const settle = notify;
      notify = null;
      settle(text);
    }
  };
  wx.onError(listener);
  return {
    messages,
    // Resolves with the first matching message, or rejects after the timeout.
    seen(timeout = 5000) {
      let timer;
      return new Promise((resolve, reject) => {
        notify = resolve;
        timer = setTimeout(() => reject(new Error("onError never received " + marker)), timeout);
      }).finally(() => {
        clearTimeout(timer);
        notify = null;
      });
    },
    stop() {
      wx.offError(listener);
    },
  };
}

async function errorContract(page, check) {
  // Remount the probe for every case so observer state cannot leak between cases.
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, { errorMounted: true });
        return await exercise(page.selectComponent("#error-probe"));
      } finally {
        await update(page, { errorMounted: false });
      }
    });
  }

  await isolated("error.observer-recovers", ["throw-observer", true, true], async (probe) => {
    const watch = watchError("suite-observer-marker");
    try {
      await update(probe, { wired: "throw-observer" });
      const committed = probe.data.wired;
      const message = await watch.seen();
      await update(probe, { wired: "settled" });
      return [
        committed,
        message.indexOf("suite-observer-marker") !== -1,
        probe.data.wired === "settled",
      ];
    } finally {
      watch.stop();
    }
  });

  await isolated(
    "error.event-handler-continues",
    [
      ["leaf", "inner", "outer"],
      ["leaf", "inner", "outer"],
      true,
    ],
    async (probe) => {
      page.errorTrace = [];
      page.throwInnerBoom = true;
      const watch = watchError("suite-boom-marker");
      try {
        probe.triggerBoom();
        const first = page.errorTrace.slice();
        const message = await watch.seen();
        page.errorTrace = [];
        probe.triggerBoom();
        return [
          first,
          page.errorTrace.slice(),
          message.indexOf("suite-boom-marker") !== -1,
        ];
      } finally {
        watch.stop();
        page.throwInnerBoom = false;
        page.errorTrace = [];
      }
    },
  );

  await isolated("error.detached-recovers", [true, true], async (probe) => {
    probe.throwOnDetach = true;
    const watch = watchError("suite-detach-marker");
    try {
      await update(page, { errorMounted: false });
      const removed = page.selectComponent("#error-probe") === null;
      const message = await watch.seen();
      return [removed, message.indexOf("suite-detach-marker") !== -1];
    } finally {
      watch.stop();
      page.throwInnerBoom = false;
      page.errorTrace = [];
    }
  });

  await check("error.api-callback-complete", [["success", "complete"], true], async () => {
    const watch = watchError("suite-api-marker");
    const key = "suite-error-storage-" + Math.random().toString(36).slice(2);
    try {
      wx.setStorageSync(key, 1);
      const order = await new Promise((resolve) => {
        const seen = [];
        wx.getStorage({
          key,
          success: () => {
            seen.push("success");
            throw new Error("suite-api-marker");
          },
          fail: () => seen.push("fail"),
          complete: () => {
            seen.push("complete");
            resolve(seen);
          },
        });
      });
      const message = await watch.seen();
      return [order, message.indexOf("suite-api-marker") !== -1];
    } finally {
      watch.stop();
      wx.removeStorageSync(key);
    }
  });

  await check("error.console-not-onerror", [], async () => {
    const watch = watchError("suite-console-marker");
    try {
      console.error("suite-console-marker");
      await new Promise((resolve) => setTimeout(resolve, 300));
      return watch.messages.slice();
    } finally {
      watch.stop();
    }
  });

  await check("error.unhandled-rejection", ["suite-reject-marker", true], async () => {
    let resolveEvent, rejectEvent;
    const listener = (event) => {
      if (String(event.reason).indexOf("suite-reject-marker") !== -1) resolveEvent(event);
    };
    const delivered = new Promise((resolve, reject) => {
      resolveEvent = resolve;
      rejectEvent = reject;
    });
    wx.onUnhandledRejection(listener);
    let timer;
    try {
      timer = setTimeout(() => rejectEvent(new Error("Unhandled rejection was not delivered")), 5000);
      Promise.reject("suite-reject-marker");
      const event = await delivered;
      return [String(event.reason), typeof (event.promise && event.promise.then) === "function"];
    } finally {
      clearTimeout(timer);
      wx.offUnhandledRejection(listener);
    }
  });
}
module.exports = { errorContract };
