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

  await isolated(
    "canvas2d.dpr-scale-alignment",
    [
      [0, 0, 0, 0],
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 0, 0, 0],
    ],
    (node, ctx) => {
      node.width = 80;
      node.height = 80;
      ctx.clearRect(0, 0, 80, 80);
      ctx.save();
      ctx.scale(2, 2);
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(5, 5, 10, 10);
      ctx.restore();
      return [
        Array.from(ctx.getImageData(9, 9, 1, 1).data),
        Array.from(ctx.getImageData(11, 11, 1, 1).data),
        Array.from(ctx.getImageData(29, 29, 1, 1).data),
        Array.from(ctx.getImageData(31, 31, 1, 1).data),
      ];
    },
  );

  await isolated(
    "canvas2d.path-stroke-and-fill",
    [
      [0, 0, 0, 0],
      [0, 0, 255, 255],
      [255, 0, 0, 255],
    ],
    (node, ctx) => {
      ctx.clearRect(0, 0, 40, 40);
      ctx.beginPath();
      ctx.moveTo(6, 6);
      ctx.lineTo(34, 6);
      ctx.lineTo(34, 34);
      ctx.lineTo(6, 34);
      ctx.closePath();
      ctx.fillStyle = "#ff0000";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#0000ff";
      ctx.stroke();
      return [
        Array.from(ctx.getImageData(1, 1, 1, 1).data),
        Array.from(ctx.getImageData(6, 20, 1, 1).data),
        Array.from(ctx.getImageData(20, 20, 1, 1).data),
      ];
    },
  );

  await isolated(
    "canvas2d.arc-circle-pixels",
    [
      [0, 128, 255, 255],
      [0, 0, 0, 0],
    ],
    (node, ctx) => {
      ctx.clearRect(0, 0, 40, 40);
      ctx.beginPath();
      ctx.arc(20, 20, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#0080ff";
      ctx.fill();
      return [
        Array.from(ctx.getImageData(20, 20, 1, 1).data),
        Array.from(ctx.getImageData(2, 2, 1, 1).data),
      ];
    },
  );

  await isolated(
    "canvas2d.clip-region",
    [
      [0, 0, 0, 0],
      [255, 255, 0, 255],
      [0, 0, 0, 0],
    ],
    (node, ctx) => {
      ctx.clearRect(0, 0, 40, 40);
      ctx.save();
      ctx.beginPath();
      ctx.rect(10, 10, 10, 10);
      ctx.clip();
      ctx.fillStyle = "#ffff00";
      ctx.fillRect(0, 0, 40, 40);
      ctx.restore();
      return [
        Array.from(ctx.getImageData(5, 5, 1, 1).data),
        Array.from(ctx.getImageData(15, 15, 1, 1).data),
        Array.from(ctx.getImageData(25, 25, 1, 1).data),
      ];
    },
  );

  await isolated("canvas2d.linear-gradient", [true, true, true], (node, ctx) => {
    ctx.clearRect(0, 0, 40, 40);
    const grad = ctx.createLinearGradient(0, 0, 40, 0);
    grad.addColorStop(0, "#ff0000");
    grad.addColorStop(1, "#0000ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 40, 40);
    const left = Array.from(ctx.getImageData(2, 20, 1, 1).data);
    const mid = Array.from(ctx.getImageData(20, 20, 1, 1).data);
    const right = Array.from(ctx.getImageData(38, 20, 1, 1).data);
    return [
      left[0] > 200 && left[2] < 50,
      mid[0] > 80 && mid[2] > 80,
      right[2] > 200 && right[0] < 50,
    ];
  });

  await isolated("canvas2d.global-alpha-blending", [true, 0, true, 255], (node, ctx) => {
    ctx.clearRect(0, 0, 40, 40);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 40, 40);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#0000ff";
    ctx.fillRect(0, 0, 40, 40);
    const p = Array.from(ctx.getImageData(20, 20, 1, 1).data);
    return [p[0] >= 110 && p[0] <= 145, p[1], p[2] >= 110 && p[2] <= 145, p[3]];
  });

  await isolated(
    "canvas2d.composite-destination-out",
    [
      [0, 255, 0, 255],
      [0, 0, 0, 0],
    ],
    (node, ctx) => {
      ctx.clearRect(0, 0, 40, 40);
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(0, 0, 40, 40);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(10, 10, 10, 10);
      return [
        Array.from(ctx.getImageData(5, 5, 1, 1).data),
        Array.from(ctx.getImageData(15, 15, 1, 1).data),
      ];
    },
  );

  await isolated(
    "canvas2d.path2d-support",
    [
      true,
      [128, 0, 128, 255],
      [0, 0, 0, 0],
    ],
    (node, ctx) => {
      const hasFactory = typeof node.createPath2D === "function";
      const path = node.createPath2D();
      path.rect(8, 8, 16, 16);
      ctx.clearRect(0, 0, 40, 40);
      ctx.fillStyle = "#800080";
      ctx.fill(path);
      return [
        hasFactory,
        Array.from(ctx.getImageData(15, 15, 1, 1).data),
        Array.from(ctx.getImageData(2, 2, 1, 1).data),
      ];
    },
  );

  await isolated("canvas2d.draw-offscreen-canvas", [255, 0, 255, 255], (node, ctx) => {
    const offscreen = wx.createOffscreenCanvas({ type: "2d", width: 16, height: 16 });
    const octx = offscreen.getContext("2d");
    octx.fillStyle = "#ff00ff";
    octx.fillRect(0, 0, 16, 16);
    ctx.clearRect(0, 0, 40, 40);
    ctx.drawImage(offscreen, 4, 4);
    return Array.from(ctx.getImageData(10, 10, 1, 1).data);
  });

  await isolated("canvas2d.image-onerror", [false, true], (node) => {
    return new Promise((resolve, reject) => {
      const img = node.createImage();
      let loaded = false;
      const timer = setTimeout(() => reject(new Error("Image onerror timed out")), 3000);
      img.onload = () => {
        loaded = true;
        clearTimeout(timer);
        resolve([loaded, false]);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve([loaded, true]);
      };
      img.src = "/fixtures/definitely-missing-image.png";
    });
  });
}

module.exports = { canvas2dContract };
