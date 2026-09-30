import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { parseLinks } from "@/features/links"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { useVaultStore, waitForIndex } from "../vault.store"

const seed = {
  "infra.md": "",
  "deploy.md": "# Deploy\n\n## Rollback\n",
  "backend/api.md": "",
  "frontend/api.md": "",
  "backend/util.md": "",
  "frontend/util.md": "",
  "runbooks/a.md": "",
  "runbooks/b.md": "",
  "mapa.canvas": "{}",
}

let memory: MemoryVaultSession
const store = () => useVaultStore.getState()
const registry = () => memory.appDataFiles()["deleted-notes.json"] ?? ""

async function openVault(files: Record<string, string> = seed) {
  memory = createMemoryVaultSession(files, {
    lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" },
  })
  await store().restore(memory)
  await waitForIndex()
}

function follow(text: string, from = "infra.md") {
  const [link] = parseLinks(from, text)
  return act(() => store().followLink(link, from))
}

beforeEach(() => openVault())

describe("seguir link", () => {
  it("CA-LINK-004-01 — link válido abre a nota de destino", async () => {
    expect(await follow("[[deploy]]")).toEqual({
      type: "open",
      path: "deploy.md",
    })
  })

  it("CA-LINK-004-02 — link com pasta abre a nota daquela pasta", async () => {
    expect(await follow("[[backend/api]]")).toEqual({
      type: "open",
      path: "backend/api.md",
    })
  })

  it("CA-LINK-004-03 — link para seção abre a nota com a seção", async () => {
    expect(await follow("[[deploy#Rollback]]")).toEqual({
      type: "open",
      path: "deploy.md",
      heading: "Rollback",
    })
  })

  it("link para canvas não cria nota e diz o tipo (FR-011)", async () => {
    expect(await follow("[[mapa.canvas]]")).toEqual({
      type: "unsupported",
      kind: "canvas",
    })
    expect(Object.keys(memory.files())).not.toContain("mapa.canvas.md")
  })
})

describe("seguir link ambíguo", () => {
  it("CA-LINK-003-02 — nome repetido pede a escolha entre as candidatas, sem abrir nem criar nada", async () => {
    const before = memory.files()
    expect(await follow("[[util#Uso]]")).toEqual({
      type: "choose",
      name: "util",
      candidates: ["backend/util.md", "frontend/util.md"],
      heading: "Uso",
    })
    expect(memory.files()).toEqual(before)
  })
})

describe("seguir link pendente", () => {
  it("CA-LINK-001-01 — link pendente cria a nota vazia e manda abrir", async () => {
    expect(await follow("[[ideia nova]]")).toEqual({
      type: "open",
      path: "ideia nova.md",
      created: true,
    })
    expect(memory.files()["ideia nova.md"]).toBe("")
    expect(store().entries.map((entry) => entry.path)).toContain(
      "ideia nova.md"
    )
    expect(await follow("[[ideia nova]]")).toEqual({
      type: "open",
      path: "ideia nova.md",
    })
  })

  it("CA-LINK-001-02 — link pendente com pasta cria a pasta e a nota", async () => {
    expect(await follow("[[ops/rollback]]")).toEqual({
      type: "open",
      path: "ops/rollback.md",
      created: true,
    })
    expect(memory.files()["ops/rollback.md"]).toBe("")
    const paths = store().entries.map((entry) => entry.path)
    expect(paths).toContain("ops")
    expect(paths).toContain("ops/rollback.md")
  })

  it("CA-LINK-001-03 — nome inválido não cria nada e diz o motivo", async () => {
    const before = memory.files()
    expect(await follow("[[a:b]]")).toEqual({
      type: "invalid",
      reason: "não use o caractere :",
    })
    expect(await follow("[[ops/.oculta]]")).toMatchObject({ type: "invalid" })
    expect(memory.files()).toEqual(before)
  })

  it("CA-LINK-001-04 — link pendente sem pasta nasce na pasta da nota que contém o link", async () => {
    expect(await follow("[[ideia nova]]", "backend/infra.md")).toEqual({
      type: "open",
      path: "backend/ideia nova.md",
      created: true,
    })
  })

  it("link pendente dentro de uma nota incorporada nasce na pasta dela", async () => {
    expect(await follow("[[passo]]", "runbooks/a.md")).toMatchObject({
      path: "runbooks/passo.md",
      created: true,
    })
  })

  it("[[Ideia Nova]] com a nota ideia nova existente abre a existente, sem criar", async () => {
    await follow("[[ideia nova]]")
    expect(await follow("[[Ideia Nova]]")).toEqual({
      type: "open",
      path: "ideia nova.md",
    })
  })

  it("arquivo que apareceu antes de gravar não é sobrescrito: só abre", async () => {
    await memory.simulateExternal(
      { kind: "created", path: "ideia nova.md" },
      "escrita por fora",
      { silent: true }
    )
    expect(await follow("[[ideia nova]]")).toMatchObject({
      type: "open",
      path: "ideia nova.md",
    })
    expect(memory.files()["ideia nova.md"]).toBe("escrita por fora")
  })
})

describe("registro de notas excluídas", () => {
  it("excluir pelo app põe a nota no registro, inclusive cada nota de uma pasta", async () => {
    await act(() => store().deleteEntry("deploy.md"))
    await act(() => store().deleteEntry("runbooks"))
    expect(
      store()
        .deleted.map((note) => note.path)
        .sort()
    ).toEqual(["deploy.md", "runbooks/a.md", "runbooks/b.md"])
  })

  it("CA-LINK-002-04 — seguir link para nota excluída devolve quebrado e não cria nada; só recreateNote cria", async () => {
    await act(() => store().deleteEntry("deploy.md"))
    expect(await follow("[[deploy]]")).toEqual({
      type: "broken",
      path: "deploy.md",
    })
    expect(memory.files()["deploy.md"]).toBeUndefined()
    expect(await act(() => store().recreateNote("deploy.md"))).toEqual({
      type: "open",
      path: "deploy.md",
    })
    expect(memory.files()["deploy.md"]).toBe("")
    expect(store().deleted).toEqual([])
    expect(await follow("[[deploy]]")).toMatchObject({ type: "open" })
  })

  it("recreateNote não sobrescreve um arquivo que voltou a existir", async () => {
    await act(() => store().deleteEntry("deploy.md"))
    await memory.simulateExternal(
      { kind: "created", path: "deploy.md" },
      "restaurada",
      { silent: true }
    )
    expect(await act(() => store().recreateNote("deploy.md"))).toEqual({
      type: "open",
      path: "deploy.md",
    })
    expect(memory.files()["deploy.md"]).toBe("restaurada")
  })

  it("CA-LINK-002-03 — o registro é gravado em .devnotes e o link continua quebrado depois de reabrir", async () => {
    await act(() => store().deleteEntry("deploy.md"))
    await expect.poll(registry).toContain('"deploy.md"')
    await store().restore(memory)
    await waitForIndex()
    expect(await follow("[[deploy]]")).toEqual({
      type: "broken",
      path: "deploy.md",
    })
  })

  it("nota removida por outra ferramenta com o app aberto entra no registro", async () => {
    await act(() =>
      memory.simulateExternal({ kind: "removed", path: "deploy.md" })
    )
    await expect
      .poll(() => store().deleted.map((note) => note.path))
      .toEqual(["deploy.md"])
  })

  it("renomear por outra ferramenta deixa o nome antigo como quebrado", async () => {
    await act(async () => {
      await memory.simulateExternal({ kind: "removed", path: "deploy.md" })
      await memory.simulateExternal({ kind: "created", path: "release.md" }, "")
    })
    await expect
      .poll(() => follow("[[deploy]]"))
      .toEqual({ type: "broken", path: "deploy.md" })
  })

  it("nota que volta a existir (restaurada pela lixeira) sai do registro", async () => {
    await act(() => store().deleteEntry("deploy.md"))
    /* The trash echo is ignored for 2 s (ledger); a restore comes later. */
    vi.useFakeTimers({ toFake: ["Date"] })
    try {
      vi.setSystemTime(Date.now() + 3000)
      await act(() =>
        memory.simulateExternal({ kind: "created", path: "deploy.md" }, "")
      )
      await expect.poll(() => store().deleted).toEqual([])
    } finally {
      vi.useRealTimers()
    }
    expect(await follow("[[deploy]]")).toMatchObject({ type: "open" })
  })

  it("registro inválido não gera erro: começa vazio", async () => {
    await openVault({
      ...seed,
      ".devnotes/deleted-notes.json": "{ corrompido",
    })
    expect(store().status).toBe("ready")
    expect(store().deleted).toEqual([])
  })

  it("renomear e mover pelo app não põem nada no registro", async () => {
    await act(() => store().renameEntry("deploy.md", "release"))
    await act(() => store().moveEntry("backend/api.md", "runbooks"))
    expect(store().deleted).toEqual([])
  })
})
