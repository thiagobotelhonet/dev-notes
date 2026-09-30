import { describe, expect, it } from "vitest"
import { nextUntitledName, validateName } from "../model/vault.names"

const reason = (name: string, suffix?: string) => {
  const result = validateName(name, suffix)
  return result.ok ? null : result.reason
}

describe("validateName (FR-005)", () => {
  it("rejeita nome vazio depois do trim", () => {
    expect(reason("")).toBe("o nome não pode ficar vazio")
    expect(reason("   ")).toBe("o nome não pode ficar vazio")
  })

  it.each(["a/b", "a\\b", "a:b", "a*b", "a?b", 'a"b', "a<b", "a>b", "a|b"])(
    "rejeita o caractere proibido em %s",
    (name) => {
      expect(reason(name)).toMatch(/^não use o caractere /)
    }
  )

  it("rejeita caracteres de controle", () => {
    expect(reason("a\u0001b")).toBe("o nome tem um caractere de controle")
    expect(reason("a\u001fb")).toBe("o nome tem um caractere de controle")
  })

  it("rejeita nome terminado em ponto ou espaço", () => {
    expect(reason("deploy.")).toBe(
      "o nome não pode terminar em ponto ou espaço"
    )
    expect(reason("deploy ")).toBe(
      "o nome não pode terminar em ponto ou espaço"
    )
  })

  it("rejeita nome iniciado por ponto, que ficaria oculto na árvore", () => {
    expect(reason(".env notas")).toBe(
      "o nome não pode começar com ponto, porque ficaria oculto"
    )
  })

  it.each([
    "CON",
    "prn",
    "Aux",
    "NUL",
    "COM1",
    "com9",
    "LPT1",
    "lpt9",
    "con.txt",
    "COM¹",
  ])("rejeita o nome reservado do Windows %s", (name) => {
    expect(reason(name)).toBe("esse nome é reservado pelo Windows")
  })

  it("rejeita nome acima de 255 bytes em UTF-8, contando a extensão", () => {
    expect(reason("a".repeat(255))).toBeNull()
    expect(reason("a".repeat(256))).toBe("o nome é longo demais")
    expect(reason("a".repeat(253), ".md")).toBe("o nome é longo demais")
    expect(reason("é".repeat(128))).toBe("o nome é longo demais")
  })

  it.each(["deploy", "ADR 0001", "env notas", "COM10", "console"])(
    "aceita %s",
    (name) => {
      expect(validateName(name)).toEqual({ ok: true })
    }
  )
})

describe("nextUntitledName", () => {
  it("usa Sem título e numera a partir de 2", () => {
    expect(nextUntitledName(new Set())).toBe("Sem título")
    expect(nextUntitledName(new Set(["sem título"]))).toBe("Sem título 2")
    expect(nextUntitledName(new Set(["sem título", "sem título 2"]))).toBe(
      "Sem título 3"
    )
  })
})
