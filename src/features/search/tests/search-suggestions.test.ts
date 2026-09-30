import { describe, expect, it } from "vitest"
import { mergeMetadata, readMetadata } from "../model/search.metadata"
import { suggestFilterValues } from "../model/search.suggestions"

const metadata = mergeMetadata([
  readMetadata("---\nlinguagem: csharp\n---\n#backend/api"),
  readMetadata(
    "---\nlinguagem: python\nestágio: revisão\n---\n#backend #infra"
  ),
])
const folders = ["snippets", "snippets/dotnet", "minhas notas", "backend"]

const suggest = (text: string, cursor = text.length) =>
  suggestFilterValues(text, cursor, metadata, folders)
const labels = (text: string, cursor?: number) =>
  suggest(text, cursor)?.options.map((option) => option.label)

describe("suggestFilterValues", () => {
  it("CA-BUSCA-006-01 — sugestão de tags", () => {
    expect(labels("tag:#ba")).toEqual(["#backend", "#backend/api"])
    expect(labels("tag:ba")).toEqual(["#backend", "#backend/api"])
  })

  it("CA-BUSCA-006-02 — sugestão de pastas", () => {
    expect(labels("pasta:sn")).toEqual(["snippets", "snippets/dotnet"])
  })

  it("CA-BUSCA-006-03 — sugestão de valores de propriedade", () => {
    expect(labels("linguagem:")).toEqual(["csharp", "python"])
  })

  it("sem diferenciar maiúsculas nem acentos, na chave e no valor", () => {
    expect(labels("ESTAGIO:revi")).toEqual(["revisão"])
    expect(labels("tag:#BACK")).toEqual(["#backend", "#backend/api"])
  })

  it("começa com vem antes de contém", () => {
    expect(labels("pasta:net")).toEqual(["snippets/dotnet"])
    expect(labels("tag:api")).toEqual(["#backend/api"])
  })

  it("o texto a inserir troca só o pedaço do cursor e põe aspas quando precisa", () => {
    const text = "deploy pasta:min tag:#ba"
    const cursor = text.indexOf("min") + 3
    const suggestion = suggest(text, cursor)
    expect(suggestion?.start).toBe(text.indexOf("pasta:"))
    expect(suggestion?.end).toBe(text.indexOf(" tag:"))
    expect(suggestion?.options.map((option) => option.insert)).toEqual([
      'pasta:"minhas notas"',
    ])
    expect(suggest("tag:#ba")?.options[0].insert).toBe("tag:#backend")
  })

  it("fora de um filtro, nada é sugerido", () => {
    expect(suggest("deploy")).toBeNull()
    expect(suggest("http://intranet")).toBeNull()
    expect(suggest("tag:#ba deploy")).toBeNull()
    expect(suggest("")).toBeNull()
  })
})
