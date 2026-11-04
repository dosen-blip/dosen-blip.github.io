import { useImperativeHandle, useRef } from "react"
import { glassLooks } from "../data/glassLooks"
import { ArtCanvas } from "./glassArt"
import { useGlassPointer } from "./useGlassPointer"
import "../styles/glass-folder.css"
import "../styles/glass-card.css"

// One fixed paint size whatever the card's size, so cards with the same look share one cached paint.
const ART_W = 480
const ART_H = 320

/**
 * A content card made of the same material as the glass folders: their generated art, sheen, frost, tint, cursor
 * highlight, rim and edge glow, with the children on top. The tint is heavier than a folder's so paragraphs stay
 * legible; src/styles/glass-card.css has the numbers.
 *
 * Props:
 * - as: the root element or component, "div" by default (a Link or "a" for a link card).
 * - look: "web" | "motion" | "ux", the recipes in src/data/glassLooks.js. Motion is smoked glass in both themes.
 * - Everything else, ref included, goes to the root.
 */
export default function GlassCard({ as: Root = "div", look = "motion", className, children, ref, ...rest }) {
  const id = glassLooks[look] ? look : "motion"
  const { art, seed, tone } = glassLooks[id]
  const rootRef = useRef(null)
  useImperativeHandle(ref, () => rootRef.current, [])
  useGlassPointer(rootRef)

  return (
    <Root {...rest} ref={rootRef} className={"gc" + (className ? " " + className : "")} data-look={id} data-tone={tone}>
      <span className="gc-layers" aria-hidden="true">
        <ArtCanvas className="gf-art gc-art" art={art} seed={seed} w={ART_W} h={ART_H} priority={2} fluid />
        <span className="gf-back-sheen" />
        <span className="gc-frost" />
        <span className="gc-tint" />
        <span className="gf-spec" />
        <span className="gc-glow" />
        <span className="gc-rim" />
      </span>
      {children}
    </Root>
  )
}
