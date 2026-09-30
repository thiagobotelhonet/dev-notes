import { describe, expect, it } from "vitest"
import { parseLinks, resolveLinkTarget, suggestLinks } from "@/features/links"
import {
  createMemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { useVaultStore, waitForIndex } from "../vault.store"
import { createSyntheticVault } from "./fixtures/synthetic-vault"

describe("metas de desempenho no adapter de memória", () => {
  it("SC-002 e SC-001 — renomear uma nota com 200 referências num vault de 5.000 notas leva menos de 5 s e não deixa link antigo", async () => {
    const files = createSyntheticVault({ notes: 5000, linkingToTarget: 200 })
    const linking = Object.values(files).filter((text) =>
      text.includes("[[alvo]]")
    )
    expect(Object.keys(files)).toHaveLength(5000)
    expect(linking).toHaveLength(200)

    const memory = createMemoryVaultSession(files, {
      lastOpened: {
        root: memoryVaultRoot,
        name: "sintético",
        lastOpenedAt: "",
      },
    })
    const started = performance.now()
    await useVaultStore.getState().restore(memory)
    await waitForIndex()
    await useVaultStore.getState().renameEntry("alvo.md", "destino")
    const elapsed = performance.now() - started

    expect(elapsed).toBeLessThan(5000)
    const after = Object.values(memory.files())
    expect(after.filter((text) => /\[\[alvo[\]#|]/.test(text))).toHaveLength(0)
    expect(after.filter((text) => text.includes("[[destino]]"))).toHaveLength(
      200
    )
    expect(memory.files()["destino.md"]).toContain("# Alvo")
  })
})

describe("metas de desempenho da spec 002", () => {
  it("SC-001 — cada tecla do autocomplete ordena as sugestões de 5.000 notas em menos de 0,3 s", async () => {
    const memory = createMemoryVaultSession(
      createSyntheticVault({ notes: 5000, linkingToTarget: 200 }),
      { lastOpened: { root: memoryVaultRoot, name: "s", lastOpenedAt: "" } }
    )
    await useVaultStore.getState().restore(memory)
    const { entries } = useVaultStore.getState()
    for (const typed of ["n", "no", "not", "nota", "nota-4", "nota-49"]) {
      const started = performance.now()
      const suggestions = suggestLinks(typed, entries)
      expect(performance.now() - started).toBeLessThan(300)
      expect(suggestions.length).toBeGreaterThan(0)
    }
  })

  it("resolver os 200 links de uma nota num vault de 5.000 notas fica bem abaixo de 1 s", async () => {
    const files = createSyntheticVault({ notes: 5000, linkingToTarget: 0 })
    const text = Array.from(
      { length: 200 },
      (_, i) => `[[nota-${i + 1}]] [[pendente-${i}]]`
    ).join("\n")
    const memory = createMemoryVaultSession(
      { ...files, "indice.md": text },
      { lastOpened: { root: memoryVaultRoot, name: "s", lastOpenedAt: "" } }
    )
    await useVaultStore.getState().restore(memory)
    const index = await waitForIndex()
    if (!index) throw new Error("The link index was not built")
    const { entries, deleted } = useVaultStore.getState()
    const links = parseLinks("indice.md", text)
    const started = performance.now()
    const states = links.map(
      (link) =>
        resolveLinkTarget({ link, from: "indice.md", index, entries, deleted })
          .state
    )
    expect(performance.now() - started).toBeLessThan(500)
    expect(states.filter((state) => state === "valid")).toHaveLength(200)
    expect(states.filter((state) => state === "pending")).toHaveLength(200)
  })
})
