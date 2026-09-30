import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { useVaultStore, waitForIndex } from "../vault.store"

let memory: MemoryVaultSession
const store = () => useVaultStore.getState()
const paths = () => store().entries.map((entry) => entry.path)

beforeEach(async () => {
  memory = createMemoryVaultSession(
    { "infra.md": "[[deploy]]", "deploy.md": "", "backend/api.md": "" },
    { lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" } }
  )
  await store().restore(memory)
  await waitForIndex()
})

async function external(
  kind: "created" | "modified" | "removed",
  path: string,
  content?: string
) {
  await act(() => memory.simulateExternal({ kind, path }, content))
}

describe("mudanças feitas fora do app", () => {
  it("nota criada fora aparece na árvore e entra no índice de links", async () => {
    await external("created", "nova.md", "[[deploy]]")
    await expect.poll(paths).toContain("nova.md")
    await expect
      .poll(() =>
        store()
          .linkIndex?.linksTo("deploy.md")
          .map((l) => l.source)
          .sort()
      )
      .toEqual(["infra.md", "nova.md"])
  })

  it("nota removida fora sai da árvore e do índice", async () => {
    await external("removed", "deploy.md")
    await expect.poll(paths).not.toContain("deploy.md")
    expect(store().linkIndex?.resolve({ target: "deploy" })).toEqual({
      status: "broken",
    })
  })

  it("eco atrasado é idempotente: created de algo que já existe não duplica a árvore", async () => {
    await external("created", "deploy.md", "")
    await external("created", "deploy.md", "")
    await external("removed", "sumiu.md")
    await expect
      .poll(paths)
      .toEqual(["backend", "backend/api.md", "deploy.md", "infra.md"])
  })

  it("nota fechada alterada fora atualiza o índice", async () => {
    await external("modified", "infra.md", "sem links agora")
    await expect.poll(() => store().linkIndex?.linksTo("deploy.md")).toEqual([])
  })

  it("nota alterada fora ganha a data de modificação nova (ordem do autocomplete)", async () => {
    const modifiedAt = () =>
      store().entries.find((entry) => entry.path === "deploy.md")?.modifiedAt
    useVaultStore.setState({
      entries: store().entries.map((entry) => ({ ...entry, modifiedAt: 1000 })),
    })
    await external("modified", "deploy.md", "# Deploy novo")
    await expect.poll(() => modifiedAt() ?? 0).toBeGreaterThan(1000)
  })

  it("renomear fora do app não reescreve links", async () => {
    await external("removed", "deploy.md")
    await external("created", "release.md", "")
    await expect.poll(paths).toContain("release.md")
    expect(memory.files()["infra.md"]).toBe("[[deploy]]")
  })

  it("raiz do vault removida com o app aberto deixa o vault indisponível", async () => {
    await act(() => memory.simulateExternal({ kind: "removed", path: "" }))
    await expect.poll(() => store().status).toBe("unavailable")
  })
})
