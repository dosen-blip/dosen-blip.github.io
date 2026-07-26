import fs from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const manifest = JSON.parse(await fs.readFile(path.join(root, "references", "manifest.json"), "utf8"))
const urls = new Set()
for (const route of Object.values(manifest.routes)) {
  for (const viewport of Object.values(route.viewports)) {
    for (const media of viewport.assets || []) {
      if (media.src?.includes("framerusercontent.com/")) urls.add(media.src)
    }
  }
}

const targetDir = path.join(root, "public", "assets")
await fs.mkdir(targetDir, { recursive: true })
const records = []
for (const url of [...urls].sort()) {
  const source = new URL(url)
  const filename = path.basename(source.pathname)
  const target = path.join(targetDir, filename)
  try {
    await fs.access(target)
  } catch {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${response.status} downloading ${url}`)
    await fs.writeFile(target, Buffer.from(await response.arrayBuffer()))
  }
  const stat = await fs.stat(target)
  records.push({ source: url, local: `/assets/${filename}`, bytes: stat.size })
}

await fs.writeFile(path.join(root, "references", "assets.json"), JSON.stringify(records, null, 2))
console.log(`Vendored ${records.length} published Framer media assets.`)
