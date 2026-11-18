const { uniqueKey } = require("./support");

function withFile(operation) {
  return () => {
    const fs = wx.getFileSystemManager();
    const filePath = wx.env.USER_DATA_PATH + "/" + uniqueKey();
    fs.writeFileSync(filePath, "abcdef", "utf8");
    try {
      return operation(fs, filePath);
    } finally {
      fs.unlinkSync(filePath);
    }
  };
}

function withDescriptor(fs, filePath, flag, operation) {
  const fd = fs.openSync({ filePath, flag });
  if (typeof fd !== "string") throw new Error("openSync did not return a file descriptor");
  try {
    return operation(fd);
  } finally {
    fs.closeSync({ fd });
  }
}

async function descriptors(check) {
  await check(
    "fd.read-range",
    [2, 0, 99, 100, 0],
    withFile((fs, path) =>
      withDescriptor(fs, path, "r", (fd) => {
        const buffer = new ArrayBuffer(4);
        const bytes = fs.readSync({ fd, arrayBuffer: buffer, offset: 1, length: 2, position: 2 });
        return [bytes.bytesRead, ...new Uint8Array(buffer)];
      }),
    ),
  );
  await check(
    "fd.write-position",
    "abXYef",
    withFile((fs, path) => {
      withDescriptor(fs, path, "r+", (fd) =>
        fs.writeSync({ fd, data: "XY", position: 2, encoding: "utf8" }),
      );
      return fs.readFileSync(path, "utf8");
    }),
  );
  await check(
    "fd.truncate",
    [3, "abc"],
    withFile((fs, path) =>
      withDescriptor(fs, path, "r+", (fd) => {
        fs.ftruncateSync({ fd, length: 3 });
        return [fs.fstatSync({ fd }).size, fs.readFileSync(path, "utf8")];
      }),
    ),
  );
  await check(
    "fd.closed-read",
    true,
    withFile((fs, filePath) => {
      const fd = fs.openSync({ filePath, flag: "r" });
      if (typeof fd !== "string") throw new Error("openSync did not return a file descriptor");
      fs.closeSync({ fd });
      try {
        fs.readSync({ fd, arrayBuffer: new ArrayBuffer(1), length: 1 });
        return false;
      } catch (error) {
        return !!error;
      }
    }),
  );
  await check(
    "fs.truncate-path",
    "ab",
    withFile((fs, path) => {
      fs.truncateSync({ filePath: path, length: 2 });
      return fs.readFileSync(path, "utf8");
    }),
  );
}
module.exports = { descriptors };
