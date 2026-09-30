import { describe, expect, it } from "vitest"
import { mergeMetadata, readMetadata } from "../model/search.metadata"

const tagsOf = (text: string) => readMetadata(text).tags
const propertiesOf = (text: string) =>
  Object.fromEntries(readMetadata(text).properties)

describe("tags lidas do texto", () => {
  it("no começo da linha e depois de espaço", () => {
    expect(tagsOf("#backend\ntexto #urgente aqui")).toEqual([
      "backend",
      "urgente",
    ])
  })

  it("#123, C#, issue#12 e título não são tag", () => {
    expect(tagsOf("#123 e C# e issue#12\n# Título\n## Seção")).toEqual([])
  })

  it("tag em código (cerca e inline) e dentro de link não conta", () => {
    const text = "```\n#backend\n```\n`#inline` e [[nota|#link]] e [[#seção]]\n"
    expect(tagsOf(text)).toEqual([])
  })

  it("hierarquia e barra no fim", () => {
    expect(tagsOf("#backend/api e #infra/")).toEqual(["backend/api", "infra"])
  })

  it("a propriedade tags como lista e como texto, com e sem # (entre aspas: em YAML, # depois de espaço é comentário)", () => {
    expect(tagsOf("---\ntags: [backend/api, '#urgente']\n---\n")).toEqual([
      "backend/api",
      "urgente",
    ])
    expect(tagsOf("---\ntags: backend, infra\n---\n")).toEqual([
      "backend",
      "infra",
    ])
  })

  it("tag do texto e da propriedade juntas, sem repetir", () => {
    expect(tagsOf("---\ntags: [backend]\n---\n#backend #api\n")).toEqual([
      "backend",
      "api",
    ])
  })
})

describe("propriedades do topo da nota", () => {
  it("texto, número, sim/não, data como escrita e lista", () => {
    const text = [
      "---",
      "linguagem: csharp",
      "versao: 42",
      "publicado: true",
      "revisar: 2026-09-30",
      "autores:",
      "  - ana",
      "  - bia",
      "aninhado:",
      "  x: 1",
      "vazio:",
      "---",
      "# Nota",
    ].join("\n")
    expect(propertiesOf(text)).toEqual({
      linguagem: ["csharp"],
      versao: ["42"],
      publicado: ["true"],
      revisar: ["2026-09-30"],
      autores: ["ana", "bia"],
    })
  })

  it("bloco malformado é ignorado sem erro", () => {
    expect(propertiesOf("---\nlinguagem: [csharp\n---\n")).toEqual({})
  })

  it("BOM e CRLF antes do bloco", () => {
    expect(propertiesOf("﻿---\r\nlinguagem: python\r\n---\r\n")).toEqual({
      linguagem: ["python"],
    })
  })

  it("nada fora do topo vira propriedade", () => {
    expect(propertiesOf("# Nota\n\n---\nlinguagem: csharp\n---\n")).toEqual({})
    expect(propertiesOf("---\nlinguagem: csharp\n")).toEqual({})
  })
})

describe("mergeMetadata", () => {
  it("tags distintas em ordem, chaves e valores de propriedade", () => {
    const merged = mergeMetadata([
      readMetadata("---\nlinguagem: csharp\n---\n#backend/api"),
      readMetadata("---\nlinguagem: python\n---\n#backend #Backend"),
    ])
    expect(merged.tags).toEqual(["backend", "backend/api"])
    expect(merged.propertyKeys).toEqual(["linguagem"])
    expect(merged.propertyValues.get("linguagem")).toEqual(["csharp", "python"])
  })
})
