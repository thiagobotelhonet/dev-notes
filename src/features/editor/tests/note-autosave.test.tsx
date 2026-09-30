import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useVaultStore } from "@/features/vault"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { NoteEditor } from "../components/note-editor"
import { useNoteStore } from "../note.store"

const bom = "\uFEFF"
let memory: MemoryVaultSession
const note = () => useNoteStore.getState()

async function openVault() {
  memory = createMemoryVaultSession(
    {
      "deploy.md": "# Deploy\n",
      "outra.md": "outra",
      "windows.md": `${bom}linha 1\r\nlinha 2\r\n`,
      "vazia.md": "",
    },
    { lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" } }
  )
  await useVaultStore.getState().restore(memory)
}

beforeEach(async () => {
  note().close()
  await openVault()
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
})
afterEach(() => {
  vi.useRealTimers()
})

describe("gravação automática", () => {
  it("[novo] US1-4 — grava 1 s depois da última edição e o indicador some", async () => {
    await note().open("deploy.md")
    render(<NoteEditor />)
    act(() => note().edit("# Deploy\n\nnovo"))
    expect(screen.getByRole("status")).toHaveTextContent("Não gravado")
    await act(() => vi.advanceTimersByTimeAsync(999))
    expect(memory.files()["deploy.md"]).toBe("# Deploy\n")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await note().flush()
    })
    expect(memory.files()["deploy.md"]).toBe("# Deploy\n\nnovo")
    expect(screen.queryByText("Não gravado")).not.toBeInTheDocument()
    expect(note().status).toBe("clean")
  })

  it("a gravação atualiza a data de modificação da nota no vault (ordem do autocomplete)", async () => {
    const modifiedAt = () =>
      useVaultStore
        .getState()
        .entries.find((entry) => entry.path === "deploy.md")?.modifiedAt ?? 0
    useVaultStore.setState({
      entries: useVaultStore
        .getState()
        .entries.map((entry) => ({ ...entry, modifiedAt: 1000 })),
    })
    await note().open("deploy.md")
    note().edit("# Deploy\n\nnovo")
    await note().flush()
    expect(modifiedAt()).toBeGreaterThan(1000)
  })

  it("grava na hora ao trocar de nota", async () => {
    await note().open("deploy.md")
    note().edit("trocando")
    await note().open("outra.md")
    expect(memory.files()["deploy.md"]).toBe("trocando")
    expect(note().path).toBe("outra.md")
  })

  it("grava na tarefa de fechar o app", async () => {
    await note().open("deploy.md")
    note().edit("fechando")
    await memory.runBeforeClose()
    expect(memory.files()["deploy.md"]).toBe("fechando")
  })

  it("grava na hora quando a janela perde o foco", async () => {
    await note().open("deploy.md")
    note().edit("sem foco")
    window.dispatchEvent(new Event("blur"))
    await note().flush()
    expect(memory.files()["deploy.md"]).toBe("sem foco")
  })

  it("em conflito nunca grava sozinho", async () => {
    await note().open("deploy.md")
    note().edit("minha versão")
    await memory.simulateExternal(
      { kind: "modified", path: "deploy.md" },
      "versão de fora"
    )
    await vi.waitFor(() => expect(note().status).toBe("conflict"))
    note().edit("minha versão, continuando")
    await vi.advanceTimersByTimeAsync(5000)
    await note().flush()
    expect(memory.files()["deploy.md"]).toBe("versão de fora")
  })

  it("alteração externa que o observador ainda não avisou não é sobrescrita (FR-022, SC-005)", async () => {
    await note().open("deploy.md")
    note().edit("minha versão")
    await memory.simulateExternal(
      { kind: "modified", path: "deploy.md" },
      "gravado por fora",
      { silent: true }
    )
    await vi.advanceTimersByTimeAsync(1000)
    await note().flush()
    expect(note().status).toBe("conflict")
    expect(memory.files()["deploy.md"]).toBe("gravado por fora")
  })

  it("arquivo que sumiu antes da gravação vai para missing sem ser recriado", async () => {
    await note().open("deploy.md")
    note().edit("minha versão")
    await memory.simulateExternal(
      { kind: "removed", path: "deploy.md" },
      undefined,
      { silent: true }
    )
    await vi.advanceTimersByTimeAsync(1000)
    await note().flush()
    expect(note().status).toBe("missing")
    expect(memory.files()["deploy.md"]).toBeUndefined()
  })

  it("preserva CRLF e BOM; LF continua LF; nota vazia usa LF (FR-004)", async () => {
    await note().open("windows.md")
    expect(note().buffer).toBe("linha 1\nlinha 2\n")
    note().edit("linha 1\nlinha 2 editada\nlinha 3\n")
    await note().open("deploy.md")
    expect(memory.files()["windows.md"]).toBe(
      `${bom}linha 1\r\nlinha 2 editada\r\nlinha 3\r\n`
    )
    note().edit("# Deploy\n\nmais\n")
    await note().open("vazia.md")
    expect(memory.files()["deploy.md"]).toBe("# Deploy\n\nmais\n")
    note().edit("a\nb\n")
    await note().flush()
    expect(memory.files()["vazia.md"]).toBe("a\nb\n")
  })
})
