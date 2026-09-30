import { describe, expect, it } from "vitest"
import { foldTextUntrimmed } from "@/features/links"
import { findOccurrences, matchesFolded } from "../model/search.occurrences"
import { parseQuery } from "../model/search.query"

const find = (text: string, query: string) =>
  findOccurrences(text, parseQuery(query))
const matched = (text: string, query: string) =>
  find(text, query).occurrences.map((o) => text.slice(o.start, o.end))

describe("findOccurrences", () => {
  it("posição no arquivo com acento: configuracao acha Configuração", () => {
    const text = "# Notas\n\nConfiguração do proxy\n"
    const [first] = find(text, "configuracao").occurrences
    expect(text.slice(first.start, first.end)).toBe("Configuração")
    expect(first.snippet).toEqual({
      before: "",
      match: "Configuração",
      after: " do proxy",
    })
  })

  it("posição no arquivo com BOM e CRLF", () => {
    const text = "﻿# Título\r\n\r\nlinha com rollout aqui\r\n"
    const [first] = find(text, "rollout").occurrences
    expect(first.start).toBe(text.indexOf("rollout"))
    expect(first.snippet.after).toBe(" aqui")
  })

  it("acento decomposto no arquivo (NFD) mantém as posições", () => {
    const text = "a configuração é boa"
    expect(matched(text, "configuracao")).toEqual(["configuração"])
    expect(matched(text, '"e boa"')).toEqual(["é boa"])
  })

  it("início de palavra: api não casa em rapidamente", () => {
    expect(matched("rapidamente", "api")).toEqual([])
    expect(matched("(api) e api-gateway", "api")).toEqual(["api", "api"])
  })

  it("partes de nomes técnicos são início de palavra", () => {
    expect(matched("o api-gateway caiu", "gateway")).toEqual(["gateway"])
    expect(matched("use api_v2", "v2")).toEqual(["v2"])
    expect(matched("React.useState", "usestate")).toEqual(["useState"])
  })

  it("prefixo: depl casa em deploy e o destaque cobre a palavra", () => {
    expect(matched("o deploy", "depl")).toEqual(["deploy"])
  })

  it("frase aceita quebra de linha e vários espaços entre as palavras", () => {
    expect(matched("o deploy\n   falhou", '"deploy falhou"')).toEqual([
      "deploy\n   falhou",
    ])
    expect(matched("falhou o deploy", '"deploy falhou"')).toEqual([])
  })

  it("contagem total e só os 3 primeiros trechos, na ordem do texto", () => {
    const text = "deploy 1\ndeploy 2\ndeploy 3\ndeploy 4\n"
    const result = find(text, "deploy")
    expect(result.count).toBe(4)
    expect(result.occurrences.map((o) => o.snippet.after)).toEqual([
      " 1",
      " 2",
      " 3",
    ])
  })

  it("várias palavras: ocorrências de todas, sem repetir a mesma posição", () => {
    const text = "deploy falhou\n"
    expect(find(text, "deploy falhou deploy").count).toBe(2)
  })
})

const matches = (text: string, query: ReturnType<typeof parseQuery>) =>
  matchesFolded(foldTextUntrimmed(text), query)

describe("matchesFolded", () => {
  it("exige todas as palavras e frases", () => {
    const query = parseQuery('deploy "falhou de novo"')
    expect(matches("o deploy falhou de novo", query)).toBe(true)
    expect(matches("o deploy falhou", query)).toBe(false)
  })
})
