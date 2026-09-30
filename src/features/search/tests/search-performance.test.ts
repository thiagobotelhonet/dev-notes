import { describe, expect, it } from "vitest"
import { suggestLinks } from "@/features/links"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { searchNotes, whenSearchReady } from "../search.store"

/** 5,000 notes in folders, with text, code, tags and properties. */
function syntheticVault() {
  const files: Record<string, string> = {}
  for (let index = 0; index < 5000; index++) {
    const folder = `area-${index % 25}/sub-${index % 7}`
    const language = index % 2 ? "csharp" : "python"
    files[`${folder}/nota-${index}.md`] = [
      "---",
      `linguagem: ${language}`,
      `tags: [area/${index % 25}]`,
      "---",
      `# Nota ${index}`,
      "",
      `O deploy da nota ${index} falhou #backend e voltou.`,
      "",
      "```bash",
      `kubectl rollout restart deployment/servico-${index}`,
      "```",
      "",
      "Texto de apoio para dar corpo à nota, com Configuração e variações.",
      "",
    ].join("\n")
  }
  return files
}

const elapsed = (run: () => unknown) => {
  const started = performance.now()
  run()
  return performance.now() - started
}

describe("metas de desempenho da spec 004", () => {
  it("SC-001, SC-002 e SC-004 — 5.000 notas: índice em até 5 s, busca rápida em 0,3 s por tecla, completa em 0,5 s", async () => {
    const memory = createMemoryVaultSession(syntheticVault(), {
      lastOpened: { root: memoryVaultRoot, name: "s", lastOpenedAt: "" },
    })
    await useVaultStore.getState().restore(memory)
    await waitForIndex()
    const started = performance.now()
    await whenSearchReady()
    expect(performance.now() - started).toBeLessThan(5000)

    const { entries } = useVaultStore.getState()
    for (const typed of ["n", "no", "not", "nota", "nota-4", "nota-49"])
      expect(elapsed(() => suggestLinks(typed, entries))).toBeLessThan(300)

    for (const query of [
      "deploy",
      "configuracao",
      '"deploy da nota"',
      "rollout servico",
      "deploy tag:#backend pasta:area-3",
      "linguagem:csharp tag:#area",
      "tag:#backend",
    ]) {
      let found = 0
      expect(
        elapsed(() => {
          found = searchNotes(query).length
        })
      ).toBeLessThan(500)
      expect(found).toBeGreaterThan(0)
    }
  })
})
