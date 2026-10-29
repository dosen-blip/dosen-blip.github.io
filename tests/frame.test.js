import { describe, expect, it } from "vitest"
import { centreRect, clipRect, findTarget, lerpRect, selectionFrame } from "../src/transitions/frame"

const card = { x: 100, y: 200, width: 300, height: 200 }
const title = { x: 40, y: 120, width: 500, height: 80 }

describe("selection box cut", () => {
  it("interpolates and clips rectangles", () => {
    expect(lerpRect(card, { x: 0, y: 0, width: 1000, height: 600 }, .5)).toEqual({ x: 50, y: 100, width: 650, height: 400 })
    expect(clipRect({ x: -50, y: 500, width: 200, height: 300 }, 1000, 600)).toEqual({ x: 0, y: 500, width: 150, height: 100 })
    expect(clipRect({ x: 0, y: 700, width: 100, height: 100 }, 1000, 600)).toBeNull()
    expect(centreRect(1000, 600)).toEqual({ x: 250, y: 159.375, width: 500, height: 281.25 })
  })

  it("grows from the clicked card to the whole screen, filling with black", () => {
    const at = (cover) => selectionFrame("hiding", cover, { from: card, target: title, width: 1000, height: 600 })
    expect(at(0)).toMatchObject({ rect: card, fill: 0, chrome: 0 })
    expect(at(.5).rect.width).toBeGreaterThan(card.width)
    expect(at(1)).toMatchObject({ rect: { x: 0, y: 0, width: 1000, height: 600 }, fill: 1, chrome: 1 })
  })

  it("shrinks onto the new page's hero, clears the black, then lets go", () => {
    const at = (cover) => selectionFrame("showing", cover, { from: card, target: title, width: 1000, height: 600 })
    expect(at(1)).toMatchObject({ rect: { x: 0, y: 0, width: 1000, height: 600 }, fill: 1, chrome: 1 })
    expect(at(.5).fill).toBe(0)
    expect(at(.2).rect).toEqual(title)
    expect(at(.2).chrome).toBe(1)
    expect(at(0).chrome).toBe(0)
  })

  it("lands on the first hero it finds on screen", () => {
    document.body.innerHTML = `<main><article><header class="detail-head"><h1 class="page-title">Title</h1></header></article></main>`
    const heading = document.querySelector("h1")
    heading.getBoundingClientRect = () => ({ left: 40, top: 120, width: 500, height: 80 })
    expect(findTarget(document, 1000, 600)).toEqual(title)

    heading.getBoundingClientRect = () => ({ left: 40, top: 900, width: 500, height: 80 })
    expect(findTarget(document, 1000, 600)).toEqual(centreRect(1000, 600))
    document.body.innerHTML = ""
  })
})
