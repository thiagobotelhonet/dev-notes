import { describe, expect, it } from "vitest"
import { isEmptyQuery, parseQuery } from "../model/search.query"

describe("parseQuery — texto", () => {
  it("palavras normalizadas, sem maiúsculas nem acentos", () => {
    expect(parseQuery("Deploy Configuração").words).toEqual([
      "deploy",
      "configuracao",
    ])
  })

  it("texto entre aspas vira frase, com as palavras em ordem", () => {
    const query = parseQuery('rollout "deploy  Falhou"')
    expect(query.words).toEqual(["rollout"])
    expect(query.phrases).toEqual([["deploy", "falhou"]])
  })

  it("aspas sem fechar valem até o fim", () => {
    expect(parseQuery('"o deploy').phrases).toEqual([["o", "deploy"]])
  })

  it("palavra com separador vira a sequência das partes", () => {
    const query = parseQuery("api-gateway api_v2")
    expect(query.words).toEqual([])
    expect(query.phrases).toEqual([
      ["api", "gateway"],
      ["api", "v2"],
    ])
  })

  it("espaços extras e aspas vazias são ignorados", () => {
    const query = parseQuery('   deploy   ""  ')
    expect(query.words).toEqual(["deploy"])
    expect(query.phrases).toEqual([])
  })

  it("consulta vazia", () => {
    expect(isEmptyQuery(parseQuery(""))).toBe(true)
    expect(isEmptyQuery(parseQuery("   "))).toBe(true)
    expect(isEmptyQuery(parseQuery("x"))).toBe(false)
  })

  it("chave:valor sem propriedade conhecida é texto", () => {
    const query = parseQuery("http://intranet")
    expect(query.phrases).toEqual([["http", "intranet"]])
    expect(query.properties).toEqual([])
  })
})

describe("parseQuery — filtros", () => {
  const keys = ["linguagem", "Estágio"]

  it("tag:#backend e tag:backend são iguais", () => {
    expect(parseQuery("tag:#Backend").tags).toEqual(["backend"])
    expect(parseQuery("tag:backend/api/").tags).toEqual(["backend/api"])
  })

  it("pasta sem barras nas pontas, com aspas para espaço", () => {
    expect(parseQuery("pasta:/snippets/").folders).toEqual(["snippets"])
    expect(parseQuery('pasta:"Minhas Notas"').folders).toEqual(["minhas notas"])
  })

  it("propriedade vira filtro só se for conhecida", () => {
    expect(parseQuery("linguagem:CSharp", keys).properties).toEqual([
      { key: "linguagem", value: "csharp" },
    ])
    expect(parseQuery("estagio:rascunho", keys).properties).toEqual([
      { key: "estagio", value: "rascunho" },
    ])
    const unknown = parseQuery("linguagem:csharp")
    expect(unknown.properties).toEqual([])
    expect(unknown.phrases).toEqual([["linguagem", "csharp"]])
  })

  it("filtro sem valor é ignorado", () => {
    expect(isEmptyQuery(parseQuery("tag: pasta:"))).toBe(true)
  })

  it("filtros repetidos acumulam, junto com o texto", () => {
    const query = parseQuery("deploy tag:#backend tag:#urgente pasta:snippets")
    expect(query.words).toEqual(["deploy"])
    expect(query.tags).toEqual(["backend", "urgente"])
    expect(query.folders).toEqual(["snippets"])
  })

  it("CA-BUSCA-002-07 — texto com dois-pontos que não é filtro", () => {
    const query = parseQuery("http://intranet", keys)
    expect(query.properties).toEqual([])
    expect(query.phrases).toEqual([["http", "intranet"]])
  })
})
