import { describe, expect, it } from "vitest"
import { parseLinks } from "../model/links.parser"

describe("parseLinks", () => {
  it("destino vazio não é link: [[]], [[#Seção]] e [[|texto]] (spec 002, Edge Cases)", () => {
    expect(parseLinks("infra.md", "[[]] [[#Seção]] [[|texto]] ![[]]")).toEqual(
      []
    )
  })

  it("lê destino, trecho, apelido, incorporação e posição", () => {
    const text =
      "[[api]] [[backend/api]] [[api#Seção]] [[api|texto]] [[api#^bloco|texto]] ![[api]]"
    const links = parseLinks("infra.md", text)
    expect(
      links.map(({ target, subpath, alias, embed }) => ({
        target,
        subpath,
        alias,
        embed,
      }))
    ).toEqual([
      { target: "api", subpath: "", alias: "", embed: false },
      { target: "backend/api", subpath: "", alias: "", embed: false },
      { target: "api", subpath: "#Seção", alias: "", embed: false },
      { target: "api", subpath: "", alias: "texto", embed: false },
      { target: "api", subpath: "#^bloco", alias: "texto", embed: false },
      { target: "api", subpath: "", alias: "", embed: true },
    ])
    for (const link of links) {
      expect(link.source).toBe("infra.md")
      expect(text.slice(link.range.start, link.range.end)).toMatch(
        /^!?\[\[.*\]\]$/
      )
    }
    expect(links[5].range.start).toBe(text.lastIndexOf("![[api]]"))
  })

  it("tira a extensão .md do destino", () => {
    expect(parseLinks("a.md", "[[api.md]]")[0].target).toBe("api")
  })

  it("ignora links dentro de cercas de código e de código inline", () => {
    const text = [
      "[[fora]]",
      "```ts",
      "const a = '[[dentro-da-cerca]]'",
      "```",
      "use `[[inline]]` aqui",
      "~~~",
      "[[til]]",
      "~~~",
      "[[depois]]",
    ].join("\n")
    expect(parseLinks("a.md", text).map((link) => link.target)).toEqual([
      "fora",
      "depois",
    ])
  })

  it("não conta destino vazio nem link quebrado em duas linhas", () => {
    expect(parseLinks("a.md", "[[#Seção]] [[a\nb]]")).toEqual([])
  })
})
