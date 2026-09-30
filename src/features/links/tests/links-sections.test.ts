import { describe, expect, it } from "vitest"
import { findSection } from "../model/links.sections"

const text = [
  "# Checklist",
  "intro",
  "## Antes do Deploy ",
  "- testes",
  "### Detalhe",
  "- banco",
  "## Depois",
  "- avisar",
  "```md",
  "## Dentro de código",
  "```",
  "## Antes do deploy",
  "repetido",
].join("\n")

const slice = (heading: string) => {
  const section = findSection(text, heading)
  return section && text.slice(section.from, section.to)
}

describe("findSection", () => {
  it("vai do título até antes do próximo título de nível igual ou maior", () => {
    expect(slice("Antes do Deploy")).toBe(
      "## Antes do Deploy \n- testes\n### Detalhe\n- banco\n"
    )
    expect(findSection(text, "Detalhe")).toMatchObject({
      title: "Detalhe",
      level: 3,
    })
    expect(slice("Detalhe")).toBe("### Detalhe\n- banco\n")
  })

  it("a seção de nível 1 vai até o fim", () => {
    expect(slice("checklist")).toBe(text)
  })

  it("compara sem maiúsculas, sem acentos e sem espaços nas pontas; havendo dois iguais, vale o primeiro", () => {
    expect(findSection(text, "  antes do deploy")).toMatchObject({
      title: "Antes do Deploy",
      level: 2,
      from: text.indexOf("## Antes do Deploy "),
    })
    expect(findSection("## Configuração\nx", "configuracao")).toMatchObject({
      title: "Configuração",
    })
  })

  it("títulos dentro de cerca de código não contam", () => {
    expect(findSection(text, "Dentro de código")).toBeNull()
    expect(slice("Depois")).toBe(
      "## Depois\n- avisar\n```md\n## Dentro de código\n```\n"
    )
  })

  it("título inexistente devolve null", () => {
    expect(findSection(text, "Rollback")).toBeNull()
  })
})
