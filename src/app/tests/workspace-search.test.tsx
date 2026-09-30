import { EditorView } from "@codemirror/view"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { useNoteStore } from "@/features/editor"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { Workspace } from "../workspace"

let memory: MemoryVaultSession

beforeEach(async () => {
  useNoteStore.getState().close()
  useVaultStore.setState({ status: "loading", entries: [], vault: null })
  memory = createMemoryVaultSession(
    {
      "deploy.md": "# Deploy\n",
      "infra.md": "# Infra\n\nOntem o deploy falhou.\n",
    },
    { lastOpened: { root: memoryVaultRoot, name: "vault", lastOpenedAt: "" } }
  )
  render(<Workspace session={memory} />)
  await screen.findByRole("navigation", { name: "Arquivos do vault" })
  await waitForIndex()
})

const tree = () => screen.getByRole("navigation", { name: "Arquivos do vault" })

/** Types the keys and tells whether the app blocked the browser's default (research R11). */
async function press(keys: string) {
  const blocked: boolean[] = []
  /* Same target and phase as the app's listener, registered later: it runs after it. */
  const listen = (event: KeyboardEvent) => {
    if (event.ctrlKey) blocked.push(event.defaultPrevented)
  }
  window.addEventListener("keydown", listen, { capture: true })
  await userEvent.setup().keyboard(keys)
  window.removeEventListener("keydown", listen, { capture: true })
  return blocked.includes(true)
}

const ctrlP = "{Control>}p{/Control}"

async function quickOpen(name: string) {
  await press(ctrlP)
  const user = userEvent.setup()
  await user.type(await screen.findByPlaceholderText("Nome da nota"), name)
  await user.keyboard("{Enter}")
  await screen.findByRole("region", { name })
}

describe("busca rápida no workspace", () => {
  it("Ctrl+P abre a busca rápida e impede a impressão do navegador", async () => {
    expect(await press(ctrlP)).toBe(true)
    expect(await screen.findByPlaceholderText("Nome da nota")).toBeVisible()
  })

  it("o botão abre a busca rápida e mostra o atalho", async () => {
    const user = userEvent.setup()
    const button = screen.getByRole("button", { name: "Abrir nota pelo nome" })
    await user.hover(button)
    expect(await screen.findByText("Ctrl+P")).toBeVisible()
    await user.click(button)
    expect(await screen.findByPlaceholderText("Nome da nota")).toBeVisible()
  })

  it("escolher uma nota a abre no editor", async () => {
    await quickOpen("infra")
    expect(screen.queryByPlaceholderText("Nome da nota")).toBeNull()
  })

  it("a edição pendente da nota atual é gravada antes de abrir outra", async () => {
    await userEvent
      .setup()
      .click(within(tree()).getByRole("button", { name: "deploy" }))
    await screen.findByRole("region", { name: "deploy" })
    act(() => useNoteStore.getState().edit("# Deploy\n\neditado\n"))
    await quickOpen("infra")
    expect(memory.files()["deploy.md"]).toBe("# Deploy\n\neditado\n")
  })
})

function cursor() {
  const content = screen.getByRole("textbox", { name: "Conteúdo da nota" })
  const view = EditorView.findFromDOM(
    content.closest(".cm-editor") as HTMLElement
  )
  if (!view) throw new Error("The editor is not mounted")
  return view.state.selection.main.head
}

const tab = (name: string) => screen.getByRole("tab", { name })
const searchField = () =>
  screen.getByRole("combobox", { name: "Buscar nas notas" })

describe("busca completa no workspace", () => {
  it("abas Arquivos e Busca, com o atalho no tooltip", async () => {
    const user = userEvent.setup()
    expect(tab("Arquivos")).toHaveAttribute("aria-selected", "true")
    await user.hover(tab("Busca"))
    expect(await screen.findByText("Ctrl+Shift+F")).toBeVisible()
    await user.click(tab("Busca"))
    expect(tab("Busca")).toHaveAttribute("aria-selected", "true")
    expect(searchField()).toBeVisible()
  })

  it("Ctrl+Shift+F mostra a busca com foco no campo; Ctrl+Shift+E volta à árvore", async () => {
    expect(await press("{Control>}{Shift>}F{/Shift}{/Control}")).toBe(true)
    await expect.poll(() => document.activeElement).toBe(searchField())
    await press("{Control>}{Shift>}E{/Shift}{/Control}")
    await expect
      .poll(() => tab("Arquivos").getAttribute("aria-selected"))
      .toBe("true")
    expect(tree()).toBeVisible()
  })

  it("escolher um trecho abre a nota no editor com o cursor na ocorrência", async () => {
    const user = userEvent.setup()
    await user.click(tab("Busca"))
    await user.type(searchField(), "falhou")
    await user.click(
      await screen.findByRole("button", { name: /Ontem o deploy falhou/ })
    )
    await screen.findByRole("region", { name: "infra" })
    await expect
      .poll(cursor)
      .toBe("# Infra\n\nOntem o deploy falhou.\n".indexOf("falhou"))
  })

  it("trocar de aba mantém a consulta", async () => {
    const user = userEvent.setup()
    await user.click(tab("Busca"))
    await user.type(searchField(), "deploy")
    await user.click(tab("Arquivos"))
    expect(tree()).toBeVisible()
    await user.click(tab("Busca"))
    expect(searchField()).toHaveValue("deploy")
  })
})
