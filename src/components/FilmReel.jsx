import { useCallback, useEffect, useRef, useState } from "react"
import { useLenis } from "lenis/react"
import { ArrowUpRightIcon } from "./Icons"
import "../styles/film-reel.css"

const EASE = "cubic-bezier(.16, 1, .3, 1)"
const PHONE_QUERY = "(max-width: 809.98px)"

// The curved row needs a GPU and motion. Everywhere else the films sit as a still row of posters, which open the same way.
function canRunLive() {
  if (!window.matchMedia?.("(prefers-reduced-motion: no-preference)").matches) return false
  if (navigator.connection?.saveData) return false
  if (window.matchMedia(PHONE_QUERY).matches && navigator.deviceMemory && navigator.deviceMemory < 3) return false
  return typeof WebGL2RenderingContext !== "undefined" && typeof IntersectionObserver !== "undefined"
}

function ratioOf(value) {
  const [width, height] = value.split("/").map(Number)
  return width / height
}

// The transform that puts the player's frame over a tile's box on screen.
function transformFrom(rect, frame) {
  const box = frame.getBoundingClientRect()
  const x = rect.left + rect.width / 2 - (box.left + box.width / 2)
  const y = rect.top + rect.height / 2 - (box.top + box.height / 2)
  return `translate(${x}px, ${y}px) scale(${rect.height / box.height})`
}

function FilmPlayer({ film, preview, originOf, onClosed }) {
  const dialogRef = useRef(null)
  const frameRef = useRef(null)
  const stillRef = useRef(null)
  const videoRef = useRef(null)
  const closing = useRef(false)
  const [failed, setFailed] = useState(false)
  const [started, setStarted] = useState(false)
  const lenis = useLenis()

  useEffect(() => {
    const dialog = dialogRef.current
    const frame = frameRef.current
    if (!dialog || !frame) return undefined
    dialog.showModal?.()

    // The frame the tile was showing holds the player until the full film is ready to take over.
    const still = stillRef.current
    if (still && preview?.readyState >= 2) {
      still.width = preview.videoWidth
      still.height = preview.videoHeight
      still.getContext("2d")?.drawImage(preview, 0, 0)
    }

    const video = videoRef.current
    const played = video?.play?.()
    played?.catch?.(() => {
      video.muted = true
      video.play().catch(() => {})
    })

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const origin = originOf()
    if (!reduced && origin && typeof frame.animate === "function") {
      frame.animate([{ transform: transformFrom(origin, frame) }, { transform: "none" }], { duration: 640, easing: EASE })
      dialog.animate([{ backgroundColor: "rgba(5, 5, 5, 0)" }, { backgroundColor: "rgba(5, 5, 5, .97)" }], { duration: 420, easing: "ease-out" })
    }
    return undefined
  }, [originOf, preview])

  useEffect(() => {
    lenis?.stop()
    return () => lenis?.start()
  }, [lenis])

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    const dialog = dialogRef.current
    const frame = frameRef.current
    const finish = () => {
      dialog?.close?.()
      onClosed()
    }
    videoRef.current?.pause?.()
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const origin = originOf()
    if (reduced || !origin || typeof frame?.animate !== "function") {
      finish()
      return
    }
    frame.animate([{ transform: "none" }, { transform: transformFrom(origin, frame) }], { duration: 420, easing: EASE, fill: "forwards" })
    dialog.animate([{ backgroundColor: "rgba(5, 5, 5, .97)" }, { backgroundColor: "rgba(5, 5, 5, 0)" }], { duration: 420, easing: "ease-in", fill: "forwards" })
      .finished.then(finish, finish)
  }, [originOf, onClosed])

  return (
    <dialog
      ref={dialogRef}
      className="fs-reel-player"
      aria-label={`${film.title} video`}
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      // The browser can close it without asking first, on a second Esc for one, and the page has to recover from that too.
      onClose={onClosed}
      onClick={(event) => {
        if (!event.target.closest(".fs-reel-frame, .fs-reel-player-copy, .fs-reel-close")) close()
      }}
    >
      <button className="fs-reel-close" type="button" onClick={close}>Close</button>
      <div className="fs-reel-player-body">
        <div
          ref={frameRef}
          className="fs-reel-frame"
          style={{ "--fs-reel-ratio": film.aspectRatio, "--fs-reel-ratio-value": ratioOf(film.aspectRatio), backgroundImage: `url(${film.poster})` }}
          data-started={started || undefined}
        >
          {failed ? (
            <div className="fs-motion-error" role="status">
              <img src={film.poster} alt="" decoding="async" />
              <div>
                <p>This browser could not play the original master.</p>
                <a className="fs-source-link" href={film.fallbackUrl} target="_blank" rel="noreferrer">
                  <span>View event archive</span>
                  <ArrowUpRightIcon />
                </a>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                src={film.src}
                controls
                playsInline
                preload="auto"
                onLoadedMetadata={(event) => {
                  // Carry on from where the tile was, unless that's so close to the end there's nothing left to watch.
                  const video = event.currentTarget
                  const from = preview?.currentTime ?? 0
                  if (from > 0 && from < video.duration - 5) video.currentTime = from
                }}
                onPlaying={() => setStarted(true)}
                onError={() => setFailed(true)}
              />
              <canvas ref={stillRef} className="fs-reel-frame-still" aria-hidden="true" />
            </>
          )}
        </div>
        <div className="fs-motion-copy fs-reel-player-copy">
          <span className="fs-motion-number">{film.number}</span>
          <div>
            <h3>{film.title}</h3>
            <p>{film.venue}</p>
            <span>{film.description}</span>
          </div>
        </div>
      </div>
    </dialog>
  )
}

/**
 * The films running round a curved row, all playing silently, with any of them opening into a full player with sound.
 * The markup is a row of poster buttons. Where the live row runs (`scenes/reel`), they go invisible and stay as its
 * keyboard route: focusing one brings its film to the centre.
 */
export function FilmReel({ films, label }) {
  const stageRef = useRef(null)
  const sceneRef = useRef(null)
  const videosRef = useRef([])
  const buttonsRef = useRef([])
  const openFilmRef = useRef(null)
  const [mode, setMode] = useState("still")
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(null) // { index, preview }

  const openFilm = useCallback((index) => {
    const scene = sceneRef.current
    scene?.setPaused(true)
    setOpen({ index, preview: scene ? videosRef.current[index] : null })
  }, [])

  useEffect(() => {
    openFilmRef.current = openFilm
  }, [openFilm])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !canRunLive()) return undefined
    const controller = new AbortController()
    const { signal } = controller
    const backToStill = () => {
      sceneRef.current = null
      if (!signal.aborted) setMode("still")
    }

    // Three.js and the videos wait until the row is nearly on screen.
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      import("../scenes/reel/scene.js")
        .then(({ createReelScene }) => {
          if (signal.aborted) return
          sceneRef.current = createReelScene(stage, {
            films: films.map((film) => ({ aspect: ratioOf(film.aspectRatio), poster: film.poster })),
            videos: videosRef.current,
            signal,
            onStart: () => setMode("live"),
            onFail: backToStill,
            onActive: setActive,
            onOpen: (index) => openFilmRef.current?.(index),
          })
        })
        .catch((error) => {
          console.warn("[film reel] live row unavailable, showing the posters", error)
          backToStill()
        })
    }, { rootMargin: "60% 0px" })
    observer.observe(stage)

    return () => {
      observer.disconnect()
      controller.abort()
      sceneRef.current = null
    }
  }, [films])

  const openIndex = open?.index ?? -1
  const originOf = useCallback(() => {
    if (openIndex < 0) return null
    return sceneRef.current?.rectOf(openIndex) ?? buttonsRef.current[openIndex]?.getBoundingClientRect() ?? null
  }, [openIndex])

  const onClosed = useCallback(() => {
    setOpen(null)
    sceneRef.current?.setPaused(false)
  }, [])

  const film = films[active]

  return (
    <div className="fs-reel" data-mode={mode}>
      <div ref={stageRef} className="fs-reel-stage">
        <div className="fs-reel-row" role="group" aria-label={label}>
          {films.map((item, index) => (
            <button
              key={item.number}
              ref={(node) => { buttonsRef.current[index] = node }}
              className="fs-reel-tile"
              type="button"
              style={{ "--fs-reel-ratio": item.aspectRatio, "--fs-reel-ratio-value": ratioOf(item.aspectRatio) }}
              aria-label={`Watch ${item.title}, ${item.venue}. ${item.description}`}
              onClick={() => openFilm(index)}
              onPointerEnter={() => setActive(index)}
              onFocus={() => {
                setActive(index)
                sceneRef.current?.pin(index)
              }}
              onBlur={() => sceneRef.current?.pin(-1)}
            >
              <img src={item.poster} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
        <div className="fs-reel-sources" aria-hidden="true">
          {films.map((item, index) => (
            <video
              key={item.number}
              ref={(node) => { videosRef.current[index] = node }}
              src={item.reel}
              muted
              loop
              playsInline
              preload="none"
              tabIndex={-1}
            />
          ))}
        </div>
      </div>
      <div className="fs-reel-caption">
        <div className="fs-reel-caption-film" aria-hidden="true">
          <span className="fs-motion-number">{film.number}</span>
          <div>
            <h3>{film.title}</h3>
            <p>{film.venue} / {film.description}</p>
          </div>
        </div>
        <p className="fs-reel-hint">Select a film to watch it with sound</p>
      </div>
      {open ? (
        <FilmPlayer
          film={films[open.index]}
          preview={open.preview}
          originOf={originOf}
          onClosed={onClosed}
        />
      ) : null}
    </div>
  )
}
