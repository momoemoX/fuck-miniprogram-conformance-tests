import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 8123);
const host = process.env.HOST || "127.0.0.1";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleVideo = fs.readFileSync(path.join(__dirname, "..", "fixtures", "sample.mp4"));
const largePayload = Buffer.alloc(524288);
for (let i = 0; i < largePayload.length; i += 1) {
  largePayload[i] = (i * 31 + 7) & 0xff;
}

http
  .createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "*");
    response.setHeader("Cache-Control", "no-store");
    if (request.method === "OPTIONS") return response.writeHead(204).end();
    if (["/echo", "/upload", "/mirror"].includes(url.pathname)) {
      const parts = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 65536) return response.writeHead(413).end();
        parts.push(chunk);
      }
      const body = Buffer.concat(parts);
      if (url.pathname === "/mirror")
        return response.writeHead(200, { "Content-Type": "application/octet-stream" }).end(body);
      response.writeHead(200, { "Content-Type": "application/json" });
      if (url.pathname === "/upload") {
        const text = body.toString();
        return response.end(
          JSON.stringify({
            file: text.includes('name="asset"') && text.includes("suite-file-contents"),
            field: text.includes('name="batch"') && text.includes("citrus"),
          }),
        );
      }
      return response.end(
        JSON.stringify({
          method: request.method,
          query: url.searchParams.get("q"),
          body: Buffer.concat(parts).toString(),
        }),
      );
    }
    if (url.pathname === "/plain")
      return response.writeHead(200, { "Content-Type": "text/plain" }).end("raw text");
    if (url.pathname === "/delayed") {
      const rawMs = Number(url.searchParams.get("ms"));
      const waitMs = Number.isFinite(rawMs) ? Math.min(10000, Math.max(0, rawMs)) : 1500;
      const body = url.searchParams.get("tag") || "done";
      const timer = setTimeout(() => {
        if (!response.writableEnded) {
          response.writeHead(200, { "Content-Type": "text/plain" }).end(body);
        }
      }, waitMs);
      response.on("close", () => clearTimeout(timer));
      return;
    }
    response.setHeader("Access-Control-Expose-Headers", "X-Suite-Color, Location");
    response.setHeader("X-Suite-Color", "violet");
    if (url.pathname === "/redirect")
      return response.writeHead(302, { Location: "/plain" }).end();
    if (url.pathname === "/redirect-hop1")
      return response.writeHead(302, { Location: "/redirect-hop2" }).end();
    if (url.pathname === "/redirect-hop2")
      return response.writeHead(302, { Location: "/plain" }).end();
    if (url.pathname === "/large")
      return response
        .writeHead(200, {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(largePayload.length),
        })
        .end(largePayload);
    if (url.pathname === "/chunked") {
      response.writeHead(200, {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      });
      response.flushHeaders();
      response.write("chunk-1|");
      const timers = [];
      timers.push(
        setTimeout(() => {
          if (!response.writableEnded) response.write("chunk-2|");
        }, 60),
      );
      timers.push(
        setTimeout(() => {
          if (!response.writableEnded) response.end("chunk-3");
        }, 120),
      );
      response.on("close", () => {
        for (const timer of timers) clearTimeout(timer);
      });
      return;
    }
    if (url.pathname === "/video.mp4") {
      const range = request.headers.range;
      if (range && range.startsWith("bytes=")) {
        const [startStr, endStr] = range.slice(6).split("-");
        const start = Number(startStr) || 0;
        const end = endStr ? Math.min(Number(endStr), sampleVideo.length - 1) : sampleVideo.length - 1;
        const slice = sampleVideo.subarray(start, end + 1);
        return response
          .writeHead(206, {
            "Content-Type": "video/mp4",
            "Accept-Ranges": "bytes",
            "Content-Range": `bytes ${start}-${end}/${sampleVideo.length}`,
            "Content-Length": String(slice.length),
          })
          .end(slice);
      }
      return response
        .writeHead(200, {
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
          "Content-Length": String(sampleVideo.length),
        })
        .end(sampleVideo);
    }
    if (url.pathname === "/bytes")
      return response
        .writeHead(200, { "Content-Type": "application/octet-stream" })
        .end(Buffer.from([0, 255, 13]));
    response.writeHead(404).end("missing");
  })
  .listen(port, host, () => console.log("HTTP fixture listening on " + host + ":" + port));
