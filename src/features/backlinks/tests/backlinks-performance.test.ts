import { describe, expect, it } from "vitest"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { backlinkGroups, mentionGroups } from "../model/backlinks.list"

/** 5.000 notas em pastas; uma em 25 com link para `alvo` e outra em 25 que cita o nome sem link. */
function syntheticVault() {
  const files: Record<string, string> = { "alvo.md": "# Alvo\n" }
  for (let index = 1; index < 5000; index++) {
    const folder = `area-${index % 25}/sub-${index % 7}`
    const body =
      index % 25 === 0
        ? "Ver [[alvo]] e [[alvo#Seção|o alvo]].\n"
        : index % 25 === 1
          ? "Ontem o alvo caiu; `alvo` em código não conta.\n"
          : `Ver [[nota-${(index + 1) % 5000}]] e o texto de sempre.\n`
    files[`${folder}/nota-${index}.md`] = `# Nota ${index}\n\n${body}`
  }
  return files
}

describe("metas de desempenho da spec 003", () => {
  it("SC-001 — num vault de 5.000 notas, links em menos de 0,5 s e menções em menos de 2 s", async () => {
    const files = syntheticVault()
    const count = (part: string) =>
      Object.values(files).filter((text) => text.includes(part)).length
    const memory = createMemoryVaultSession(files, {
      lastOpened: { root: memoryVaultRoot, name: "s", lastOpenedAt: "" },
    })
    await useVaultStore.getState().restore(memory)
    const index = await waitForIndex()
    if (!index) throw new Error("índice não ficou pronto")

    let started = performance.now()
    const links = backlinkGroups(index, "alvo.md")
    expect(performance.now() - started).toBeLessThan(500)
    expect(links).toHaveLength(count("[[alvo]]"))

    started = performance.now()
    const mentions = mentionGroups(index, "alvo.md")
    expect(performance.now() - started).toBeLessThan(2000)
    expect(mentions.groups).toHaveLength(count("o alvo caiu"))
  })
})
