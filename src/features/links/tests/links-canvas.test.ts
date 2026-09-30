import { describe, expect, it } from "vitest"
import { rewriteCanvasFileRefs } from "../model/links.canvas"

const canvas = {
  nodes: [
    {
      id: "t1",
      type: "text",
      text: "nota solta",
      x: -50,
      y: 0,
      width: 10,
      height: 10,
    },
    {
      id: "n1",
      type: "file",
      file: "deploy.md",
      subpath: "#Passos",
      x: 0,
      y: 0,
      width: 400,
      height: 400,
      color: "4",
      extra: { mine: true },
    },
    {
      id: "n2",
      type: "file",
      file: "infra.md",
      x: 10,
      y: 10,
      width: 1,
      height: 1,
    },
  ],
  edges: [{ id: "e1", fromNode: "n1", toNode: "n2" }],
  version: "custom",
}
const renames = new Map([["deploy.md", "release.md"]])

describe("rewriteCanvasFileRefs", () => {
  it("troca só o campo file e preserva todo o resto, na mesma ordem", () => {
    const result = rewriteCanvasFileRefs(
      JSON.stringify(canvas, null, "\t"),
      renames
    )
    if ("error" in result) throw new Error(result.error)
    expect(result.changed).toBe(true)
    const expected = structuredClone(canvas)
    expected.nodes[1].file = "release.md"
    expect(JSON.parse(result.json)).toEqual(expected)
    expect(Object.keys(JSON.parse(result.json).nodes[1])).toEqual(
      Object.keys(canvas.nodes[1])
    )
    expect(result.json).toBe(JSON.stringify(expected, null, "\t"))
  })

  it("mantém arquivo compacto compacto e o indentado com a mesma indentação", () => {
    const compact = rewriteCanvasFileRefs(JSON.stringify(canvas), renames)
    expect("json" in compact && compact.json.includes("\n")).toBe(false)
    const spaced = rewriteCanvasFileRefs(
      `${JSON.stringify(canvas, null, 2)}\n`,
      renames
    )
    expect("json" in spaced && spaced.json).toBe(
      `${JSON.stringify({ ...canvas, nodes: [canvas.nodes[0], { ...canvas.nodes[1], file: "release.md" }, canvas.nodes[2]] }, null, 2)}\n`
    )
  })

  it("sem cartão da nota, não muda nada", () => {
    const json = JSON.stringify(canvas)
    expect(
      rewriteCanvasFileRefs(json, new Map([["outra.md", "x.md"]]))
    ).toEqual({
      changed: false,
      json,
    })
  })

  it("JSON inválido não é reescrito e volta como falha", () => {
    expect(rewriteCanvasFileRefs("{ quebrado", renames)).toEqual({
      error: "invalid-json",
    })
    expect(rewriteCanvasFileRefs('{"nodes": "x"}', renames)).toEqual({
      error: "not-a-canvas",
    })
  })
})
