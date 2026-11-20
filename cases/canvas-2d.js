const { update, call } = require("./support");

// Modern <canvas type="2d"> accessed via SelectorQuery.node().
function getCanvas2d(page) {
  return new Promise((resolve, reject) => {
    page
      .createSelectorQuery()
      .select("#canvas-2d")
      .fields({ node: true, size: true })
      .exec((rows) => {
        const entry = rows && rows[0];
        if (!entry || !entry.node) {
          reject(new Error("Canvas 2D node not available"));
          return;
        }
        resolve(entry);
      });
  });
}

async function canvas2dContract(page, check) {
  async function isolated(id, expected, exercise) {
    await check(id, expected, async () => {
      try {
        await update(page, { canvas2dMounted: true });
        const { node } = await getCanvas2d(page);
        node.width = 40;
        node.height = 40;
        const ctx = node.getContext("2d");
        return await exercise(node, ctx);
      } finally {
        await update(page, { canvas2dMounted: false });
      }
    });
  }

  await isolated(
    "canvas2d.node-and-context",
    [true, true, true, true, true, 40, 40],
    (node, ctx) => [
      typeof node.getContext === "function",
      typeof node.createImage === "function",
      typeof node.createImageData === "function",
      !!ctx && typeof ctx.fillRect === "function",
      !!ctx && typeof ctx.getImageData === "function",
      node.width,
      node.height,
    ],
  );

  await isolated("canvas2d.fill-and-read-pixels", [18, 52, 86, 255], (node, ctx) => {
    ctx.clearRect(0, 0, 40, 40);
    ctx.fillStyle = "#123456";
    ctx.fillRect(0, 0, 20, 20);
    return Array.from(ctx.getImageData(5, 5, 1, 1).data);
  });

  await isolated(
    "canvas2d.put-and-clear-rect",
    [
      [255, 128, 0, 255],
      [0, 0, 0, 0],
    ],
    (node, ctx) => {
      const imgData = ctx.createImageData(4, 4);
      for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = 255;
        imgData.data[i + 1] = 128;
        imgData.data[i + 2] = 0;
        imgData.data[i + 3] = 255;
      }
      ctx.putImageData(imgData, 2, 2);
      const written = Array.from(ctx.getImageData(3, 3, 1, 1).data);
      ctx.clearRect(2, 2, 4, 4);
      const cleared = Array.from(ctx.getImageData(3, 3, 1, 1).data);
      return [written, cleared];
    },
  );

  await isolated(
    "canvas2d.save-restore-transform",
    [
      [255, 0, 0, 255],
      [0, 255, 0, 255],
    ],
    (node, ctx) => {
      ctx.clearRect(0, 0, 40, 40);
      ctx.save();
      ctx.translate(10, 10);
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, 4, 4);
      ctx.restore();
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(0, 0, 4, 4);
      return [
        Array.from(ctx.getImageData(12, 12, 1, 1).data),
        Array.from(ctx.getImageData(2, 2, 1, 1).data),
      ];
    },
  );

  await isolated("canvas2d.image-load-and-draw", [true, true, 255], async (node, ctx) => {
    const img = node.createImage();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (err) => reject(new Error("Image load failed: " + JSON.stringify(err)));
      img.src = "/fixtures/visual-sample.png";
    });
    ctx.clearRect(0, 0, 40, 40);
    ctx.drawImage(img, 0, 0, 20, 20);
    const pixel = Array.from(ctx.getImageData(10, 10, 1, 1).data);
    return [img.width > 0 && img.height > 0, pixel[0] + pixel[1] + pixel[2] > 0, pixel[3]];
  });

  await isolated("canvas2d.to-data-url-and-export-file", [true, true, "png"], async (node, ctx) => {
    ctx.fillStyle = "#07c160";
    ctx.fillRect(0, 0, 40, 40);
    const dataUrl = node.toDataURL("image/png");
    const exported = await call(wx, "canvasToTempFilePath", {
      canvas: node,
      fileType: "png",
    });
    const info = await call(wx, "getImageInfo", { src: exported.tempFilePath });
    return [
      typeof dataUrl === "string" && dataUrl.startsWith("data:image/png;base64,"),
      info.width > 0 && info.height > 0,
      info.type,
    ];
  });

  await isolated("canvas2d.measure-text", [true, true], (node, ctx) => {
    ctx.font = "16px sans-serif";
    const single = ctx.measureText("A").width;
    const five = ctx.measureText("ABCDE").width;
    return [typeof single === "number" && single > 0, five > single * 2];
  });

  await isolated("canvas2d.request-animation-frame", [false, true, true], (node) => {
    return new Promise((resolve, reject) => {
      let cancelledRan = false;
      const timer = setTimeout(() => reject(new Error("requestAnimationFrame timed out")), 3000);
      const idToCancel = node.requestAnimationFrame(() => {
        cancelledRan = true;
      });
      node.cancelAnimationFrame(idToCancel);
      node.requestAnimationFrame((timestamp) => {
        clearTimeout(timer);
        resolve([cancelledRan, true, typeof timestamp === "number" && timestamp >= 0]);
      });
    });
  });
}

module.exports = { canvas2dContract };
