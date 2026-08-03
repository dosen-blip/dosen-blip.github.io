import http from "node:http"
import fs from "node:fs"
import path from "node:path"

const dist = path.resolve("dist")
const port = Number(process.env.PORT || 4173)
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0])
  const relative = decoded.replace(/^\/+/, "")
  const resolved = path.resolve(dist, relative)
  return resolved.startsWith(dist) ? resolved : null
}

http.createServer((req, res) => {
  const target = safePath(req.url || "/")
  if (!target) { res.writeHead(400); res.end("Bad request"); return }
  let file = target
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html")
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" })
    fs.createReadStream(file).pipe(res)
    return
  }
  res.writeHead(404, { "content-type": "text/html; charset=utf-8" })
  fs.createReadStream(path.join(dist, "404.html")).pipe(res)
}).listen(port, "127.0.0.1", () => console.log(`Serving dist at http://127.0.0.1:${port}`))
