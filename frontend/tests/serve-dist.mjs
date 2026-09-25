import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const distRoot = resolve(frontendRoot, "dist");
const prefix = "/smoke";
const port = Number(process.env.PORT || 4173);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function requestedFile(requestUrl) {
  const pathname = new URL(requestUrl, "http://127.0.0.1").pathname;
  if (pathname === `${prefix}/` || pathname === prefix) {
    return resolve(distRoot, "index.html");
  }
  if (!pathname.startsWith(`${prefix}/`)) {
    return null;
  }
  const relativePath = pathname.slice(prefix.length + 1);
  const filePath = resolve(distRoot, relativePath);
  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${sep}`)) {
    return null;
  }
  return filePath;
}

const server = createServer((request, response) => {
  const filePath = request.url ? requestedFile(request.url) : null;
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${distRoot} at http://127.0.0.1:${port}${prefix}/`);
});
