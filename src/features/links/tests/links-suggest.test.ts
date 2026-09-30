import { describe, expect, it } from "vitest"
import { basenameOf, kindOf, type VaultEntry } from "@/shared/vault"
import { suggestLinks } from "../model/links.suggest"

const day = 86_400_000
const now = Date.UTC(2026, 8, 30)

function entries(files: Record<string, number>): VaultEntry[] {
  return Object.entries(files).map(([path, modifiedAt]) => ({
    path,
    kind: kindOf(path),
    name: basenameOf(path),
    modifiedAt,
  }))
}

const vault = entries({
  "api.md": now - day,
  "api-gateway.md": now,
  "rapid-api.md": now - 2 * day,
  "backend/servicos/leia-me.md": now - 3 * day,
  "backend/api.md": now - 4 * day,
  "frontend/api.md": now - 5 * day,
  "deploy.md": now - 6 * day,
  "configuração.md": now - 7 * day,
  "api.canvas": now,
  "api.png": now,
})
const names = (query: string, notes = vault) =>
  suggestLinks(query, notes).map((suggestion) => suggestion.path)

describe("suggestLinks", () => {
  it("CA-LINK-005-04 — começa com, depois contém; no empate, a editada mais recentemente antes", () => {
    const only = entries({
      "api.md": now - day,
      "api-gateway.md": now,
      "rapid-api.md": now - 2 * day,
      "backend/servicos/leia-me.md": now - 3 * day,
    })
    expect(names("api", only)).toEqual([
      "api-gateway.md",
      "api.md",
      "rapid-api.md",
    ])
  })

  it("grupo 3: só a pasta contém o texto, depois dos que casam pelo nome", () => {
    expect(names("servicos")).toEqual(["backend/servicos/leia-me.md"])
    const suggestions = suggestLinks("backend", vault)
    expect(suggestions.map((s) => [s.path, s.group])).toEqual([
      ["backend/servicos/leia-me.md", 3],
      ["backend/api.md", 3],
    ])
  })

  it("não diferencia maiúsculas nem acentos", () => {
    expect(names("configuracao")).toEqual(["configuração.md"])
    expect(names("API")[0]).toBe("api-gateway.md")
  })

  it("CA-LINK-005-01/02 — insere só o nome quando ele é único e pasta/nome quando é repetido", () => {
    const byPath = Object.fromEntries(
      suggestLinks("", vault).map((s) => [s.path, s.insert])
    )
    expect(byPath["deploy.md"]).toBe("deploy")
    expect(byPath["api-gateway.md"]).toBe("api-gateway")
    expect(byPath["backend/api.md"]).toBe("backend/api")
    expect(byPath["frontend/api.md"]).toBe("frontend/api")
    expect(byPath["api.md"]).toBe("api")
  })

  it("mostra nome e pasta, e só sugere notas (FR-014)", () => {
    const [first] = suggestLinks("leia", vault)
    expect(first).toMatchObject({
      name: "leia-me",
      folder: "backend/servicos",
    })
    expect(names("api")).not.toContain("api.canvas")
    expect(names("api")).not.toContain("api.png")
  })

  it("no máximo 50 sugestões; texto vazio traz as mais recentes", () => {
    const many = entries(
      Object.fromEntries(
        Array.from({ length: 80 }, (_, i) => [`nota-${i}.md`, now - i])
      )
    )
    const suggestions = suggestLinks("", many)
    expect(suggestions).toHaveLength(50)
    expect(suggestions[0].path).toBe("nota-0.md")
  })
})
