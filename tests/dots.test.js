import { describe, expect, it } from "vitest"
import { BAND_GLOW, CELL, DOT, EDGE, GRID_PARALLAX, REACH, WAVE, WAVE_TIMING, dotSize, drawDots, drawWave, revealRadius, waveDotSize, waveFront, waveHoleSize, waveOrigin } from "../src/transitions/dots"

const colors = { stage: "#0c0c0f", accent: "#386dff", neon: "92 136 255" }

function fakeContext() {
  const calls = []
  const fills = [] // what each fill painted with, and how
  const gradients = []
  const createRadialGradient = (...radii) => {
    const gradient = { radii, stops: [], addColorStop: (at, color) => gradient.stops.push([at, color]) }
    gradients.push(gradient)
    return gradient
  }
  const ctx = new Proxy({ globalCompositeOperation: "source-over", createRadialGradient }, {
    get(target, key) {
      if (key in target) return target[key]
      return (...args) => {
        if (key === "fill") fills.push({ style: ctx.fillStyle, mode: ctx.globalCompositeOperation })
        calls.push([key, ...args, ctx.fillStyle])
      }
    },
    set(target, key, value) {
      target[key] = value
      return true
    },
  })
  return { ctx, calls, fills, gradients }
}

describe("dot grid cut", () => {
  it("closes the grid completely at full size", () => {
    // Four dots meet at the middle of each cell, half a diagonal away.
    expect(REACH).toBeGreaterThan(Math.hypot(DOT, DOT) / 2)
  })

  it("keeps a dot on every backdrop dot, whatever the scroll", () => {
    for (const scrollY of [0, 40, 777]) {
      const { ctx, calls } = fakeContext()
      drawDots(ctx, { width: 300, height: 200, dpr: 1, cover: 0, phase: "showing", scrollY, colors })
      const centres = calls.filter(([name]) => name === "arc").map(([, x, y]) => `${x},${y}`)
      const y = CELL / 2 - ((scrollY * GRID_PARALLAX) % CELL) + CELL
      expect(centres).toContain(`${CELL / 2 + CELL},${y}`)
    }
  })

  it("leaves no part of the screen out of the grid, whatever the scroll", () => {
    const width = 301
    const height = 203
    for (const scrollY of [0, 13, 40, 777]) {
      const { ctx, calls } = fakeContext()
      drawDots(ctx, { width, height, dpr: 1, cover: 0, phase: "showing", scrollY, colors })
      const discs = calls.filter(([name]) => name === "arc")
      for (let x = -1; x <= width + 1; x += 7) {
        for (let y = -1; y <= height + 1; y += 7) {
          expect(discs.some(([, cx, cy, radius]) => Math.hypot(x - cx, y - cy) <= radius)).toBe(true)
        }
      }
    }
  })

  it("starts the pulse at the click, or the middle of the screen without one", () => {
    expect(waveOrigin(1000, 600, { x: 100, y: 50 })).toMatchObject({ x: 100, y: 50 })
    expect(waveOrigin(1000, 600, null)).toMatchObject({ x: 500, y: 300, reach: Math.hypot(500, 300) })
    expect(waveOrigin(1000, 600, { x: 0, y: 0 }).reach).toBeCloseTo(Math.hypot(1000, 600))
  })

  it("grows dots near the origin first and closes everything at full cover", () => {
    expect(dotSize(0, "hiding", 0)).toBe(0)
    expect(dotSize(.4, "hiding", 0)).toBeGreaterThan(dotSize(.4, "hiding", .5))
    expect(dotSize(.4, "hiding", 1)).toBe(0)
    expect(dotSize(1, "hiding", 1)).toBe(1)
  })

  it("opens the black near the origin first when showing", () => {
    expect(dotSize(1, "showing", 0)).toBe(1)
    expect(dotSize(.6, "showing", 0)).toBeLessThan(dotSize(.6, "showing", .8))
    expect(dotSize(0, "showing", 1)).toBe(0)
  })

  it("is a band, not a blackout: near the click the page is back while the far side is still covered", () => {
    expect(dotSize(.4, "showing", 0)).toBe(0)
    expect(dotSize(.4, "showing", 1)).toBe(1)
    // Partway through hiding, the click has closed and the far corner has not been reached.
    expect(dotSize(.5, "hiding", 0)).toBe(1)
    expect(dotSize(.5, "hiding", 1)).toBe(0)
  })

  it("reports how far the hiding wave has travelled", () => {
    const wave = { x: 0, y: 0, reach: 1000 }
    expect(waveFront(0, wave)).toBe(0)
    expect(waveFront(.5, wave)).toBeGreaterThan(0)
    expect(waveFront(1, wave)).toBe(1000)
  })

  it("fills the screen at full cover and leads the wave with blue dots", () => {
    const full = fakeContext()
    drawDots(full.ctx, { width: 300, height: 200, dpr: 1, cover: 1, phase: "hiding", colors })
    expect(full.calls.find(([name]) => name === "fillRect")).toEqual(["fillRect", -1, -1, 302, 202, colors.stage])

    const mid = fakeContext()
    drawDots(mid.ctx, { width: 300, height: 200, dpr: 1, cover: .45, phase: "hiding", origin: { x: 0, y: 0 }, colors })
    const fills = mid.calls.filter(([name]) => name === "fill").map((call) => call.at(-1))
    expect(fills).toEqual([colors.stage, colors.accent])
    const arcs = mid.calls.filter(([name]) => name === "arc")
    expect(arcs.length).toBeGreaterThan(0)
    expect(arcs.every(([, , , radius]) => radius > 0 && radius <= REACH)).toBe(true)
    expect(arcs.some(([, , , radius]) => radius < EDGE * REACH)).toBe(true)
  })

  it("opens the trailing edge as holes onto the new page, each starting as a blue dot", () => {
    const { ctx, calls, fills } = fakeContext()
    drawDots(ctx, { width: 600, height: 400, dpr: 1, cover: .4, phase: "showing", origin: { x: 0, y: 0 }, colors })
    expect(calls.find(([name]) => name === "fillRect")).toEqual(["fillRect", -1, -1, 602, 402, colors.stage])
    expect(fills.map(({ mode }) => mode)).toEqual(["source-over", "destination-out"])
    expect(fills[0].style).toBe(colors.accent)
    expect(ctx.globalCompositeOperation).toBe("source-over")
    const radii = calls.filter(([name]) => name === "arc").map(([, , , radius]) => radius)
    expect(radii.some((radius) => radius === REACH)).toBe(true) // wide open near the click
    expect(radii.some((radius) => radius < EDGE * REACH)).toBe(true) // just starting at the edge
  })

  it("sets the trailing edge off from the click as soon as the content has swapped", () => {
    expect(dotSize(1, "showing", 0)).toBe(1)
    expect(dotSize(.98, "showing", 0)).toBeLessThan(1)
  })

  describe("as one wave", () => {
    const at = (time) => 1 - time / WAVE_TIMING.show

    it("runs ahead on the old page while the new one is already open behind it", () => {
      const time = WAVE.travel / 2 + WAVE.grow
      expect(waveHoleSize(time, 0)).toBe(1)
      expect(waveDotSize(time, 1)).toBe(0)
      expect(waveDotSize(WAVE_TIMING.show, 1)).toBe(1)
      expect(waveHoleSize(WAVE_TIMING.show, 1)).toBe(1)
    })

    it("hides the line between the two pages in solid black, on any screen and wherever the click was", () => {
      const screens = [[320, 568, null], [390, 844, { x: 195, y: 30 }], [1440, 900, { x: 0, y: 0 }], [2560, 1440, null]]
      for (const [width, height, origin] of screens) {
        const wave = waveOrigin(width, height, origin)
        for (let time = 0; time <= WAVE_TIMING.show; time += .01) {
          const radius = revealRadius(at(time), wave)
          if (radius <= 0 || radius > wave.reach) continue
          // Whichever dot is nearest a point on the line, up to half a cell's diagonal away, must be solid.
          const nearest = Math.hypot(DOT, DOT) / 2
          for (const distance of [radius - nearest, radius, radius + nearest]) {
            const n = distance / wave.reach
            expect(waveDotSize(time, n)).toBe(1)
            expect(waveHoleSize(time, n)).toBe(0)
          }
        }
      }
    })

    it("has revealed the whole screen by the end", () => {
      const wave = waveOrigin(1440, 900, { x: 0, y: 0 })
      expect(revealRadius(0, wave)).toBeGreaterThanOrEqual(wave.reach)
      expect(revealRadius(1, wave)).toBe(0)
    })

    it("draws only the band: black, the light on it, blue ahead, holes punched behind, in a clean state", () => {
      const { ctx, calls, fills } = fakeContext()
      drawWave(ctx, { width: 1000, height: 600, dpr: 1, cover: at(.3), origin: { x: 0, y: 0 }, colors })
      const paints = fills.map(({ style, mode }) => [typeof style === "string" ? style : "light", mode])
      expect(paints).toEqual([
        [colors.stage, "source-over"],
        ["light", "source-atop"],
        [colors.accent, "source-over"],
        [colors.accent, "source-over"],
        [colors.accent, "destination-out"],
      ])
      expect(ctx.globalCompositeOperation).toBe("source-over")
      expect(ctx.shadowBlur).toBe(0)
      const everyDot = (Math.ceil(1000 / DOT) + 3) * (Math.ceil(600 / DOT) + 4)
      const big = calls.filter(([name, , , radius]) => name === "arc" && radius !== BAND_GLOW.dot)
      expect(big.length).toBeLessThan(everyDot)
    })

    it("lights the band like a backdrop tool: only on the black, only the backdrop's own tiny dots, dark at its edges", () => {
      const { ctx, calls, gradients } = fakeContext()
      const time = .3
      drawWave(ctx, { width: 1000, height: 600, dpr: 2, cover: at(time), origin: { x: 0, y: 0 }, colors })

      // The wash is faint and the dots are full neon at the band's middle; both fade to nothing at its edges.
      const [wash, dots] = gradients
      for (const { stops } of [wash, dots]) {
        expect(stops[0][1]).toBe(`rgb(${colors.neon} / 0)`)
        expect(stops.at(-1)[1]).toBe(`rgb(${colors.neon} / 0)`)
      }
      expect(wash.stops[1][1]).toBe(`rgb(${colors.neon} / ${BAND_GLOW.wash})`)
      expect(dots.stops[1][1]).toBe(`rgb(${colors.neon} / 1)`)

      const tiny = calls.filter(([name, , , radius]) => name === "arc" && radius === BAND_GLOW.dot)
      expect(tiny.length).toBeGreaterThan(0)
      for (const [, x, y] of tiny) {
        expect((x - CELL / 2) % CELL).toBe(0)
        expect(((y - CELL / 2) % CELL + CELL) % CELL).toBe(0)
      }
    })

    it("has no light before the band has any width", () => {
      const { ctx, gradients } = fakeContext()
      drawWave(ctx, { width: 300, height: 200, dpr: 1, cover: 1, colors })
      expect(gradients).toEqual([])
    })

    it("leaves nothing on screen at the end", () => {
      const { ctx, calls } = fakeContext()
      drawWave(ctx, { width: 300, height: 200, dpr: 1, cover: 0, colors })
      expect(calls.filter(([name]) => name === "arc")).toEqual([])
    })
  })
})
