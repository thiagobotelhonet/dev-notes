import { EditorView } from "@codemirror/view"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Toaster, toast } from "sonner"
import { beforeEach, describe, expect, it } from "vitest"
import { useNoteStore } from "@/features/editor"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { Workspace } from "../workspace"

const infra = [
  "Deploy: [[deploy]]",
  "Rollback: [[deploy#Rollback]]",
  "Sem seção: [[deploy#Seção inexistente]]",
  "Mapa: [[mapa.canvas]]",
  "Nova: [[ideia nova]]",
  "Inválido: [[a:b]]",
  "Repetido: [[util]]",
  "",
].join("\n")
const deploy = "# Deploy\n\nPasso a passo.\n\n## Rollback\n\nVoltar.\n"

let memory: MemoryVaultSession
const note = () => useNoteStore.getState()
const tree = () => screen.getByRole("navigation", { name: "Arquivos do vault" })

beforeEach(async () => {
  toast.dismiss()
  note().close()
  useVaultStore.setState({ status: "loading", entries: [], vault: null })
  memory = createMemoryVaultSession(
    {
      "infra.md": infra,
      "deploy.md": deploy,
      "mapa.canvas": "{}",
      "backend/util.md": "# Util do backend\n",
      "frontend/util.md": "# Util do frontend\n",
    },
    { lastOpened: { root: memoryVaultRoot, name: "vault", lastOpenedAt: "" } }
  )
  render(
    <>
      <Workspace session={memory} />
      <Toaster />
    </>
  )
  await screen.findByRole("navigation", { name: "Arquivos do vault" })
  await waitForIndex()
  await userEvent
    .setup()
    .click(within(tree()).getByRole("button", { name: "infra" }))
  await screen.findByRole("region", { name: "infra" })
})

function editorView() {
  const content = screen.getByRole("textbox", { name: "Conteúdo da nota" })
  const view = EditorView.findFromDOM(
    content.closest(".cm-editor") as HTMLElement
  )
  if (!view) throw new Error("The editor is not mounted")
  return view
}

/** jsdom has no layout, so the link is followed by keyboard (research R10). */
async function followLinkAt(text: string) {
  const view = editorView()
  const position = view.state.doc.toString().indexOf(text) + 3
  act(() => view.dispatch({ selection: { anchor: position } }))
  act(() => view.focus())
  await userEvent.setup().keyboard("{Control>}{Enter}{/Control}")
}

describe("seguir link no workspace", () => {
  it("CA-LINK-004-01 — seguir [[deploy]] abre a nota deploy", async () => {
    await followLinkAt("[[deploy]]")
    expect(await screen.findByRole("region", { name: "deploy" })).toBeVisible()
    expect(note().path).toBe("deploy.md")
  })

  it("CA-LINK-004-03 — seguir [[deploy#Rollback]] abre deploy no título Rollback", async () => {
    await followLinkAt("[[deploy#Rollback]]")
    await screen.findByRole("region", { name: "deploy" })
    await expect
      .poll(() => editorView().state.selection.main.head)
      .toBe(deploy.indexOf("## Rollback"))
  })

  it("seção inexistente abre a nota no início, sem erro", async () => {
    await followLinkAt("[[deploy#Seção inexistente]]")
    await screen.findByRole("region", { name: "deploy" })
    expect(editorView().state.selection.main.head).toBe(0)
  })

  it("CA-LINK-002-04 — link quebrado pergunta antes; Cancelar não cria nada e Recriar nota cria e abre", async () => {
    const user = userEvent.setup()
    await act(() => useVaultStore.getState().deleteEntry("deploy.md"))
    await followLinkAt("[[deploy]]")
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("“deploy” foi excluída")).toBeVisible()
    expect(
      within(dialog).getByText(
        "A nota pode ser restaurada pela lixeira do sistema, ou recriada vazia."
      )
    ).toBeVisible()
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))
    expect(memory.files()["deploy.md"]).toBeUndefined()
    expect(note().path).toBe("infra.md")

    await followLinkAt("[[deploy]]")
    await user.click(
      await screen.findByRole("button", { name: "Recriar nota" })
    )
    expect(await screen.findByRole("region", { name: "deploy" })).toBeVisible()
    expect(memory.files()["deploy.md"]).toBe("")
  })

  it("[FR-012] a edição pendente da nota atual é gravada antes de abrir o destino", async () => {
    act(() => note().edit(`${infra}editado\n`))
    await followLinkAt("[[deploy]]")
    await screen.findByRole("region", { name: "deploy" })
    expect(memory.files()["infra.md"]).toBe(`${infra}editado\n`)
  })

  it("link para canvas avisa que abrir canvas ainda não está disponível", async () => {
    await followLinkAt("[[mapa.canvas]]")
    expect(
      await screen.findByText("Abrir canvas ainda não está disponível.")
    ).toBeVisible()
    expect(note().path).toBe("infra.md")
  })
})

describe("criar nota pelo link pendente", () => {
  it("CA-LINK-001-01 — seguir o link pendente cria a nota, abre e avisa onde ela nasceu", async () => {
    const user = userEvent.setup()
    await followLinkAt("[[ideia nova]]")
    expect(
      await screen.findByRole("region", { name: "ideia nova" })
    ).toBeVisible()
    expect(memory.files()["ideia nova.md"]).toBe("")
    expect(
      await screen.findByText("Nota “ideia nova” criada em raiz.")
    ).toBeVisible()
    await user.click(within(tree()).getByRole("button", { name: "infra" }))
    await screen.findByRole("region", { name: "infra" })
    await expect
      .poll(() => screen.getByText("[[ideia nova]]").title)
      .toBe("Ctrl+clique para abrir")
  })

  it("CA-LINK-001-03 — nome inválido não cria nada e diz o motivo", async () => {
    const before = memory.files()
    await followLinkAt("[[a:b]]")
    expect(
      await screen.findByText(
        "Não foi possível criar a nota: não use o caractere :."
      )
    ).toBeVisible()
    expect(memory.files()).toEqual(before)
    expect(note().path).toBe("infra.md")
  })
})

describe("link ambíguo", () => {
  it("CA-LINK-003-02 — o diálogo mostra as duas notas, nada abre antes da escolha e a escolhida abre", async () => {
    const user = userEvent.setup()
    await followLinkAt("[[util]]")
    const dialog = await screen.findByRole("dialog", {
      name: "Qual nota abrir?",
    })
    expect(dialog).toHaveAccessibleDescription(
      "Existe mais de uma nota chamada “util”."
    )
    const options = within(dialog).getAllByRole("option")
    expect(options.map((option) => option.textContent)).toEqual([
      "utilbackend",
      "utilfrontend",
    ])
    expect(note().path).toBe("infra.md")
    await user.click(options[1])
    await expect.poll(() => note().path).toBe("frontend/util.md")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("Esc fecha a escolha sem abrir nada", async () => {
    const user = userEvent.setup()
    await followLinkAt("[[util]]")
    await screen.findByRole("dialog", { name: "Qual nota abrir?" })
    await user.keyboard("{Escape}")
    await expect.poll(() => screen.queryByRole("dialog")).toBeNull()
    expect(note().path).toBe("infra.md")
  })
})
