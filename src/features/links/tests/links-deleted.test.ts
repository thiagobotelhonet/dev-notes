import { describe, expect, it } from "vitest"
import type { VaultEntry } from "@/shared/vault"
import {
  type DeletedNotes,
  parseDeletedNotes,
  serializeDeletedNotes,
  withDeleted,
  withoutExisting,
} from "../model/links.deleted"

const at = new Date("2026-09-30T12:00:00.000Z")
const later = new Date("2026-09-30T13:00:00.000Z")

const note = (path: string): VaultEntry => ({
  path,
  kind: "note",
  name: path.replace(/\.md$/, ""),
  modifiedAt: 1,
})

describe("registro de notas excluídas", () => {
  it.each([
    ["ausente", null],
    ["JSON inválido", "{ não é json"],
    ["versão desconhecida", '{"version":2,"notes":[]}'],
    [
      "entrada sem path",
      '{"version":1,"notes":[{"deletedAt":"2026-09-30T12:00:00.000Z"}]}',
    ],
    [
      "caminho que não é nota",
      '{"version":1,"notes":[{"path":"mapa.canvas","deletedAt":"2026-09-30T12:00:00.000Z"}]}',
    ],
  ])("arquivo %s vira registro vazio, sem lançar erro", (_, json) => {
    expect(parseDeletedNotes(json)).toEqual([])
  })

  it("serializar e ler de novo devolve o mesmo registro", () => {
    const notes = withDeleted([], ["deploy.md", "backend/api.md"], at)
    const json = serializeDeletedNotes(notes)
    expect(JSON.parse(json)).toMatchObject({ version: 1 })
    expect(parseDeletedNotes(json)).toEqual(notes)
  })

  it("withDeleted acrescenta com a data em ISO 8601 e, se o caminho já estava, só atualiza a data", () => {
    const first = withDeleted([], ["deploy.md"], at)
    expect(first).toEqual([
      { path: "deploy.md", deletedAt: "2026-09-30T12:00:00.000Z" },
    ])
    const again = withDeleted(first, ["Deploy.md", "infra.md"], later)
    expect(again).toEqual([
      { path: "Deploy.md", deletedAt: "2026-09-30T13:00:00.000Z" },
      { path: "infra.md", deletedAt: "2026-09-30T13:00:00.000Z" },
    ])
  })

  it("guarda no máximo 5.000 entradas, e a mais antiga sai primeiro", () => {
    const paths = Array.from({ length: 5001 }, (_, i) => `nota-${i}.md`)
    const notes = withDeleted([], paths, at)
    expect(notes).toHaveLength(5000)
    expect(notes[0].path).toBe("nota-1.md")
    expect(notes.at(-1)?.path).toBe("nota-5000.md")
  })

  it("withoutExisting tira os caminhos que voltaram a existir, comparando pela nameKey", () => {
    const notes = withDeleted([], ["deploy.md", "infra.md"], at)
    expect(withoutExisting(notes, [note("Deploy.md")])).toEqual([
      { path: "infra.md", deletedAt: "2026-09-30T12:00:00.000Z" },
    ])
  })

  it("withoutExisting devolve o mesmo registro quando nada mudou", () => {
    const notes: DeletedNotes = withDeleted([], ["deploy.md"], at)
    expect(withoutExisting(notes, [note("infra.md")])).toBe(notes)
  })
})
