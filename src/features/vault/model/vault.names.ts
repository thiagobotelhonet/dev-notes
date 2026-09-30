import { nameKey } from "@/shared/vault"

export type NameValidation = { ok: true } | { ok: false; reason: string }

const forbidden = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]
const reserved = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(\..*)?$/i
const maxBytes = 255

/** Windows rules on every system, so a vault opens anywhere (research R7). */
export function validateName(name: string, suffix = ""): NameValidation {
  const fail = (reason: string): NameValidation => ({ ok: false, reason })
  if (name.trim() === "") return fail("o nome não pode ficar vazio")
  const bad = forbidden.find((character) => name.includes(character))
  if (bad) return fail(`não use o caractere ${bad}`)
  if ([...name].some((character) => character.charCodeAt(0) < 32))
    return fail("o nome tem um caractere de controle")
  if (name.startsWith("."))
    return fail("o nome não pode começar com ponto, porque ficaria oculto")
  if (/[. ]$/.test(name))
    return fail("o nome não pode terminar em ponto ou espaço")
  if (reserved.test(name)) return fail("esse nome é reservado pelo Windows")
  if (new TextEncoder().encode(name + suffix).length > maxBytes)
    return fail("o nome é longo demais")
  return { ok: true }
}

export const untitledName = "Sem título"

/** "Sem título", then "Sem título 2", "Sem título 3"… */
export function nextUntitledName(existingNameKeys: ReadonlySet<string>) {
  if (!existingNameKeys.has(nameKey(untitledName))) return untitledName
  let number = 2
  while (existingNameKeys.has(nameKey(`${untitledName} ${number}`))) number++
  return `${untitledName} ${number}`
}
