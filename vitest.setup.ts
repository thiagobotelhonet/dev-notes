import "@testing-library/jest-dom/vitest"
import { configure } from "@testing-library/react"
import { createElement, type ReactNode } from "react"
import { vi } from "vitest"

configure({ asyncUtilTimeout: 3000 })

window.scrollTo = () => {}

window.matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})

/* jsdom has no layout: panels, popups and the editor only need these to exist. */
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Element.prototype.scrollIntoView ??= () => {}
/* CodeMirror measures text ranges to scroll the cursor into view. */
const emptyRect = new DOMRect()
Range.prototype.getClientRects ??= () =>
  Object.assign([] as DOMRect[], { item: () => null }) as unknown as DOMRectList
Range.prototype.getBoundingClientRect ??= () => emptyRect

/* No layout in jsdom: the resize handle would swallow every click at (0, 0). */
vi.mock("react-resizable-panels", () => {
  const box =
    (slot: string) =>
    ({ children, className }: { children?: ReactNode; className?: string }) =>
      createElement("div", { "data-slot": slot, className }, children)
  return {
    Group: box("resizable-panel-group"),
    Panel: box("resizable-panel"),
    Separator: box("resizable-handle"),
  }
})
