import { EditorView } from "@codemirror/view"
import { act, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { NoteEditor } from "../components/note-editor"
import { useNoteStore } from "../note.store"

const infra =
  "# Infra\n\nDeploy: [[deploy]]\n\nDe novo: [[deploy]]\n\n## Rollback\n\nfim\n"
/* Same text saved on Windows: offsets from the index count the BOM and every "\r". */
const windows = `﻿${infra.replace(/\n/g, "\r\n")}`
const note = () => useNoteStore.getState()

beforeEach(async () => {
  note().close()
  const memory = createMemoryVaultSession(
    { "infra.md": infra, "windows.md": windows, "deploy.md": "" },
    { lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" } }
  )
  await useVaultStore.getState().restore(memory)
  await waitForIndex()
})

function cursor() {
  const content = screen.getByRole("textbox", { name: "Conteúdo da nota" })
  const view = EditorView.findFromDOM(
    content.closest(".cm-editor") as HTMLElement
  )
  if (!view) throw new Error("The editor is not mounted")
  return view.state.selection.main.head
}

describe("abrir a nota num ponto", () => {
  it("open com offset põe o cursor na posição pedida", async () => {
    const offset = infra.lastIndexOf("[[deploy]]")
    await act(() => note().open("infra.md", { offset }))
    render(<NoteEditor />)
    await expect.poll(cursor).toBe(offset)
  })

  it("abrir a mesma nota de novo com outro offset move o cursor", async () => {
    await act(() => note().open("infra.md", { offset: 3 }))
    render(<NoteEditor />)
    await expect.poll(cursor).toBe(3)
    const second = infra.indexOf("[[deploy]]")
    await act(() => note().open("infra.md", { offset: second }))
    await expect.poll(cursor).toBe(second)
  })

  it("com BOM e CRLF, o offset do texto cru cai no mesmo link do editor", async () => {
    await act(() =>
      note().open("windows.md", { offset: windows.lastIndexOf("[[deploy]]") })
    )
    render(<NoteEditor />)
    await expect.poll(cursor).toBe(infra.lastIndexOf("[[deploy]]"))
    await act(() =>
      note().open("windows.md", { offset: windows.indexOf("[[deploy]]") })
    )
    await expect.poll(cursor).toBe(infra.indexOf("[[deploy]]"))
  })

  it("o pedido por título da spec 002 continua funcionando", async () => {
    await act(() => note().open("infra.md", { heading: "Rollback" }))
    render(<NoteEditor />)
    await expect.poll(cursor).toBe(infra.indexOf("## Rollback"))
  })
})
