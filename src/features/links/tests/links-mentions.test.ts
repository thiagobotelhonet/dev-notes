import { describe, expect, it } from "vitest"
import { basenameOf, kindOf, type VaultEntry } from "@/shared/vault"
import { findMentions, mentionLink } from "../model/links.mentions"

const texts = (text: string, name: string) =>
  findMentions(text, name).map((mention) => mention.text)

const entries = (...paths: string[]): VaultEntry[] =>
  paths.map((path) => ({
    path,
    kind: kindOf(path),
    name: basenameOf(path),
    modifiedAt: 1,
  }))

describe("findMentions", () => {
  it("CA-BACK-003-01 (modelo) — palavra parcial não conta", () => {
    expect(texts("rapidamente, api-gateway e api_v2", "api")).toEqual([])
    expect(texts("a api, e (api) e API.", "api")).toEqual(["api", "api", "API"])
  })

  it("CA-BACK-003-02 (modelo) — maiúsculas não contam e o texto sai como está escrito", () => {
    expect(findMentions("Rodar o Deploy de novo.", "deploy")).toEqual([
      { start: 8, end: 14, text: "Deploy" },
    ])
  })

  it("CA-BACK-003-03 (modelo) — link, apelido e código não são menção", () => {
    const text = [
      "[[deploy]] e ![[deploy]] e [[release|o deploy]]",
      "`deploy` inline",
      "```",
      "deploy dentro de cerca",
      "```",
      "",
    ].join("\n")
    expect(findMentions(text, "deploy")).toEqual([])
  })

  it("CA-BACK-003-04 (modelo) — nome com várias palavras", () => {
    expect(texts("a ideia nova do time", "ideia nova")).toEqual(["ideia nova"])
  })

  it("acentos contam", () => {
    expect(texts("a configuracao nova", "configuração")).toEqual([])
    expect(texts("a Configuração nova", "configuração")).toEqual([
      "Configuração",
    ])
  })

  it("nome com menos de 3 caracteres não gera menção", () => {
    expect(findMentions("o db e a nota a", "db")).toEqual([])
    expect(findMentions("a casa", "a")).toEqual([])
  })

  it("posições do texto cru, com BOM e CRLF", () => {
    const text = "﻿linha 1\r\no deploy falhou\r\n"
    const [mention] = findMentions(text, "deploy")
    expect(text.slice(mention.start, mention.end)).toBe("deploy")
    expect(mention.start).toBe(text.indexOf("deploy"))
  })

  it("nome com caracteres especiais de expressão regular", () => {
    expect(texts("uso c++ no motor", "c++")).toEqual(["c++"])
  })
})

describe("mentionLink", () => {
  it("CA-BACK-004-01 (modelo) — nome único vira [[texto]] com o texto como está", () => {
    expect(
      mentionLink({
        target: "deploy.md",
        text: "Deploy",
        entries: entries("deploy.md", "infra.md"),
      })
    ).toBe("[[Deploy]]")
  })

  it("CA-BACK-004-02 (modelo) — nome repetido inclui a pasta e mantém o texto", () => {
    expect(
      mentionLink({
        target: "backend/api.md",
        text: "api",
        entries: entries("backend/api.md", "frontend/api.md", "infra.md"),
      })
    ).toBe("[[backend/api|api]]")
  })
})
