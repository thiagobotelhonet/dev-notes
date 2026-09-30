import { describe, expect, it } from "vitest"
import { snippetOf } from "./snippet"

describe("snippetOf", () => {
  it("a linha da ocorrência, sem espaços nas pontas, com a ocorrência separada", () => {
    const text = "# T\n   Deploy: [[deploy]] feito   \nfim"
    const start = text.indexOf("[[deploy]]")
    expect(snippetOf(text, start, start + 10)).toEqual({
      before: "Deploy: ",
      match: "[[deploy]]",
      after: " feito",
    })
  })

  it("sem BOM nem CR no trecho", () => {
    const text = "﻿o deploy falhou\r\nfim"
    const start = text.indexOf("deploy")
    expect(snippetOf(text, start, start + 6)).toEqual({
      before: "o ",
      match: "deploy",
      after: " falhou",
    })
  })

  it("linha longa é cortada em volta da ocorrência com reticências", () => {
    const text = `${"a".repeat(200)} [[deploy]] ${"b".repeat(200)}`
    const start = text.indexOf("[[deploy]]")
    const snippet = snippetOf(text, start, start + 10)
    expect(snippet.match).toBe("[[deploy]]")
    expect(snippet.before.startsWith("…")).toBe(true)
    expect(snippet.after.endsWith("…")).toBe(true)
    expect(
      snippet.before.length + snippet.match.length + snippet.after.length
    ).toBeLessThanOrEqual(122)
  })
})
