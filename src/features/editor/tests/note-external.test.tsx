import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { useVaultStore } from "@/features/vault"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { NoteEditor } from "../components/note-editor"
import { useNoteStore } from "../note.store"

let memory: MemoryVaultSession
const note = () => useNoteStore.getState()

beforeEach(async () => {
  note().close()
  memory = createMemoryVaultSession(
    { "deploy.md": "# Deploy\n" },
    { lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" } }
  )
  await useVaultStore.getState().restore(memory)
  await note().open("deploy.md")
  render(<NoteEditor />)
})

const editorText = () =>
  screen.getByRole("textbox", { name: "Conteúdo da nota" }).textContent

async function externalEdit(content: string, silent = false) {
  await act(() =>
    memory.simulateExternal({ kind: "modified", path: "deploy.md" }, content, {
      silent,
    })
  )
}

describe("alteração feita fora do app", () => {
  it("CA-NOTA-007-01 — sem edição pendente, o editor mostra o conteúdo novo", async () => {
    await externalEdit("# Deploy\n\nescrito em outro editor\n")
    await expect.poll(editorText).toContain("escrito em outro editor")
    expect(note().status).toBe("clean")
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("CA-NOTA-008-01 — com edição pendente, pergunta qual versão manter e não grava nada antes", async () => {
    act(() => note().edit("# Deploy\n\nminha edição\n"))
    await externalEdit("versão de fora")
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText("“deploy” foi alterada fora do Dev Notes")
    ).toBeVisible()
    expect(
      within(dialog).getByRole("button", { name: "Manter minha versão" })
    ).toBeVisible()
    expect(
      within(dialog).getByRole("button", { name: "Usar versão do arquivo" })
    ).toBeVisible()
    expect(memory.files()["deploy.md"]).toBe("versão de fora")
  })

  it("[novo] US4-3 — Manter minha versão grava o que estava no app", async () => {
    const user = userEvent.setup()
    act(() => note().edit("minha edição"))
    await externalEdit("versão de fora")
    await user.click(
      await screen.findByRole("button", { name: "Manter minha versão" })
    )
    await expect.poll(() => memory.files()["deploy.md"]).toBe("minha edição")
    await expect.poll(() => note().status).toBe("clean")
    await memory.flushEvents()
    await expect.poll(() => screen.queryByRole("alertdialog")).toBeNull()
  })

  it("[novo] US4-3 — Usar versão do arquivo descarta o que estava no app", async () => {
    const user = userEvent.setup()
    act(() => note().edit("minha edição"))
    await externalEdit("versão de fora")
    await user.click(
      await screen.findByRole("button", { name: "Usar versão do arquivo" })
    )
    await expect.poll(editorText).toBe("versão de fora")
    expect(memory.files()["deploy.md"]).toBe("versão de fora")
    expect(note().status).toBe("clean")
  })

  it("[novo] US4-4 — a gravação do próprio app não abre o diálogo", async () => {
    act(() => note().edit("# Deploy\n\ngravado pelo app\n"))
    await act(() => note().flush())
    await memory.flushEvents()
    expect(memory.files()["deploy.md"]).toBe("# Deploy\n\ngravado pelo app\n")
    expect(note().status).toBe("clean")
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("alteração que o observador ainda não avisou também abre o diálogo e o disco fica como está (SC-005)", async () => {
    act(() => note().edit("minha edição"))
    await externalEdit("gravado por fora", true)
    await act(() => note().flush())
    expect(await screen.findByRole("alertdialog")).toBeVisible()
    expect(memory.files()["deploy.md"]).toBe("gravado por fora")
  })

  it("nota removida fora do app: com edição pendente, dá para recriá-la no mesmo caminho", async () => {
    act(() => note().edit("não perca isto"))
    await act(() =>
      memory.simulateExternal({ kind: "removed", path: "deploy.md" })
    )
    await expect.poll(() => note().status).toBe("missing")
    expect(note().hadPending).toBe(true)
    await act(() => note().recreate())
    expect(memory.files()["deploy.md"]).toBe("não perca isto")
    expect(note().status).toBe("clean")
  })
})
