import { renderToString } from "react-dom/server"
import { StaticRouter } from "react-router"
import { App } from "./App"
import { metaFor, seoFor } from "./utils/seo"

export function render(path) {
  return {
    html: renderToString(<StaticRouter location={path}><App /></StaticRouter>),
    head: seoFor({ path, ...metaFor(path) }),
  }
}
