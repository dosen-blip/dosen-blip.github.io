import { afterEach, describe, expect, it } from "vitest"
import { noteClick, takeOrigin } from "../src/transitions/origin"

function place(element, left, top, width, height) {
  element.getBoundingClientRect = () => ({ left, top, width, height })
}

afterEach(() => {
  takeOrigin()
  document.body.innerHTML = ""
})

describe("click origin", () => {
  it("frames the media of a clicked project card", () => {
    document.body.innerHTML = `<a class="project-card" href="/projects/x"><div class="project-card-frame"><img></div><h3>X</h3></a>`
    place(document.querySelector(".project-card-frame"), 10, 20, 300, 200)
    noteClick({ target: document.querySelector("h3"), clientX: 50, clientY: 260, detail: 1 }, 100)
    expect(takeOrigin(150)).toEqual({ x: 50, y: 260, rect: { x: 10, y: 20, width: 300, height: 200 } })
  })

  it("keeps only the point for an ordinary link, and the middle of it from the keyboard", () => {
    document.body.innerHTML = `<nav><a href="/about"><span>About</span></a></nav>`
    place(document.querySelector("a"), 100, 10, 60, 20)
    noteClick({ target: document.querySelector("span"), clientX: 0, clientY: 0, detail: 0 }, 100)
    expect(takeOrigin(120)).toEqual({ x: 130, y: 20, rect: null })
  })

  it("forgets a click once used, or once it is stale", () => {
    document.body.innerHTML = `<a href="/about">About</a>`
    place(document.querySelector("a"), 0, 0, 10, 10)
    noteClick({ target: document.querySelector("a"), clientX: 5, clientY: 5, detail: 1 }, 100)
    expect(takeOrigin(110)).not.toBeNull()
    expect(takeOrigin(120)).toBeNull()

    noteClick({ target: document.querySelector("a"), clientX: 5, clientY: 5, detail: 1 }, 100)
    expect(takeOrigin(5000)).toBeNull()
  })
})
