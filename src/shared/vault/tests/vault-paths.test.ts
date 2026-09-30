import { describe, expect, it } from "vitest"
import {
  basenameOf,
  joinVaultPath,
  kindOf,
  nameKey,
  normalizeVaultPath,
  parentOf,
} from "../vault.paths"
import { VaultError } from "../vault.types"

describe("vault paths", () => {
  it.each(["..", "a/../b.md", "/absoluto.md", "C:/x.md", "a\\b.md", "./a.md"])(
    "rejeita %s com invalid-name",
    (input) => {
      expect(() => normalizeVaultPath(input)).toThrow(VaultError)
      expect(() => normalizeVaultPath(input)).toThrow(
        expect.objectContaining({ code: "invalid-name" })
      )
    }
  )

  it("normaliza barras repetidas e finais", () => {
    expect(normalizeVaultPath("a//b/")).toBe("a/b")
    expect(normalizeVaultPath("")).toBe("")
  })

  it("nameKey ignora maiúsculas e a forma Unicode", () => {
    expect(nameKey("Api")).toBe(nameKey("api"))
    expect(nameKey("\u00e9")).toBe(nameKey("e\u0301"))
  })

  it("classifica pelo tipo do arquivo", () => {
    expect(kindOf("x.md")).toBe("note")
    expect(kindOf("x.canvas")).toBe("canvas")
    expect(kindOf("x.png")).toBe("other")
  })

  it("monta e desmonta caminhos", () => {
    expect(joinVaultPath("", "a.md")).toBe("a.md")
    expect(joinVaultPath("backend", "api.md")).toBe("backend/api.md")
    expect(parentOf("backend/api.md")).toBe("backend")
    expect(parentOf("api.md")).toBe("")
    expect(basenameOf("backend/api.md")).toBe("api")
    expect(basenameOf("mapa.canvas")).toBe("mapa.canvas")
  })
})
