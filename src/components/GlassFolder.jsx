import { useCallback, useEffect, useId, useRef, useState } from "react"
import { ArtCanvas } from "./glassArt"
import { fanSlot, hashString, rng } from "./glassFolderArt"
import { useGlassPointer } from "./useGlassPointer"
import "../styles/glass-folder.css"

/**
 * Glass folder: a folder drawn as an object, not a picture of one.
 *
 * Three layers, back to front: a back panel holding a piece of artwork, the files the folder
 * contains, and a frosted-glass front panel that blurs whatever sits behind it.
 *
 * - Rest: flat and closed. The tops of the files only just show.
 * - Hover / focus: the front panel leans toward you on its bottom hinge and the files lift a little.
 * - Open (click, Enter, Space): the panel falls further forward and the files rise out and fan,
 *   each one a button or link with its name on it.
 * - Add (`+`): a new file drops in, the pocket gives a little, and the count rolls over.
 * - Link (an arrow): a real link, on the same glass key, to wherever the folder's contents live in full.
 *
 * The artwork is generated, not fetched: a domain-warped noise field shaded as a liquid surface,
 * painted once per recipe into a canvas over a few frames and shared between every folder that
 * uses it. Pass `image` to use a picture instead.
 *
 * Ported from the 21st.dev "Glass Folder Cards" component (TypeScript + inline CSS) to plain JSX
 * with its stylesheet in src/styles/glass-folder.css. `tone="auto"` follows the site theme.
 */

// ---------------------------------------------------------------------------
// Geometry, in the folder's own units. The stage is drawn at 340 × 272 and scaled to `width`,
// so the shapes can be fixed paths.

const W = 340
const H = 272
const HEADROOM = 54 // room above the back panel for the files to rise into
const FRONT_TOP = 74
const FRONT_H = H - FRONT_TOP
const SHEET_W = 272
const SHEET_H = 184

const BACK_PATH =
  "M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z"
const FRONT_PATH =
  "M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 " +
  (FRONT_H - 22) +
  "A22 22 0 0 1 318 " +
  FRONT_H +
  "L22 " +
  FRONT_H +
  "A22 22 0 0 1 0 " +
  (FRONT_H - 22) +
  "Z"

const MAX_VISIBLE = 4

const SAMPLE_FILES = [
  { name: "Cover — final", meta: "PNG · 4.8 MB", art: "ember" },
  { name: "Moodboard", meta: "24 images", art: "dusk" },
  { name: "Brief.pdf", meta: "PDF · 1.2 MB" },
]

/**
 * Props:
 * - label, meta: the two lines on the glass. `meta` defaults to the file count. `description` adds a short
 *   sentence beneath them, set in the glass's quieter ink.
 * - tone: "light" (milk glass), "dark" (smoked glass) or "auto" (follows the site theme).
 * - art: a preset name, a recipe, or "none". `seed` rearranges it. `image` uses a picture instead.
 * - files: [{ name, meta, art, image, media, fit, background, href }]. Read once; after that the folder owns the list.
 *   `fit: "contain"` letterboxes the image (for a logo), `background` colours the sheet behind it, and `media`
 *   is your own markup for the picture.
 * - openLink: { label, href, onSelect } — a lit link that hangs just above the fan while the folder is open.
 * - action: "add" | "link" | "none". `onAdd(files)` returns the file to add. `link` is { label, href, onSelect } for
 *   the link key; the label is its accessible name.
 * - labelPlacement: "bottom-left" | "top-left" | "top-right".
 * - open / defaultOpen / onOpenChange, onFileSelect(file, index).
 * - width in px (the height is 0.96 × width), appear + appearDelay for the entrance.
 */
export default function GlassFolder({
  label = "My Files",
  meta,
  description,
  tone = "light",
  art = "aurora",
  seed = 3,
  image,
  files: initialFiles = SAMPLE_FILES,
  action = "add",
  onAdd,
  onFilesChange,
  link,
  labelPlacement = "bottom-left",
  openLink,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onFileSelect,
  width = 340,
  appear = true,
  appearDelay = 0,
  className,
  style,
}) {
  const uid = useId().replace(/:/g, "")
  const rootRef = useRef(null)
  const filesRef = useRef(null)
  const hitRef = useRef(null)

  // ids survive re-renders so a newly added file is the only one that animates in
  const [items, setItems] = useState(() => initialFiles.map((file, i) => ({ id: i, file })))
  const nextId = useRef(initialFiles.length)
  const [dropped, setDropped] = useState(null)
  const [bump, setBump] = useState(0)

  const [openState, setOpenState] = useState(defaultOpen)
  const open = openProp ?? openState
  const setOpen = useCallback(
    (next) => {
      if (openProp === undefined) setOpenState(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )
  const [entered, setEntered] = useState(!appear)

  const k = width / W
  const density = Math.min(1.5, Math.max(1, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1)) * k

  // ---- entrance: assemble the first time the folder is on screen ----------
  useEffect(() => {
    if (!appear) return undefined
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setEntered(true)
      return undefined
    }
    let t = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        t = window.setTimeout(() => setEntered(true), appearDelay)
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearTimeout(t)
    }
  }, [appear, appearDelay])

  useGlassPointer(rootRef)

  // ---- closed files are out of the tab order ------------------------------
  useEffect(() => {
    filesRef.current?.toggleAttribute("inert", !open)
  }, [open])

  // ---- Escape and a press outside close the folder ------------------------
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key !== "Escape") return
      setOpen(false)
      hitRef.current?.focus()
    }
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onDown)
    }
  }, [open, setOpen])

  const files = items.map((item) => item.file)

  const addFile = () => {
    const made = onAdd?.(files)
    const file = made || { name: "Untitled " + (files.length + 1), meta: "Just now" }
    const id = nextId.current++
    const next = [...items, { id, file }]
    setItems(next)
    setDropped(id)
    setBump((b) => b + 1)
    onFilesChange?.(next.map((item) => item.file))
  }

  // the newest files sit at the front of the stack, nearest the glass
  const start = Math.max(0, items.length - MAX_VISIBLE)
  const visible = items.slice(start)
  const count = items.length
  const metaLine = meta ?? count + (count === 1 ? " item" : " items")

  /** Where a sheet sits in the fan, as the CSS variables its transform reads. The deepest sheet (v = 0) rises highest. */
  const sheetVars = ({ id, file }, v) => {
    const jitter = rng(hashString(file.name) + id)
    return {
      "--gf-slot": fanSlot(v, visible.length),
      "--gf-depth": visible.length - 1 - v,
      "--gf-jx": ((jitter() - 0.5) * 10).toFixed(2) + "px",
      "--gf-jr": ((jitter() - 0.5) * 3.2).toFixed(2) + "deg",
    }
  }

  return (
    <div
      ref={rootRef}
      className={"gf-root" + (className ? " " + className : "")}
      data-tone={tone}
      data-open={open || undefined}
      data-entered={entered || undefined}
      data-place={labelPlacement}
      style={{ width, height: (H + HEADROOM) * k, ...style }}
    >
      <div className="gf-stage" style={{ transform: "translateY(" + HEADROOM * k + "px) scale(" + k + ")" }}>
        <div className="gf-tilt">
          <div className="gf-shadow" aria-hidden="true" />

          {/* back panel and its artwork */}
          <div className="gf-back" style={{ clipPath: "path('" + BACK_PATH + "')" }} aria-hidden="true">
            {image ? (
              <img className="gf-art" src={image} alt="" width={W + 24} height={H + 24} draggable={false} />
            ) : art !== "none" ? (
              <ArtCanvas className="gf-art" art={art} seed={seed} w={W + 24} h={H + 24} density={density} priority={0} />
            ) : null}
            <div className="gf-back-sheen" />
            <svg className="gf-rim gf-glow gf-back-glow" viewBox={"0 0 " + W + " " + H} aria-hidden="true">
              <path className="gf-glow-soft" d={BACK_PATH} />
              <path className="gf-glow-core" d={BACK_PATH} />
            </svg>
          </div>
          <svg className="gf-rim gf-back-rim" viewBox={"0 0 " + W + " " + H} aria-hidden="true">
            <path d={BACK_PATH} />
          </svg>

          {/* the frosted front panel, hinged on its bottom edge */}
          <div
            key={bump}
            className={"gf-front" + (bump ? " gf-front--bump" : "")}
            style={{ clipPath: "path('" + FRONT_PATH + "')" }}
          >
            <div className="gf-tint" aria-hidden="true" />
            <div className="gf-spec" aria-hidden="true" />
            <svg className="gf-rim gf-glow gf-front-glow" viewBox={"0 0 " + W + " " + FRONT_H} aria-hidden="true">
              <path className="gf-glow-soft" d={FRONT_PATH} />
              <path className="gf-glow-core" d={FRONT_PATH} />
            </svg>
            <svg className="gf-rim gf-front-rim" viewBox={"0 0 " + W + " " + FRONT_H} aria-hidden="true">
              <defs>
                <linearGradient id={"gf-rim-" + uid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
                  <stop offset="0.35" stopColor="#fff" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
                </linearGradient>
              </defs>
              <path d={FRONT_PATH} stroke={"url(#gf-rim-" + uid + ")"} />
            </svg>
            <button
              ref={hitRef}
              type="button"
              className="gf-hit"
              aria-expanded={open}
              aria-label={(open ? "Close " : "Open ") + label + ", " + count + (count === 1 ? " item" : " items")}
              onClick={() => setOpen(!open)}
            />
            <div className="gf-label">
              <span className="gf-title">{label}</span>
              <span className="gf-meta" key={metaLine}>
                {metaLine}
              </span>
              {description ? <span className="gf-desc">{description}</span> : null}
            </div>
          </div>

          {/* the contents: after the glass in tab order, beneath it on screen */}
          <div ref={filesRef} className="gf-files" role="list" aria-label={label + " contents"}>
            {visible.map((item, v) => {
              const { id, file } = item
              const picture = !!(file.art || file.image || file.media)
              const inner = (
                <>
                  {file.media ? (
                    <span className="gf-sheet-art gf-sheet-media">{file.media}</span>
                  ) : picture ? (
                    file.image ? (
                      <img
                        className={"gf-sheet-art" + (file.fit === "contain" ? " gf-sheet-art--contain" : "")}
                        src={file.image}
                        alt=""
                        width={SHEET_W}
                        height={SHEET_H}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    ) : (
                      <ArtCanvas
                        className="gf-sheet-art"
                        art={file.art}
                        seed={hashString(file.name) % 997}
                        w={SHEET_W}
                        h={SHEET_H}
                        density={Math.min(density, 1.25)}
                        priority={1}
                      />
                    )
                  ) : (
                    <span className="gf-lines" aria-hidden="true">
                      <i style={{ width: "86%" }} />
                      <i style={{ width: "92%" }} />
                      <i style={{ width: "64%" }} />
                      <i style={{ width: "88%" }} />
                      <i style={{ width: "42%" }} />
                    </span>
                  )}
                  <span className="gf-sheet-head">
                    <span className="gf-sheet-name">{file.name}</span>
                    {file.meta ? <span className="gf-sheet-meta">{file.meta}</span> : null}
                  </span>
                </>
              )
              const common = {
                className: "gf-sheet" + (picture ? " gf-sheet--art" : "") + (id === dropped ? " gf-sheet--drop" : ""),
                style: {
                  ...sheetVars(item, v),
                  zIndex: v + 1,
                  ...(file.background ? { background: file.background } : null),
                },
                onAnimationEnd: id === dropped ? () => setDropped(null) : undefined,
              }
              return (
                <div key={id} role="listitem" className="gf-sheet-slot">
                  {file.href ? (
                    <a {...common} href={file.href} onClick={(event) => onFileSelect?.(file, start + v, event)}>
                      {inner}
                    </a>
                  ) : (
                    <button {...common} type="button" onClick={(event) => onFileSelect?.(file, start + v, event)}>
                      {inner}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {openLink && visible.length ? (
            /* the track is an invisible copy of the highest sheet, so the link sits on its top edge and leans with it */
            <div className="gf-crown-track" style={sheetVars(visible[0], 0)} aria-hidden={open ? undefined : "true"}>
              <a
                className="gf-crown"
                href={openLink.href}
                tabIndex={open ? undefined : -1}
                onClick={(event) => openLink.onSelect?.(event)}
              >
                {openLink.label}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
              </a>
            </div>
          ) : null}

          {action === "add" ? (
            <button type="button" className="gf-key gf-key--add" aria-label={"Add a file to " + label} onClick={addFile}>
              <svg key={bump} className="gf-glyph gf-glyph--plus" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4.5v15M4.5 12h15" />
              </svg>
            </button>
          ) : action === "link" && link ? (
            <a className="gf-key gf-key--link" href={link.href} aria-label={link.label} onClick={(event) => link.onSelect?.(event)}>
              <svg className="gf-glyph gf-glyph--link" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M14 7l5 5-5 5" />
              </svg>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
