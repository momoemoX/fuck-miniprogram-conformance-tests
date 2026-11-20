const { call, delay, uniqueKey } = require("./support");

function verifyLargePattern(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length !== 524288) return false;
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] !== ((i * 31 + 7) & 0xff)) return false;
  }
  return true;
}

function decodeAsciiBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

async function http(base, check) {
  const endpoint = base.replace(/\/$/, "");
  await check("http.query", ["GET", "a b"], async () => {
    const { data } = await call(wx, "request", { url: endpoint + "/echo", data: { q: "a b" } });
    return [data.method, data.query];
  });
  await check("http.post-json", { color: "gold" }, async () => {
    const { data } = await call(wx, "request", {
      url: endpoint + "/echo",
      method: "POST",
      data: { color: "gold" },
    });
    return JSON.parse(data.body);
  });
  await check(
    "http.status",
    404,
    async () => (await call(wx, "request", { url: endpoint + "/missing" })).statusCode,
  );
  await check("http.arraybuffer", [0, 255, 13], async () => {
    const response = await call(wx, "request", {
      url: endpoint + "/bytes",
      responseType: "arraybuffer",
    });
    return Array.from(new Uint8Array(response.data));
  });
  await check("http.header-case", "violet", async () => {
    const response = await call(wx, "request", { url: endpoint + "/bytes" });
    const key = Object.keys(response.header).find((key) => key.toLowerCase() === "x-suite-color");
    return response.header[key];
  });
  await check("http.text-mode", "raw text", async () => {
    const response = await call(wx, "request", { url: endpoint + "/plain", dataType: "text" });
    return response.data;
  });
  await check("http.binary-post", [0, 255, 32], async () => {
    const response = await call(wx, "request", {
      url: endpoint + "/mirror",
      method: "POST",
      header: { "content-type": "application/octet-stream" },
      data: new Uint8Array([0, 255, 32]).buffer,
      responseType: "arraybuffer",
    });
    return Array.from(new Uint8Array(response.data));
  });
  await check("http.upload-form", [200, true, true], async () => {
    const fs = wx.getFileSystemManager();
    const file = wx.env.USER_DATA_PATH + "/" + uniqueKey() + ".txt";
    fs.writeFileSync(file, "suite-file-contents", "utf8");
    try {
      const result = await call(wx, "uploadFile", {
        url: endpoint + "/upload",
        filePath: file,
        name: "asset",
        formData: { batch: "citrus" },
      });
      const data = JSON.parse(result.data);
      return [result.statusCode, data.file, data.field];
    } finally {
      fs.unlinkSync(file);
    }
  });
  await check(
    "http.abort",
    ["fail", "complete"],
    () =>
      new Promise((resolve) => {
        const seen = [];
        const task = wx.request({
          url: endpoint + "/delayed",
          success() {
            seen.push("success");
          },
          fail(error) {
            seen.push(/abort/i.test(error.errMsg) ? "fail" : error.errMsg);
          },
          complete() {
            seen.push("complete");
            resolve(seen);
          },
        });
        task.abort();
      }),
  );
  for (const mode of ["async", "sync"]) {
    await check("fs.save-download-" + mode, [true, [0, 255, 13], false], async () => {
      const fs = wx.getFileSystemManager();
      const { tempFilePath } = await call(wx, "downloadFile", { url: endpoint + "/bytes" });
      const path =
        mode === "sync"
          ? fs.saveFileSync(tempFilePath)
          : (await call(fs, "saveFile", { tempFilePath })).savedFilePath;
      if (typeof path !== "string" || !path) throw new Error("No saved file path returned");
      const listed = async () =>
        (await call(fs, "getSavedFileList")).fileList.some((item) => item.filePath === path);
      let present, bytes;
      try {
        present = await listed();
        bytes = Array.from(new Uint8Array((await call(fs, "readFile", { filePath: path })).data));
      } finally {
        await call(fs, "removeSavedFile", { filePath: path });
      }
      return [present, bytes, await listed()];
    });
  }
  await check("http.download", [200, 0, 255, 13], async () => {
    const response = await call(wx, "downloadFile", { url: endpoint + "/bytes" });
    const data = wx.getFileSystemManager().readFileSync(response.tempFilePath);
    return [response.statusCode, ...new Uint8Array(data)];
  });

  await check("http.timeout", [["fail", "complete"], true, true], async () => {
    const started = Date.now();
    const outcome = await new Promise((resolve) => {
      const seen = [];
      let errMsg = "";
      wx.request({
        url: endpoint + "/delayed?ms=2000",
        timeout: 200,
        success() {
          seen.push("success");
        },
        fail(error) {
          seen.push("fail");
          errMsg = error && error.errMsg ? String(error.errMsg) : String(error || "");
        },
        complete() {
          seen.push("complete");
          resolve({ seen, errMsg, elapsed: Date.now() - started });
        },
      });
    });
    return [
      outcome.seen,
      /timeout|timed?\s*out/i.test(outcome.errMsg),
      outcome.elapsed < 1500,
    ];
  });

  await check("http.redirect-follow", [200, "raw text"], async () => {
    const response = await call(wx, "request", {
      url: endpoint + "/redirect",
      dataType: "text",
    });
    return [response.statusCode, response.data];
  });

  await check("http.redirect-chain", [200, "raw text"], async () => {
    const response = await call(wx, "request", {
      url: endpoint + "/redirect-hop1",
      dataType: "text",
    });
    return [response.statusCode, response.data];
  });

  // 3.7.12 simulator quirk: wx.request with redirect: "manual" still follows the 302
  // redirect in the desktop simulator (mobile clients return 302 with Location).
  // Tagged as category "quirk" in cases/report.js.
  await check("http.redirect-manual", [200, "raw text"], async () => {
    const response = await call(wx, "request", {
      url: endpoint + "/redirect",
      redirect: "manual",
      dataType: "text",
    });
    return [response.statusCode, response.data];
  });

  await check("http.large-transfer", [200, 524288, true], async () => {
    const response = await call(wx, "request", {
      url: endpoint + "/large",
      responseType: "arraybuffer",
    });
    return [
      response.statusCode,
      response.data ? response.data.byteLength : -1,
      Boolean(response.data && verifyLargePattern(response.data)),
    ];
  });

  await check("http.large-download", [200, 524288, true], async () => {
    const response = await call(wx, "downloadFile", { url: endpoint + "/large" });
    const data = wx.getFileSystemManager().readFileSync(response.tempFilePath);
    return [response.statusCode, data.byteLength, verifyLargePattern(data)];
  });

  await check(
    "http.chunked-transfer",
    [true, true, "chunk-1|chunk-2|chunk-3", 200, ["success", "complete"]],
    () =>
      new Promise((resolve) => {
        const seen = [];
        const chunks = [];
        let headersReceived = false;
        let statusCode = 0;
        const task = wx.request({
          url: endpoint + "/chunked",
          enableChunked: true,
          success(res) {
            seen.push("success");
            statusCode = res.statusCode;
          },
          fail() {
            seen.push("fail");
          },
          complete() {
            seen.push("complete");
            const combined = chunks.map(decodeAsciiBuffer).join("");
            resolve([
              headersReceived,
              chunks.length >= 1 && chunks.every((item) => item instanceof ArrayBuffer && item.byteLength > 0),
              combined,
              statusCode,
              seen,
            ]);
          },
        });
        if (task && typeof task.onHeadersReceived === "function") {
          task.onHeadersReceived(() => {
            headersReceived = true;
          });
        }
        if (task && typeof task.onChunkReceived === "function") {
          task.onChunkReceived((res) => {
            if (res && res.data) chunks.push(res.data);
          });
        }
      }),
  );

  await check(
    "http.concurrent-requests",
    [
      [200, 200, 200, 200, 200, 200],
      ["c0", "c1", "c2", "c3", "c4", "c5"],
    ],
    async () => {
      const delays = [120, 40, 100, 20, 80, 60];
      const responses = await Promise.all(
        delays.map((ms, idx) =>
          call(wx, "request", {
            url: endpoint + "/delayed?ms=" + ms + "&tag=c" + idx,
            dataType: "text",
          }),
        ),
      );
      return [
        responses.map((res) => res.statusCode),
        responses.map((res) => res.data),
      ];
    },
  );

  await check("http.abort-inflight-and-idempotent", [["fail", "complete"], true], async () => {
    const seen = [];
    let errMsg = "";
    let task;
    let done;
    const completed = new Promise((resolve) => {
      done = resolve;
    });
    task = wx.request({
      url: endpoint + "/delayed?ms=2000",
      success() {
        seen.push("success");
      },
      fail(error) {
        seen.push("fail");
        errMsg = error && error.errMsg ? String(error.errMsg) : String(error || "");
      },
      complete() {
        seen.push("complete");
        done();
      },
    });
    await delay(50);
    task.abort();
    await completed;
    task.abort();
    // Negative window: second abort must not trigger duplicate fail/complete callbacks.
    await delay(200);
    return [seen, /abort/i.test(errMsg)];
  });

  await check(
    "http.abort-isolated-in-concurrency",
    [["fail", "complete"], true, ["success", "complete"], "survivor"],
    async () => {
      const seenA = [];
      let errA = "";
      let doneA;
      const promiseA = new Promise((resolve) => {
        doneA = resolve;
      });
      const taskA = wx.request({
        url: endpoint + "/delayed?ms=2000&tag=aborted",
        dataType: "text",
        success() {
          seenA.push("success");
        },
        fail(error) {
          seenA.push("fail");
          errA = error && error.errMsg ? String(error.errMsg) : String(error || "");
        },
        complete() {
          seenA.push("complete");
          doneA();
        },
      });

      const seenB = [];
      let bodyB = "";
      const promiseB = new Promise((resolve) => {
        wx.request({
          url: endpoint + "/delayed?ms=150&tag=survivor",
          dataType: "text",
          success(res) {
            seenB.push("success");
            bodyB = res.data;
          },
          fail() {
            seenB.push("fail");
          },
          complete() {
            seenB.push("complete");
            resolve();
          },
        });
      });

      await delay(50);
      taskA.abort();
      await Promise.all([promiseA, promiseB]);
      return [seenA, /abort/i.test(errA), seenB, bodyB];
    },
  );

  await check("http.abort-after-complete-noop", [["success", "complete"], true], async () => {
    const seen = [];
    let task;
    await new Promise((resolve) => {
      task = wx.request({
        url: endpoint + "/plain",
        dataType: "text",
        success() {
          seen.push("success");
        },
        fail() {
          seen.push("fail");
        },
        complete() {
          seen.push("complete");
          resolve();
        },
      });
    });
    let noThrow = true;
    try {
      task.abort();
    } catch {
      noThrow = false;
    }
    // Negative window: aborting a settled task must not emit a late fail/complete.
    await delay(150);
    return [seen, noThrow];
  });
}
module.exports = { http };
