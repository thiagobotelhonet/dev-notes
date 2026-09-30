import { currentCompletions, startCompletion } from "@codemirror/autocomplete"
import { EditorView } from "@codemirror/view"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { NoteEditor } from "../components/note-editor"
import { useNoteStore } from "../note.store"

const intro = "Texto\n"

beforeEach(async () => {
  useNoteStore.getState().close()
  const memory = createMemoryVaultSession(
    {
      "infra.md": intro,
      "deploy.md": "",
      "backend/api.md": "",
      "frontend/api.md": "",
      "checklist.md": "",
    },
    {
      lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" },
      modifiedAt: {
        "backend/api.md": 3000,
        "frontend/api.md": 2000,
        "deploy.md": 1000,
        "checklist.md": 500,
      },
    }
  )
  await useVaultStore.getState().restore(memory)
  await waitForIndex()
  await useNoteStore.getState().open("infra.md")
  render(<NoteEditor />)
})

function editorView() {
  const content = screen.getByRole("textbox", { name: "Conteúdo da nota" })
  const view = EditorView.findFromDOM(
    content.closest(".cm-editor") as HTMLElement
  )
  if (!view) throw new Error("The editor is not mounted")
  return view
}

const text = () => editorView().state.doc.toString()

/** Types at the end of the note and opens the suggestions. */
async function type(typed: string, after = "") {
  const view = editorView()
  const at = view.state.doc.length
  act(() => {
    view.dispatch({
      changes: { from: at, insert: typed + after },
      selection: { anchor: at + typed.length },
      userEvent: "input.type",
    })
    startCompletion(view)
  })
  await expect
    .poll(() => currentCompletions(view.state).length)
    .toBeGreaterThan(0)
  const list = await screen.findByRole("listbox")
  /* Keys in the first 75 ms after opening are ignored (interactionDelay). */
  await act(() => new Promise((resolve) => setTimeout(resolve, 100)))
  return list
}

async function key(name: string) {
  act(() => editorView().focus())
  await userEvent.setup().keyboard(`{${name}}`)
}

describe("autocomplete de links", () => {
  it("CA-LINK-005-01 — [[depl e escolher deploy deixa [[deploy]]", async () => {
    await type("[[depl")
    await key("Enter")
    expect(text()).toBe(`${intro}[[deploy]]`)
    expect(editorView().state.selection.main.head).toBe(text().length)
  })

  it("CA-LINK-005-03 — [[api mostra as duas notas, cada uma com a sua pasta", async () => {
    const list = await type("[[api")
    const options = within(list).getAllByRole("option")
    expect(options.map((option) => option.textContent)).toEqual([
      "apibackend",
      "apifrontend",
    ])
  })

  it("CA-LINK-005-02 — escolher a de backend/ deixa [[backend/api]]", async () => {
    await type("[[api")
    await key("Enter")
    expect(text()).toBe(`${intro}[[backend/api]]`)
  })

  it("[novo] US3-6 — setas e Enter escolhem; Tab também; Esc fecha sem inserir", async () => {
    await type("[[api")
    await key("ArrowDown")
    await key("Enter")
    expect(text()).toBe(`${intro}[[frontend/api]]`)

    await type("\n[[depl")
    await key("Tab")
    expect(text()).toBe(`${intro}[[frontend/api]]\n[[deploy]]`)

    await type("\n[[chec")
    await key("Escape")
    await expect.poll(() => screen.queryByRole("listbox")).toBeNull()
    expect(text()).toBe(`${intro}[[frontend/api]]\n[[deploy]]\n[[chec`)
  })

  it("![[ também sugere e mantém o !", async () => {
    await type("![[chec")
    await key("Enter")
    expect(text()).toBe(`${intro}![[checklist]]`)
  })

  it("com ]] já escrito depois do cursor, não duplica os colchetes", async () => {
    await type("[[depl", "]]")
    await key("Enter")
    expect(text()).toBe(`${intro}[[deploy]]`)
    expect(editorView().state.selection.main.head).toBe(text().length)
  })

  it("sem nota correspondente, avisa e Enter não insere nada", async () => {
    const list = await type("[[ideia nova")
    expect(list).toHaveTextContent(
      "Nenhuma nota encontrada. Continue digitando para criar um link novo."
    )
    await key("Enter")
    expect(text()).toBe(`${intro}[[ideia nova`)
  })

  it("CA-LINK-005-05 — terminar de escrever o link sem escolher mantém o texto e o link fica pendente", async () => {
    await type("[[ideia nova")
    const view = editorView()
    act(() => {
      view.dispatch({
        changes: { from: view.state.doc.length, insert: "]]" },
        userEvent: "input.type",
      })
    })
    expect(text()).toBe(`${intro}[[ideia nova]]`)
    expect(
      await screen.findByTitle("Nota ainda não existe · Ctrl+clique para criar")
    ).toHaveTextContent("[[ideia nova]]")
  })

  it("dentro de bloco de código não sugere nada", async () => {
    const view = editorView()
    act(() => {
      view.dispatch({
        changes: { from: view.state.doc.length, insert: "```\n[[depl" },
        selection: { anchor: view.state.doc.length + 10 },
        userEvent: "input.type",
      })
      startCompletion(view)
    })
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(currentCompletions(view.state)).toEqual([])
  })
})
