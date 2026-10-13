import { Link } from "react-router-dom"
import { ToolIcon } from "../brand/ToolIcon"
import "../styles/not-found.css"

export default function NotFoundPage() {
  return (
    <section className="page not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-card">
        <div className="not-found-screen" aria-hidden="true">
          <code>&lt;Route path=&quot;?&quot; /&gt;</code>
          <ToolIcon name="cursor" />
        </div>
        <div className="not-found-copy">
          <h1 id="not-found-title">404</h1>
          <div className="not-found-message">
            <p>Page not found</p>
            <p>There is no page at this address.</p>
          </div>
        </div>
        <Link className="button button--primary not-found-home" to="/">Back to home</Link>
      </div>
    </section>
  )
}
