import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppShell } from "@/shared/components/app-shell"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
} from "@/shared/vault/adapters/memory/memory-vault"
import { VaultTree } from "../components/vault-tree"
import { useVaultStore } from "../vault.store"

const seed = {
  "infra.md": "[[deploy]]",
  "backend/api.md": "# api",
  "backend/Sem título.md": "",
}

let memory: MemoryVaultSession

async function renderTree(onOpenNote = vi.fn()) {
  await useVaultStore.getState().restore(memory)
  render(
    <AppShell sidebarHeader={null} sidebar={null}>
      <VaultTree activePath={null} onOpenNote={onOpenNote} />
    </AppShell>
  )
  return onOpenNote
}

async function openFolderMenu(
  user: ReturnType<typeof userEvent.setup>,
  name: string
) {
  await user.click(screen.getByRole("button", { name: `Ações de ${name}` }))
}

beforeEach(() => {
  memory = createMemoryVaultSession(seed, {
    lastOpened: { root: "/memory-vault", name: "vault", lastOpenedAt: "" },
  })
})

describe("criar nota e pasta", () => {
  it("[novo] US1-3 — criar nota numa pasta grava o .md na pasta e pede para abri-la", async () => {
    const user = userEvent.setup()
    const onOpenNote = await renderTree()
    await openFolderMenu(user, "backend")
    await user.click(await screen.findByRole("menuitem", { name: /Nova nota/ }))
    await vi.waitFor(() =>
      expect(onOpenNote).toHaveBeenCalledWith("backend/Sem título 2.md")
    )
    expect(memory.files()["backend/Sem título 2.md"]).toBe("")
  })

  it("nota nova na raiz se chama Sem título", async () => {
    const user = userEvent.setup()
    const onOpenNote = await renderTree()
    await user.click(
      screen.getByRole("button", { name: "Ações da raiz do vault" })
    )
    await user.click(await screen.findByRole("menuitem", { name: /Nova nota/ }))
    await vi.waitFor(() =>
      expect(onOpenNote).toHaveBeenCalledWith("Sem título.md")
    )
  })

  it("[novo] US1-5 — criar pasta grava no disco e aparece na árvore", async () => {
    const user = userEvent.setup()
    await renderTree()
    await user.click(
      screen.getByRole("button", { name: "Ações da raiz do vault" })
    )
    await user.click(
      await screen.findByRole("menuitem", { name: /Nova pasta/ })
    )
    const field = await screen.findByRole("textbox", {
      name: "Nome da nova pasta",
    })
    await user.type(field, "servicos{Enter}")
    const tree = screen.getByRole("navigation", { name: "Arquivos do vault" })
    expect(
      await within(tree).findByRole("button", { name: "servicos" })
    ).toBeVisible()
    expect(
      await memory
        .open("/memory-vault")
        .then((v) => v.storage.exists("servicos"))
    ).toBe(true)
  })

  it("pasta com nome que já existe, inclusive só por maiúsculas, mostra o erro e não cria nada", async () => {
    const user = userEvent.setup()
    await renderTree()
    await user.click(
      screen.getByRole("button", { name: "Ações da raiz do vault" })
    )
    await user.click(
      await screen.findByRole("menuitem", { name: /Nova pasta/ })
    )
    await user.type(
      await screen.findByRole("textbox", { name: "Nome da nova pasta" }),
      "Backend{Enter}"
    )
    expect(
      await screen.findByText(
        "Já existe uma pasta chamada “Backend” em a raiz."
      )
    ).toBeVisible()
    const listed = (await useVaultStore.getState().vault?.storage.list()) ?? []
    expect(listed.filter((entry) => entry.kind === "folder")).toHaveLength(1)
  })

  it("nome inválido mostra o erro no campo e não grava nada", async () => {
    const user = userEvent.setup()
    await renderTree()
    await user.click(
      screen.getByRole("button", { name: "Ações da raiz do vault" })
    )
    await user.click(
      await screen.findByRole("menuitem", { name: /Nova pasta/ })
    )
    const field = await screen.findByRole("textbox", {
      name: "Nome da nova pasta",
    })
    await user.type(field, "a:b{Enter}")
    expect(
      await screen.findByText("Nome inválido: não use o caractere :.")
    ).toBeVisible()
    expect(field).toHaveAttribute("aria-invalid", "true")
    expect(useVaultStore.getState().entries.some((e) => e.path === "a:b")).toBe(
      false
    )
  })

  it("Ctrl+N na pasta focada cria a nota nela", async () => {
    const user = userEvent.setup()
    const onOpenNote = await renderTree()
    const tree = screen.getByRole("navigation", { name: "Arquivos do vault" })
    within(tree).getByRole("button", { name: "backend" }).focus()
    await user.keyboard("{Control>}n{/Control}")
    await vi.waitFor(() =>
      expect(onOpenNote).toHaveBeenCalledWith("backend/Sem título 2.md")
    )
  })
})
