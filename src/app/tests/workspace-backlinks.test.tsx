import { EditorView } from "@codemirror/view"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { useNoteStore } from "@/features/editor"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { Workspace } from "../workspace"

const infra = "Deploy: [[deploy]]\n\nDe novo: [[deploy]]\n"

beforeEach(async () => {
  useNoteStore.getState().close()
  useVaultStore.setState({ status: "loading", entries: [], vault: null })
  const memory = createMemoryVaultSession(
    { "deploy.md": "# Deploy\n", "infra.md": infra },
    { lastOpened: { root: memoryVaultRoot, name: "vault", lastOpenedAt: "" } }
  )
  render(<Workspace session={memory} />)
  await screen.findByRole("navigation", { name: "Arquivos do vault" })
  await waitForIndex()
})

const tree = () => screen.getByRole("navigation", { name: "Arquivos do vault" })
const panel = () => screen.queryByRole("region", { name: "Backlinks" })

async function openNote(name: string) {
  await userEvent.setup().click(within(tree()).getByRole("button", { name }))
  await screen.findByRole("region", { name })
}

function cursor() {
  const content = screen.getByRole("textbox", { name: "Conteúdo da nota" })
  const view = EditorView.findFromDOM(
    content.closest(".cm-editor") as HTMLElement
  )
  if (!view) throw new Error("The editor is not mounted")
  return view.state.selection.main.head
}

describe("painel de backlinks no workspace", () => {
  it("sem nota aberta, não há painel", () => {
    expect(panel()).toBeNull()
  })

  it("CA-BACK-001-02 — escolher o segundo trecho abre a nota que aponta no segundo link", async () => {
    await openNote("deploy")
    const second = await within(panel() as HTMLElement).findByRole("button", {
      name: /De novo: \[\[deploy\]\]/,
    })
    await userEvent.setup().click(second)
    await screen.findByRole("region", { name: "infra" })
    await expect.poll(cursor).toBe(infra.lastIndexOf("[[deploy]]"))
  })

  it("Ctrl+Shift+B esconde e mostra o painel", async () => {
    const user = userEvent.setup()
    await openNote("deploy")
    expect(panel()).not.toBeNull()
    await user.keyboard("{Control>}{Shift>}B{/Shift}{/Control}")
    await expect.poll(panel).toBeNull()
    await user.keyboard("{Control>}{Shift>}B{/Shift}{/Control}")
    await expect.poll(panel).not.toBeNull()
  })

  it("o botão do cabeçalho do editor alterna o painel", async () => {
    const user = userEvent.setup()
    await openNote("deploy")
    const editor = screen.getByRole("region", { name: "deploy" })
    await user.click(
      within(editor).getByRole("button", { name: "Esconder backlinks" })
    )
    await expect.poll(panel).toBeNull()
    await user.click(
      within(editor).getByRole("button", { name: "Mostrar backlinks" })
    )
    await expect.poll(panel).not.toBeNull()
  })
})
