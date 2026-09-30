import { describe, expect, it } from "vitest"
import { embedState } from "../model/links.embeds"
import type { LinkTarget } from "../model/links.target"

const checklist = [
  "# Checklist",
  "",
  "## Antes do deploy",
  "",
  "- testes verdes",
  "",
  "## Depois",
  "",
  "- avisar o time",
  "",
].join("\n")

const valid = (path: string, heading?: string): LinkTarget =>
  heading ? { state: "valid", path, heading } : { state: "valid", path }

describe("embedState", () => {
  it("mostra a nota inteira enquanto nada impede", () => {
    expect(
      embedState({
        target: valid("checklist.md"),
        chain: ["runbook.md"],
        depth: 1,
        text: checklist,
      })
    ).toEqual({ kind: "content", text: checklist })
  })

  it("carregando enquanto o conteúdo não chegou", () => {
    expect(
      embedState({
        target: valid("checklist.md"),
        chain: ["runbook.md"],
        depth: 1,
      })
    ).toEqual({ kind: "loading" })
  })

  it("circular quando o destino já está na cadeia, inclusive a própria nota", () => {
    expect(
      embedState({
        target: valid("runbook.md"),
        chain: ["runbook.md"],
        depth: 1,
      })
    ).toEqual({ kind: "circular" })
    expect(
      embedState({ target: valid("a.md"), chain: ["a.md", "b.md"], depth: 2 })
    ).toEqual({ kind: "circular" })
  })

  it("profundo demais a partir do 6º nível", () => {
    expect(
      embedState({ target: valid("n6.md"), chain: [], depth: 5, text: "x" })
    ).toMatchObject({ kind: "content" })
    expect(
      embedState({ target: valid("n7.md"), chain: [], depth: 6, text: "x" })
    ).toEqual({ kind: "too-deep" })
  })

  it("nota não encontrada para destino pendente ou quebrado", () => {
    for (const target of [
      { state: "pending", path: "x.md" },
      { state: "broken", path: "x.md" },
    ] as LinkTarget[])
      expect(embedState({ target, chain: [], depth: 1 })).toEqual({
        kind: "not-found",
      })
  })

  it("tipo não suportado para arquivo; ambíguo com as candidatas", () => {
    expect(
      embedState({
        target: { state: "file", path: "mapa.canvas", kind: "canvas" },
        chain: [],
        depth: 1,
      })
    ).toEqual({ kind: "unsupported" })
    expect(
      embedState({
        target: { state: "ambiguous", candidates: ["a/util.md", "b/util.md"] },
        chain: [],
        depth: 1,
      })
    ).toEqual({ kind: "ambiguous", candidates: ["a/util.md", "b/util.md"] })
  })

  it("só a seção indicada; seção inexistente avisa", () => {
    expect(
      embedState({
        target: valid("checklist.md", "Antes do deploy"),
        chain: [],
        depth: 1,
        text: checklist,
      })
    ).toEqual({
      kind: "content",
      text: "## Antes do deploy\n\n- testes verdes\n\n",
    })
    expect(
      embedState({
        target: valid("checklist.md", "Rollback"),
        chain: [],
        depth: 1,
        text: checklist,
      })
    ).toEqual({ kind: "section-not-found", heading: "Rollback" })
  })

  it("nota vazia ou só com espaços", () => {
    expect(
      embedState({ target: valid("v.md"), chain: [], depth: 1, text: " \n\t" })
    ).toEqual({ kind: "empty" })
  })
})
