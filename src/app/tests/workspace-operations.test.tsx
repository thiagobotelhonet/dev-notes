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

const seed = {
  "infra.md": "Deploy: [[deploy]]\n",
  "deploy.md": "# Deploy\n",
  "backend/api.md": "# API\n",
  "servicos/readme.md": "",
}

let memory: MemoryVaultSession
const note = () => useNoteStore.getState()
const tree = () => screen.getByRole("navigation", { name: "Arquivos do vault" })
const editorText = () =>
  screen.getByRole("textbox", { name: "Conteúdo da nota" }).textContent

beforeEach(async () => {
  toast.dismiss()
  note().close()
  useVaultStore.setState({ status: "loading", entries: [], vault: null })
  memory = createMemoryVaultSession(seed, {
    lastOpened: { root: memoryVaultRoot, name: "vault", lastOpenedAt: "" },
  })
  render(
    <>
      <Workspace session={memory} />
      <Toaster />
    </>
  )
  await screen.findByRole("navigation", { name: "Arquivos do vault" })
  await waitForIndex()
})

async function openNote(name: string) {
  await userEvent.setup().click(within(tree()).getByRole("button", { name }))
  await screen.findByRole("region", { name })
}

async function rename(name: string, newName: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: `Ações de ${name}` }))
  await user.click(await screen.findByRole("menuitem", { name: /Renomear/ }))
  const field = await screen.findByRole("textbox", {
    name: `Novo nome de ${name}`,
  })
  await user.clear(field)
  await user.type(field, `${newName}{Enter}`)
}

describe("o editor acompanha as operações do vault", () => {
  it("renomear a nota aberta com edição pendente grava antes e mantém a nota aberta no novo caminho", async () => {
    await openNote("deploy")
    act(() => note().edit("# Deploy\n\nnão gravado ainda\n"))
    await rename("deploy", "release")
    await expect.poll(() => note().path).toBe("release.md")
    expect(memory.files()["release.md"]).toBe("# Deploy\n\nnão gravado ainda\n")
    expect(await screen.findByRole("region", { name: "release" })).toBeVisible()
  })

  it("nota aberta cujos links o app reescreve mostra a edição do usuário e o link novo, sem falso conflito (FR-023)", async () => {
    await openNote("infra")
    act(() => note().edit("Deploy: [[deploy]]\nminha linha\n"))
    await rename("deploy", "release")
    await expect.poll(editorText).toContain("[[release]]")
    expect(editorText()).toContain("minha linha")
    expect(memory.files()["infra.md"]).toBe(
      "Deploy: [[release]]\nminha linha\n"
    )
    act(() => note().edit("Deploy: [[release]]\nminha linha\nmais uma\n"))
    await act(() => note().flush())
    await memory.flushEvents()
    expect(note().status).toBe("clean")
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(memory.files()["infra.md"]).toContain("mais uma")
  })

  it("mover a nota aberta atualiza o caminho do editor", async () => {
    await openNote("deploy")
    await act(() => useVaultStore.getState().moveEntry("deploy.md", "servicos"))
    await expect.poll(() => note().path).toBe("servicos/deploy.md")
  })

  it("excluir a nota aberta fecha o editor", async () => {
    const user = userEvent.setup()
    await openNote("deploy")
    await user.click(screen.getByRole("button", { name: "Ações de deploy" }))
    await user.click(await screen.findByRole("menuitem", { name: /Excluir/ }))
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Excluir",
      })
    )
    expect(
      await screen.findByRole("heading", { name: "Selecione ou crie uma nota" })
    ).toBeVisible()
    expect(memory.trash.removed).toEqual(["deploy.md"])
  })

  it("nota aberta excluída fora do app, com edição pendente, oferece recriar", async () => {
    const user = userEvent.setup()
    await openNote("deploy")
    act(() => note().edit("não perca isto"))
    await act(() =>
      memory.simulateExternal({ kind: "removed", path: "deploy.md" })
    )
    expect(
      await screen.findByRole("heading", {
        name: "Esta nota foi excluída fora do Dev Notes",
      })
    ).toBeVisible()
    await user.click(
      screen.getByRole("button", { name: "Recriar com este conteúdo" })
    )
    await expect.poll(() => memory.files()["deploy.md"]).toBe("não perca isto")
  })

  it("nota aberta excluída fora do app, sem edição pendente, não oferece recriar", async () => {
    await openNote("deploy")
    await act(() =>
      memory.simulateExternal({ kind: "removed", path: "deploy.md" })
    )
    expect(
      await screen.findByRole("heading", {
        name: "Esta nota foi excluída fora do Dev Notes",
      })
    ).toBeVisible()
    expect(
      screen.queryByRole("button", { name: "Recriar com este conteúdo" })
    ).toBeNull()
  })

  it("raiz do vault removida com o app aberto mostra o aviso e oferece outra pasta", async () => {
    await act(() => memory.simulateExternal({ kind: "removed", path: "" }))
    expect(
      await screen.findByRole("heading", {
        name: "A pasta do vault não está mais acessível",
      })
    ).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Escolher outra pasta" })
    ).toBeVisible()
  })
})
