import http from "node:http";

const port = Number(process.env.PORT || 8123);
const host = process.env.HOST || "127.0.0.1";
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
      const timer = setTimeout(() => response.end("done"), 1500);
      response.on("close", () => clearTimeout(timer));
      return;
    }
    response.setHeader("Access-Control-Expose-Headers", "X-Suite-Color");
    response.setHeader("X-Suite-Color", "violet");
    if (url.pathname === "/bytes")
      return response
        .writeHead(200, { "Content-Type": "application/octet-stream" })
        .end(Buffer.from([0, 255, 13]));
    response.writeHead(404).end("missing");
  })
  .listen(port, host, () => console.log("HTTP fixture listening on " + host + ":" + port));
