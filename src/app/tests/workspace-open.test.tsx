import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Toaster } from "sonner"
import { beforeEach, describe, expect, it } from "vitest"
import { useNoteStore } from "@/features/editor"
import { useVaultStore } from "@/features/vault"
import { demoVault } from "@/mocks/demo-vault"
import {
  createMemoryVaultSession,
  type MemoryVaultOptions,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { Workspace } from "../workspace"

function renderWorkspace(options: MemoryVaultOptions = {}) {
  const session = createMemoryVaultSession(demoVault, options)
  render(
    <>
      <Workspace session={session} />
      <Toaster />
    </>
  )
  return session
}

const lastOpened = {
  root: memoryVaultRoot,
  name: "vault-teste",
  lastOpenedAt: "2026-09-29T10:00:00Z",
}
const tree = () =>
  screen.findByRole("navigation", { name: "Arquivos do vault" })

/* Stores are app-wide singletons; each test starts from a fresh app. */
beforeEach(() => {
  useNoteStore.getState().close()
  useVaultStore.setState({
    status: "loading",
    ref: null,
    entries: [],
    vault: null,
    linkIndex: null,
  })
})

describe("abrir o vault", () => {
  it("[novo] US1-1 — sem vault, pede uma pasta; ao escolher, a árvore mostra pastas, notas e canvas", async () => {
    const user = userEvent.setup()
    renderWorkspace()
    expect(
      await screen.findByRole("heading", {
        name: "Escolha uma pasta para começar",
      })
    ).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Abrir pasta" }))
    const items = within(
      await screen.findByRole("navigation", { name: "Arquivos do vault" })
    )
    expect(items.getByRole("button", { name: "backend" })).toBeVisible()
    expect(items.getByRole("button", { name: "infra" })).toBeVisible()
    expect(items.getByRole("button", { name: "mapa.canvas" })).toBeVisible()
  })

  it("[novo] US1-2 — com um vault aberto antes, ele abre sozinho", async () => {
    renderWorkspace({ lastOpened })
    expect(
      await within(
        await screen.findByRole("navigation", { name: "Arquivos do vault" })
      ).findByRole("button", { name: "deploy" })
    ).toBeVisible()
    expect(screen.getByText("vault-teste")).toBeVisible()
    expect(
      screen.getByRole("heading", { name: "Selecione ou crie uma nota" })
    ).toBeVisible()
  })

  it("vault inacessível mostra o aviso e oferece outra pasta", async () => {
    const user = userEvent.setup()
    renderWorkspace({
      lastOpened: { root: "/sumiu", name: "sumiu", lastOpenedAt: "" },
    })
    expect(
      await screen.findByRole("heading", {
        name: "Não foi possível abrir o vault",
      })
    ).toBeVisible()
    await user.click(
      screen.getByRole("button", { name: "Escolher outra pasta" })
    )
    expect(
      await screen.findByRole("navigation", { name: "Arquivos do vault" })
    ).toBeVisible()
  })

  it("fora do app desktop e fora do dev:mock, avisa que precisa do app desktop", async () => {
    render(<Workspace />)
    expect(
      await screen.findByRole("heading", {
        name: "O Dev Notes precisa rodar como app desktop",
      })
    ).toBeVisible()
  })

  it("item de canvas aparece desabilitado, com dica, e clicar não abre nada", async () => {
    const user = userEvent.setup()
    renderWorkspace({ lastOpened })
    const canvas = await within(
      await screen.findByRole("navigation", { name: "Arquivos do vault" })
    ).findByRole("button", { name: "mapa.canvas" })
    expect(canvas).toHaveAttribute("aria-disabled", "true")
    await user.hover(canvas.parentElement as HTMLElement)
    expect(
      await screen.findByText("Abrir canvas ainda não está disponível")
    ).toBeInTheDocument()
    await user.click(canvas)
    expect(
      screen.getByRole("heading", { name: "Selecione ou crie uma nota" })
    ).toBeVisible()
  })

  it("abrir uma nota mostra o editor com o nome dela", async () => {
    const user = userEvent.setup()
    renderWorkspace({ lastOpened })
    await user.click(
      await within(await tree()).findByRole("button", { name: "deploy" })
    )
    expect(await screen.findByRole("region", { name: "deploy" })).toBeVisible()
    expect(
      screen.getByRole("textbox", { name: "Conteúdo da nota" })
    ).toHaveTextContent("Passo a passo do deploy.")
  })
})
