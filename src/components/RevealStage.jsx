import { useEffect, useRef, useState } from "react"

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" />
    </svg>
  )
}

/**
 * A black stage in a browser frame that plays one of the wordmark reveals, as on the brand sheet.
 * Black is for anything that moves. The finished frame is a still image underneath, so the stage reads
 * correctly before the video loads, without JavaScript, and with reduced motion (the video never plays).
 * `trigger` is "view" (play once when scrolled into view) or "hover" (also replay on hover and focus).
 */
export function RevealStage({ discipline, trigger = "view", priority = false, className = "", chrome = true }) {
  const videoRef = useRef(null)
  const stageRef = useRef(null)
  const [state, setState] = useState("idle")
  const src = discipline.video

  useEffect(() => {
    const video = videoRef.current
    const stage = stageRef.current
    if (!video || !stage) return undefined
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined

    const play = () => {
      video.currentTime = 0
      const attempt = video.play()
      if (attempt?.catch) attempt.catch(() => setState("blocked"))
    }
    const onPlaying = () => setState("playing")
    const onEnded = () => setState("ended")
    video.addEventListener("playing", onPlaying)
    video.addEventListener("ended", onEnded)

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      play()
    }, { threshold: .45 })
    observer.observe(stage)

    const onEnter = () => { if (video.paused) play() }
    if (trigger === "hover") {
      stage.addEventListener("pointerenter", onEnter)
      stage.closest("a")?.addEventListener("focus", onEnter)
    }
    stage.replay = play

    return () => {
      observer.disconnect()
      video.removeEventListener("playing", onPlaying)
      video.removeEventListener("ended", onEnded)
      stage.removeEventListener("pointerenter", onEnter)
      stage.closest("a")?.removeEventListener("focus", onEnter)
    }
  }, [trigger, src])

  function replay(event) {
    event.preventDefault()
    event.stopPropagation()
    stageRef.current?.replay?.()
  }

  return (
    <figure ref={stageRef} className={`stage ${chrome ? "stage--chrome" : ""} ${className}`.trim()} data-state={state}>
      {chrome && (
        <figcaption className="stage-bar">
          <span className="stage-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="stage-url">matiadosen.com<b>{discipline.path}</b></span>
          {trigger !== "hover" && (
            <button className="stage-replay" type="button" onClick={replay} aria-label={`Replay the ${discipline.reveal} reveal`}>
              <ReplayIcon />
            </button>
          )}
        </figcaption>
      )}
      <div className="stage-screen">
        <img className="stage-still" src={`${src}-still.jpg`} alt="" width="1600" height="900" loading={priority ? "eager" : "lazy"} decoding="async" />
        <video
          ref={videoRef}
          className="stage-video"
          muted
          playsInline
          preload={priority ? "auto" : "metadata"}
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src={`${src}.mp4`} type="video/mp4" />
        </video>
        <span className="sr-only">{`The matia dosen wordmark, ${discipline.reveal.toLowerCase()} reveal: ${discipline.revealNote}`}</span>
      </div>
    </figure>
  )
}
