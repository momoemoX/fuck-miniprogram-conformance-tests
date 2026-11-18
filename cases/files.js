const { uniqueKey, call } = require("./support");

function sandbox(exercise) {
  return async () => {
    const fs = wx.getFileSystemManager();
    const dir = wx.env.USER_DATA_PATH + "/" + uniqueKey();
    fs.mkdirSync(dir);
    try {
      return await exercise(fs, dir);
    } finally {
      fs.rmdirSync(dir, true);
    }
  };
}

async function files(check) {
  for (const [name, encoding, text, bytes] of [
    ["utf8", "utf8", "π", [207, 128]],
    ["hex", "hex", "00fe", [0, 254]],
    ["base64", "base64", "ECA=", [16, 32]],
    ["ascii", "ascii", "Az", [65, 122]],
    ["utf16le", "utf16le", "Ω", [169, 3]],
  ]) {
    await check(
      "fs.write-" + name,
      bytes,
      sandbox((fs, dir) => {
        fs.writeFileSync(dir + "/item", text, encoding);
        return Array.from(new Uint8Array(fs.readFileSync(dir + "/item")));
      }),
    );
    await check(
      "fs.read-" + name,
      text,
      sandbox((fs, dir) => {
        fs.writeFileSync(dir + "/item", new Uint8Array(bytes).buffer);
        return fs.readFileSync(dir + "/item", encoding);
      }),
    );
  }
  await check(
    "fs.append",
    "abc",
    sandbox((fs, dir) => {
      fs.writeFileSync(dir + "/a", "a", "utf8");
      fs.appendFileSync(dir + "/a", "bc", "utf8");
      return fs.readFileSync(dir + "/a", "utf8");
    }),
  );
  await check(
    "fs.copy-overwrite",
    ["new", "new"],
    sandbox((fs, dir) => {
      fs.writeFileSync(dir + "/a", "new", "utf8");
      fs.writeFileSync(dir + "/b", "old", "utf8");
      fs.copyFileSync(dir + "/a", dir + "/b");
      return ["a", "b"].map((file) => fs.readFileSync(dir + "/" + file, "utf8"));
    }),
  );
  await check(
    "fs.rename-tree",
    [["new"], "leaf"],
    sandbox((fs, dir) => {
      fs.mkdirSync(dir + "/old/nested", true);
      fs.writeFileSync(dir + "/old/nested/item", "leaf", "utf8");
      fs.renameSync(dir + "/old", dir + "/new");
      return [fs.readdirSync(dir), fs.readFileSync(dir + "/new/nested/item", "utf8")];
    }),
  );
  await check(
    "fs.stat-types",
    [true, false, false, true, 3],
    sandbox((fs, dir) => {
      fs.writeFileSync(dir + "/file", "abc", "utf8");
      const folder = fs.statSync(dir),
        file = fs.statSync(dir + "/file");
      return [folder.isDirectory(), folder.isFile(), file.isDirectory(), file.isFile(), file.size];
    }),
  );
  await check(
    "fs.unlink",
    [],
    sandbox((fs, dir) => {
      fs.writeFileSync(dir + "/file", "1", "utf8");
      fs.unlinkSync(dir + "/file");
      return fs.readdirSync(dir);
    }),
  );
  await check(
    "fs.missing-read",
    true,
    sandbox((fs, dir) => {
      try {
        fs.readFileSync(dir + "/missing");
        return false;
      } catch (error) {
        return !!error;
      }
    }),
  );
  await check(
    "fs.async-operations",
    ["ab", []],
    sandbox(async (fs, dir) => {
      const filePath = dir + "/file";
      await call(fs, "writeFile", { filePath, data: "a", encoding: "utf8" });
      await call(fs, "appendFile", { filePath, data: "b", encoding: "utf8" });
      const { data } = await call(fs, "readFile", { filePath, encoding: "utf8" });
      await call(fs, "unlink", { filePath });
      return [data, (await call(fs, "readdir", { dirPath: dir })).files];
    }),
  );
  await check(
    "fs.async-missing",
    ["fail", "complete"],
    sandbox(
      (fs, dir) =>
        new Promise((resolve) => {
          const events = [];
          fs.access({
            path: dir + "/missing",
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
    ),
  );
}
module.exports = { files, sandbox };
