import { EditorView } from "@codemirror/view"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { NoteEditor } from "../components/note-editor"
import { useNoteStore } from "../note.store"

const infra = [
  "Deploy: [[deploy]]",
  "Nova: [[ideia nova]]",
  "Util: [[util]]",
  "Mapa: [[mapa.canvas]]",
  "Outras: [[Deploy|como publicar]] [[deploy.md]]",
  "Código: `[[deploy]]`",
  "```",
  "[[deploy]]",
  "```",
  "Vazio: [[]] [[#Seção]]",
  "",
].join("\n")

const titles = {
  valid: "Ctrl+clique para abrir",
  pending: "Nota ainda não existe · Ctrl+clique para criar",
  broken: "Nota excluída · Ctrl+clique para ver opções",
  ambiguous: "Mais de uma nota com esse nome · Ctrl+clique para escolher",
  file: "Arquivo que não é nota",
}

let memory: MemoryVaultSession
const vault = () => useVaultStore.getState()
const onFollowLink = vi.fn()

beforeEach(async () => {
  onFollowLink.mockReset()
  useNoteStore.getState().close()
  memory = createMemoryVaultSession(
    {
      "infra.md": infra,
      "deploy.md": "# Deploy\n",
      "backend/util.md": "",
      "frontend/util.md": "",
      "backend/api.md": "",
      "servicos.md": "Serviço: [[api]]\n",
      "mapa.canvas": "{}",
    },
    { lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" } }
  )
  await vault().restore(memory)
  await waitForIndex()
  await useNoteStore.getState().open("infra.md")
  render(<NoteEditor onFollowLink={onFollowLink} />)
})

const texts = (title: string) =>
  screen.queryAllByTitle(title).map((element) => element.textContent)

function editorView() {
  const content = screen.getByRole("textbox", { name: "Conteúdo da nota" })
  const view = EditorView.findFromDOM(
    content.closest(".cm-editor") as HTMLElement
  )
  if (!view) throw new Error("The editor is not mounted")
  return view
}

async function pressModEnterAt(position: number) {
  const view = editorView()
  act(() => {
    view.focus()
    view.dispatch({ selection: { anchor: position } })
  })
  await userEvent.setup().keyboard("{Control>}{Enter}{/Control}")
}

describe("links no editor", () => {
  it("CA-LINK-002-01 — link pendente tem aparência diferente do válido, e o estado também está na dica", async () => {
    await expect
      .poll(() => texts(titles.valid))
      .toEqual(["[[deploy]]", "[[Deploy|como publicar]]", "[[deploy.md]]"])
    expect(texts(titles.pending)).toEqual(["[[ideia nova]]"])
    const valid = screen.getAllByTitle(titles.valid)[0]
    const pending = screen.getByTitle(titles.pending)
    expect(valid.className).not.toBe(pending.className)
  })

  it("CA-LINK-003-01 — link para nome repetido aparece como ambíguo, diferente de válido e de pendente", async () => {
    await expect.poll(() => texts(titles.ambiguous)).toEqual(["[[util]]"])
    const ambiguous = screen.getByTitle(titles.ambiguous)
    expect(ambiguous.className).not.toBe(
      screen.getAllByTitle(titles.valid)[0].className
    )
    expect(ambiguous.className).not.toBe(
      screen.getByTitle(titles.pending).className
    )
  })

  it("link para canvas aparece como arquivo", async () => {
    await expect.poll(() => texts(titles.file)).toEqual(["[[mapa.canvas]]"])
  })

  it("CA-LINK-006-01 — renomear para um nome repetido reescreve [[api]] para [[backend/api]], que continua válido", async () => {
    await act(() => useNoteStore.getState().open("servicos.md"))
    await expect.poll(() => texts(titles.valid)).toEqual(["[[api]]"])
    await act(() => vault().renameEntry("frontend/util.md", "api"))
    await expect
      .poll(() => editorView().state.doc.toString())
      .toBe("Serviço: [[backend/api]]\n")
    await expect.poll(() => texts(titles.valid)).toEqual(["[[backend/api]]"])
    expect(texts(titles.ambiguous)).toEqual([])
  })

  it("link dentro de código e destino vazio não são destacados", async () => {
    await expect.poll(() => texts(titles.valid)).toHaveLength(3)
    const all = Object.values(titles).flatMap(texts)
    expect(all).toHaveLength(6)
    expect(all).not.toContain("[[]]")
    expect(all).not.toContain("[[#Seção]]")
  })

  it("CA-LINK-002-02 — excluir a nota de destino faz o link aparecer como quebrado, sem reabrir", async () => {
    await expect.poll(() => texts(titles.valid)).toHaveLength(3)
    await act(() => vault().deleteEntry("deploy.md"))
    await expect
      .poll(() => texts(titles.broken))
      .toEqual(["[[deploy]]", "[[Deploy|como publicar]]", "[[deploy.md]]"])
    expect(editorView().state.doc.toString()).toBe(infra)
  })

  it("CA-LINK-002-05 — a nota recriada faz o link voltar a válido", async () => {
    await act(() => vault().deleteEntry("deploy.md"))
    await expect.poll(() => texts(titles.broken)).toHaveLength(3)
    await act(() => vault().recreateNote("deploy.md"))
    await expect.poll(() => texts(titles.valid)).toHaveLength(3)
    expect(texts(titles.broken)).toEqual([])
  })

  it("[novo] US1-9 — nota criada por outra ferramenta faz o pendente virar válido sem reabrir", async () => {
    await expect.poll(() => texts(titles.pending)).toEqual(["[[ideia nova]]"])
    await act(() =>
      memory.simulateExternal({ kind: "created", path: "ideia nova.md" }, "")
    )
    await expect.poll(() => texts(titles.pending)).toEqual([])
    expect(texts(titles.valid)).toContain("[[ideia nova]]")
  })

  it("Mod-Enter dentro de um link segue o link a partir da nota aberta", async () => {
    await pressModEnterAt(infra.indexOf("[[deploy]]") + 4)
    expect(onFollowLink).toHaveBeenCalledWith(
      expect.objectContaining({ target: "deploy", subpath: "" }),
      "infra.md"
    )
  })

  it("Mod-Enter fora de link não segue nada e mantém o comportamento padrão da tecla", async () => {
    await pressModEnterAt(0)
    expect(onFollowLink).not.toHaveBeenCalled()
    expect(editorView().state.doc.lines).toBeGreaterThan(
      infra.split("\n").length
    )
  })
})
