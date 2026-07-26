import { Link } from "react-router-dom"
import "../styles/not-found.css"

export default function NotFoundPage() {
  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-card">
        <div className="not-found-copy">
          <h1 id="not-found-title">404</h1>
          <div className="not-found-message">
            <p>OOPS!</p>
            <p>The page you are looking for wasn&apos;t found!</p>
          </div>
        </div>
        <Link className="not-found-home" to="/">Go Back Home</Link>
      </div>
    </section>
  )
}
