import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Toaster, toast } from "sonner"
import { beforeEach, describe, expect, it } from "vitest"
import { AppShell } from "@/shared/components/app-shell"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { VaultTree } from "../components/vault-tree"
import { useVaultStore, waitForIndex } from "../vault.store"

const seed = {
  "infra.md": "Deploy: [[deploy]]",
  "deploy.md": "# deploy",
  "rascunhos/a.md": "",
  "rascunhos/b.md": "",
  "rascunhos/sub/c.md": "",
  "vazia/.gitkeep": "",
  "mista/a.md": "",
  "mista/b.md": "",
  "mista/logo.png": "png",
}

let memory: MemoryVaultSession

beforeEach(async () => {
  toast.dismiss()
  memory = createMemoryVaultSession(seed, {
    lastOpened: { root: memoryVaultRoot, name: "vault", lastOpenedAt: "" },
  })
  await useVaultStore.getState().restore(memory)
  await waitForIndex()
  render(
    <>
      <AppShell sidebarHeader={null} sidebar={null}>
        <VaultTree activePath={null} onOpenNote={() => {}} />
      </AppShell>
      <Toaster />
    </>
  )
})

async function askToDelete(name: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: `Ações de ${name}` }))
  await user.click(await screen.findByRole("menuitem", { name: /Excluir/ }))
  return { user, dialog: await screen.findByRole("alertdialog") }
}

const tree = () => screen.getByRole("navigation", { name: "Arquivos do vault" })

describe("excluir", () => {
  it("CA-NOTA-001-01 — excluir e confirmar manda a nota para a lixeira e a tira da árvore", async () => {
    const { user, dialog } = await askToDelete("deploy")
    expect(within(dialog).getByText("Excluir “deploy”?")).toBeVisible()
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }))
    await expect.poll(() => memory.trash.removed).toEqual(["deploy.md"])
    expect(within(tree()).queryByRole("button", { name: "deploy" })).toBeNull()
  })

  it("CA-NOTA-001-02 — cancelar não altera nada", async () => {
    const { user, dialog } = await askToDelete("deploy")
    expect(
      within(dialog).getByRole("button", { name: "Cancelar" })
    ).toHaveFocus()
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }))
    expect(memory.trash.removed).toEqual([])
    expect(memory.files()).toEqual(seed)
  })

  it("CA-NOTA-001-03 — lixeira indisponível bloqueia a exclusão e avisa", async () => {
    memory.trash.setAvailable(false)
    const { user, dialog } = await askToDelete("deploy")
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }))
    expect(
      await screen.findByText(
        "A lixeira do sistema não está disponível. Nada foi excluído; você pode excluir pelo gerenciador de arquivos."
      )
    ).toBeInTheDocument()
    expect(memory.files()["deploy.md"]).toBe("# deploy")
    expect(within(tree()).getByRole("button", { name: "deploy" })).toBeVisible()
  })

  it("CA-NOTA-003-01 — o link continua no texto e fica sem destino", async () => {
    const { user, dialog } = await askToDelete("deploy")
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }))
    await expect.poll(() => memory.trash.removed).toEqual(["deploy.md"])
    expect(memory.files()["infra.md"]).toBe(seed["infra.md"])
    expect(
      useVaultStore.getState().linkIndex?.resolve({ target: "deploy" })
    ).toEqual({
      status: "broken",
    })
  })

  it("CA-NOTA-009-01 — a pasta com 3 notas informa a quantidade e vai inteira para a lixeira", async () => {
    const { user, dialog } = await askToDelete("rascunhos")
    expect(
      within(dialog).getByText("3 notas irão para a lixeira do sistema.")
    ).toBeVisible()
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }))
    await expect.poll(() => memory.trash.removed).toEqual(["rascunhos"])
    expect(memory.files()["rascunhos/sub/c.md"]).toBeUndefined()
  })

  it("CA-NOTA-009-02 — cancelar a exclusão da pasta não altera nada", async () => {
    const { user, dialog } = await askToDelete("rascunhos")
    await user.keyboard("{Escape}")
    expect(dialog).not.toBeInTheDocument()
    expect(memory.files()).toEqual(seed)
  })

  it("pasta sem notas avisa que não contém notas", async () => {
    const { dialog } = await askToDelete("vazia")
    expect(within(dialog).getByText("A pasta não contém notas.")).toBeVisible()
  })

  it("pasta com 2 notas e 1 imagem informa as duas quantidades", async () => {
    const { dialog } = await askToDelete("mista")
    expect(
      within(dialog).getByText(
        "2 notas e 1 outro arquivo irão para a lixeira do sistema."
      )
    ).toBeVisible()
  })

  it("Delete no item focado abre a confirmação", async () => {
    const user = userEvent.setup()
    within(tree()).getByRole("button", { name: "deploy" }).focus()
    await user.keyboard("{Delete}")
    expect(await screen.findByRole("alertdialog")).toBeVisible()
  })
})
