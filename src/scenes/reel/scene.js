import * as THREE from "three"
import { CAMERA, MAX_ANGLE, hitTile, layoutReel, tileBox, wrapPosition } from "./geometry"

// Row speed, in tile heights per second, so a phone and a desktop move at the same pace.
const SPEED = 0.26
const POSTER_WAIT = 2500 // ms

const VERTEX = /* glsl */ `
  uniform float uPosition;
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uMaxAngle;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    float angle = clamp((uPosition + (uv.x - .5) * uSize.x) / uRadius, -uMaxAngle, uMaxAngle);
    vec3 point = vec3(uRadius * sin(angle), (uv.y - .5) * uSize.y, uRadius * (1. - cos(angle)));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.);
  }
`

// The page's motion cards as a shader: a 1px pink edge that heats up, with a little light spilling in, under the cursor.
const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uSize;
  uniform float uLift;
  uniform float uShown;
  varying vec2 vUv;

  void main() {
    vec2 fromEdge = (.5 - abs(vUv - .5)) * uSize;
    float edge = min(fromEdge.x, fromEdge.y);
    vec3 pink = vec3(1., .086, .561);
    vec3 color = texture2D(uMap, vUv).rgb;
    color += pink * exp(-edge / 22.) * .34 * uLift;
    float rim = 1. - smoothstep(1., 1.75, edge);
    color = mix(color, mix(vec3(.957, .369, .722), pink, uLift), rim * (.36 + .56 * uLift));
    gl_FragColor = vec4(color, uShown);
  }
`

/**
 * Draws the films on the curved row, each video decoded once however many tiles show it. Reports the film that has the
 * viewer's attention through `onActive` and a click on a film through `onOpen`. Returns controls for the React side.
 */
export function createReelScene(host, { films, videos, signal, onStart, onFail, onActive, onOpen }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
  renderer.setClearColor(0x000000, 0)
  const canvas = renderer.domElement
  canvas.className = "fs-reel-canvas"
  host.append(canvas)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera()
  const geometry = new THREE.PlaneGeometry(1, 1, 72, 1)

  const loader = new THREE.TextureLoader()
  let postersLeft = films.length
  const posterDone = () => {
    postersLeft -= 1
    if (postersLeft === 0) begin()
  }
  const sources = films.map((film) => ({
    poster: loader.load(film.poster, posterDone, undefined, posterDone),
    live: null,
  }))
  for (const { poster } of sources) poster.generateMipmaps = false
  const posterTimer = window.setTimeout(() => begin(), POSTER_WAIT)

  let layout = null
  let meshes = []
  let positions = []
  let offset = 0
  let rate = 0
  let hovered = -1 // tile
  let pinned = -1 // film, while its hidden button holds keyboard focus
  let active = -1
  let pointer = null
  let frameId = 0
  let last = 0
  let began = false
  let inView = true
  let paused = false
  let dead = false
  const playing = films.map(() => false)

  const clearTiles = () => {
    for (const mesh of meshes) {
      scene.remove(mesh)
      mesh.material.dispose()
    }
    meshes = []
  }

  const measure = () => {
    const { width, height } = host.getBoundingClientRect()
    if (!(width > 0) || !(height > 0)) return
    const previous = layout
    layout = layoutReel(width, height, films.map((film) => film.aspect))
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height, false)

    const distance = CAMERA * layout.radius
    camera.position.set(0, 0, distance)
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / 2 / distance))
    camera.aspect = width / height
    camera.near = layout.radius * 0.02
    camera.far = distance * 4
    camera.updateProjectionMatrix()

    if (previous?.tiles.length !== layout.tiles.length) {
      clearTiles()
      meshes = layout.tiles.map((tile) => {
        const material = new THREE.ShaderMaterial({
          vertexShader: VERTEX,
          fragmentShader: FRAGMENT,
          transparent: true,
          depthTest: false,
          side: THREE.DoubleSide,
          uniforms: {
            uMap: { value: sources[tile.film].live ?? sources[tile.film].poster },
            uPosition: { value: 0 },
            uSize: { value: new THREE.Vector2() },
            uRadius: { value: 1 },
            uMaxAngle: { value: MAX_ANGLE },
            uLift: { value: 0 },
            uShown: { value: 1 },
          },
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.frustumCulled = false
        scene.add(mesh)
        return mesh
      })
    }
    layout.tiles.forEach((tile, index) => {
      const { uniforms } = meshes[index].material
      uniforms.uSize.value.set(tile.width, layout.tileHeight)
      uniforms.uRadius.value = layout.radius
    })
    positions = layout.tiles.map((tile) => wrapPosition(tile.s, offset, layout.loop))
    if (began && !frameId) renderer.render(scene, camera)
  }

  const swapInVideo = (film) => {
    const video = videos[film]
    if (sources[film].live || !video || video.readyState < 2) return
    const texture = new THREE.VideoTexture(video)
    texture.generateMipmaps = false
    sources[film].live = texture
    meshes.forEach((mesh, index) => {
      if (layout.tiles[index].film === film) mesh.material.uniforms.uMap.value = texture
    })
  }

  const setPlaying = (film, wanted) => {
    swapInVideo(film)
    if (playing[film] === wanted) return
    const video = videos[film]
    if (!video) return
    playing[film] = wanted
    if (wanted) {
      video.muted = true
      // Blocked autoplay (iOS Low Power Mode) leaves the poster on the tile.
      video.play().catch(() => { playing[film] = false })
    } else {
      video.pause()
    }
  }

  const stopVideos = () => films.forEach((_, film) => setPlaying(film, false))

  const nearestTile = (film) => {
    let best = -1
    positions.forEach((position, index) => {
      if (layout.tiles[index].film !== film) return
      if (best < 0 || Math.abs(position) < Math.abs(positions[best])) best = index
    })
    return best
  }

  const step = (dt) => {
    const easing = (speed) => 1 - Math.exp(-dt * speed)
    if (pinned >= 0) {
      // Bring the focused film to the centre: the row stops for it.
      offset += positions[nearestTile(pinned)] * easing(5)
      rate = 0
    } else {
      const target = hovered >= 0 ? 0 : SPEED * layout.tileHeight
      rate += (target - rate) * easing(hovered >= 0 ? 9 : 2.5)
      offset += rate * dt
    }
    offset %= layout.loop

    const wanted = films.map(() => false)
    let nearest = 0
    layout.tiles.forEach((tile, index) => {
      positions[index] = wrapPosition(tile.s, offset, layout.loop)
      if (Math.abs(positions[index]) < Math.abs(positions[nearest])) nearest = index
    })
    if (pointer) {
      hovered = hitTile(layout, positions, pointer.x - layout.width / 2, layout.height / 2 - pointer.y)
      // The dark-mode LED cursor replaces the system's, so don't bring the system's back on top of it.
      const ledCursor = document.documentElement.classList.contains("has-neon-cursor")
      canvas.style.cursor = hovered >= 0 && !ledCursor ? "pointer" : ""
    }
    layout.tiles.forEach((tile, index) => {
      const { uniforms } = meshes[index].material
      const position = positions[index]
      const outside = Math.abs(position) - tile.width / 2 - layout.reach
      uniforms.uPosition.value = position
      // A tile wraps only once it's past the frame, but never draw it on its way round behind the camera.
      meshes[index].visible = outside < 0
      if (outside < layout.tileHeight) wanted[tile.film] = true
      const lit = index === hovered || tile.film === pinned
      uniforms.uLift.value += ((lit ? 1 : 0) - uniforms.uLift.value) * easing(lit ? 12 : 6)
    })
    films.forEach((_, film) => setPlaying(film, wanted[film]))

    const focus = hovered >= 0 ? layout.tiles[hovered].film : pinned >= 0 ? pinned : layout.tiles[nearest].film
    if (focus !== active) {
      active = focus
      onActive?.(focus)
    }
  }

  const frame = (now) => {
    frameId = window.requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    step(dt)
    renderer.render(scene, camera)
  }

  const shouldRun = () => began && inView && !paused && !dead && document.visibilityState !== "hidden"

  const sync = () => {
    if (shouldRun()) {
      if (frameId) return
      last = performance.now()
      frameId = window.requestAnimationFrame(frame)
    } else {
      if (frameId) window.cancelAnimationFrame(frameId)
      frameId = 0
      stopVideos()
    }
  }

  function begin() {
    if (began || dead) return
    window.clearTimeout(posterTimer)
    began = true
    measure()
    if (!layout) {
      fail()
      return
    }
    step(0)
    renderer.render(scene, camera)
    onStart?.()
    sync()
  }

  const toLocal = (event) => {
    const box = canvas.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }
  const onPointerMove = (event) => {
    if (event.pointerType === "mouse") pointer = toLocal(event)
  }
  const onPointerLeave = () => {
    pointer = null
    hovered = -1
    canvas.style.cursor = ""
  }
  const onClick = (event) => {
    if (!layout) return
    const { x, y } = toLocal(event)
    const tile = hitTile(layout, positions, x - layout.width / 2, layout.height / 2 - y)
    if (tile >= 0) onOpen?.(layout.tiles[tile].film)
  }
  canvas.addEventListener("pointermove", onPointerMove)
  canvas.addEventListener("pointerleave", onPointerLeave)
  canvas.addEventListener("click", onClick)

  const resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(host)
  const viewObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    sync()
  })
  viewObserver.observe(host)
  document.addEventListener("visibilitychange", sync)

  function destroy() {
    if (dead) return
    dead = true
    window.clearTimeout(posterTimer)
    sync()
    resizeObserver.disconnect()
    viewObserver.disconnect()
    document.removeEventListener("visibilitychange", sync)
    canvas.removeEventListener("webglcontextlost", fail)
    clearTiles()
    geometry.dispose()
    for (const { poster, live } of sources) {
      poster.dispose()
      live?.dispose()
    }
    renderer.dispose()
    renderer.forceContextLoss()
    canvas.remove()
  }

  function fail() {
    destroy()
    onFail?.()
  }

  canvas.addEventListener("webglcontextlost", fail)
  signal?.addEventListener("abort", destroy)

  return {
    /** Stops the row and its videos while the expanded player is up. */
    setPaused(next) {
      paused = next
      sync()
    },
    /** Brings a film to the centre and holds it there, or lets go with -1. */
    pin(film) {
      pinned = film
    },
    /** A film's box on screen, for the expand animation: `{ left, top, width, height }`. */
    rectOf(film) {
      if (!layout) return null
      const index = nearestTile(film)
      if (index < 0) return null
      const box = tileBox(layout, positions[index], layout.tiles[index])
      const frameBox = canvas.getBoundingClientRect()
      return {
        left: frameBox.left + layout.width / 2 + box.x - box.width / 2,
        top: frameBox.top + layout.height / 2 - box.height / 2,
        width: box.width,
        height: box.height,
      }
    },
  }
}
