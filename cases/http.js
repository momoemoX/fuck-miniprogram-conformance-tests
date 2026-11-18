const { call, uniqueKey } = require("./support");

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
}
module.exports = { http };
