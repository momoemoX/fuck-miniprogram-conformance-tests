const { sandbox } = require("./files");
const { call } = require("./support");

// One deflated ZIP member, fruit/name.txt, containing seven UTF-8 bytes.
const zip =
  "UEsDBBQAAAAIAO12cl1uaqeECQAAAAcAAAAOAAAAZnJ1aXQvbmFtZS50eHTLLs0tLE0sAQBQSwECFAMUAAAACADtdnJdbmqnhAkAAAAHAAAADgAAAAAAAAAAAAAAgAEAAAAAZnJ1aXQvbmFtZS50eHRQSwUGAAAAAAEAAQA8AAAANQAAAAAA";

async function formats(check) {
  for (const mode of ["sync", "async"]) {
    await check(
      "fs.brotli-" + mode,
      [0, 1, 2, 255],
      sandbox(async (fs, dir) => {
        const filePath = dir + "/value.br";
        fs.writeFileSync(filePath, "iwGAAAEC/wM=", "base64");
        const options = { filePath, compressionAlgorithm: "br" };
        const bytes =
          mode === "sync"
            ? fs.readCompressedFileSync(options)
            : (await call(fs, "readCompressedFile", options)).data;
        return Array.from(new Uint8Array(bytes));
      }),
    );
  }
  await check(
    "fs.zip-entry",
    "kumquat",
    sandbox(async (fs, dir) => {
      const filePath = dir + "/fruit.zip";
      fs.writeFileSync(filePath, zip, "base64");
      const result = await call(fs, "readZipEntry", {
        filePath,
        entries: [{ path: "fruit/name.txt", encoding: "utf8" }],
      });
      return result.entries["fruit/name.txt"].data;
    }),
  );
  await check(
    "fs.unzip-tree",
    "kumquat",
    sandbox(async (fs, dir) => {
      const zipFilePath = dir + "/fruit.zip",
        targetPath = dir + "/out";
      fs.writeFileSync(zipFilePath, zip, "base64");
      fs.mkdirSync(targetPath);
      await call(fs, "unzip", { zipFilePath, targetPath });
      return fs.readFileSync(targetPath + "/fruit/name.txt", "utf8");
    }),
  );
  for (const [algorithm, hash] of [
    ["md5", "900150983cd24fb0d6963f7d28e17f72"],
    ["sha1", "a9993e364706816aba3e25717850c26c9cd0d89d"],
    ["sha256", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
  ]) {
    await check(
      "fs.digest-" + algorithm,
      [3, hash],
      sandbox(async (fs, dir) => {
        const filePath = dir + "/sample";
        fs.writeFileSync(filePath, "abc", "utf8");
        const result = await call(fs, "getFileInfo", { filePath, digestAlgorithm: algorithm });
        return [result.size, result.digest.toLowerCase()];
      }),
    );
  }
  await check(
    "fs.async-tree",
    ["ab", true, []],
    sandbox(async (fs, dir) => {
      const folder = dir + "/tree",
        src = folder + "/src",
        copy = folder + "/copy",
        target = folder + "/target";
      await call(fs, "mkdir", { dirPath: folder });
      await call(fs, "writeFile", { filePath: src, data: "abc", encoding: "utf8" });
      await call(fs, "copyFile", { srcPath: src, destPath: copy });
      await call(fs, "rename", { oldPath: copy, newPath: target });
      await call(fs, "truncate", { filePath: target, length: 2 });
      fs.accessSync(target);
      const data = fs.readFileSync(target, "utf8");
      const info = await call(fs, "stat", { path: target });
      await call(fs, "rmdir", { dirPath: folder, recursive: true });
      return [data, info.stats.isFile(), fs.readdirSync(dir)];
    }),
  );
  await check(
    "fd.async-roundtrip",
    [3, 2, 2, 65, 66],
    sandbox(async (fs, dir) => {
      const filePath = dir + "/sample";
      const { fd } = await call(fs, "open", { filePath, flag: "w+" });
      if (typeof fd !== "string") throw new Error("open did not return a file descriptor");
      try {
        const write = await call(fs, "write", { fd, data: "ABC", encoding: "utf8" });
        await call(fs, "ftruncate", { fd, length: 2 });
        const stat = await call(fs, "fstat", { fd });
        const read = await call(fs, "read", {
          fd,
          arrayBuffer: new ArrayBuffer(2),
          offset: 0,
          position: 0,
          length: 2,
        });
        return [
          write.bytesWritten,
          stat.stats.size,
          read.bytesRead,
          ...new Uint8Array(read.arrayBuffer),
        ];
      } finally {
        await call(fs, "close", { fd });
      }
    }),
  );
}
module.exports = { formats };
