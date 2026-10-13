import { renderToString } from "react-dom/server"
import { StaticRouter } from "react-router"
import { App } from "./App"
import { getProject } from "./data/projects"
import { seoFor } from "./utils/seo"
import { pageMeta, shareImage } from "./data/site"

export function render(path) {
  const slug = path.startsWith("/projects/") ? path.split("/").filter(Boolean).at(-1) : null
  const project = slug ? getProject(slug) : null
  const meta = project
    ? { ...project.seo, description: project.summary || project.seo.description }
    : pageMeta[path] ?? {}
  return {
    html: renderToString(<StaticRouter location={path}><App /></StaticRouter>),
    head: seoFor({ path, ...meta, image: meta.image || project?.cover || shareImage }),
  }
}
