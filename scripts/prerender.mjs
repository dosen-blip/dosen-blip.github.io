import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { knownRoutes } from "../src/data/routes.js"

const root = process.cwd()
const dist = path.join(root, "dist")
const template = await fs.readFile(path.join(dist, "index.html"), "utf8")
const { render } = await import(pathToFileURL(path.join(root, ".prerender", "entry-server.js")))

for (const route of [...knownRoutes, "/__404__"]) {
  const targetRoute = route === "/__404__" ? "/not-found" : route
  const { html, head } = render(targetRoute)
  const output = template.replace("<!--app-head-->", head).replace("<!--app-html-->", html)
  const outputPath = route === "/__404__"
    ? path.join(dist, "404.html")
    : route === "/"
      ? path.join(dist, "index.html")
      : path.join(dist, route.slice(1), "index.html")
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, output)
}
