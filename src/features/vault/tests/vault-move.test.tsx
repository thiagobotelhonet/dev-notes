import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Toaster, toast } from "sonner"
import { describe, expect, it } from "vitest"
import { AppShell } from "@/shared/components/app-shell"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { VaultTree } from "../components/vault-tree"
import { useVaultStore, waitForIndex } from "../vault.store"

const canvas = JSON.stringify({
  nodes: [
    {
      id: "n1",
      type: "file",
      file: "backend/api.md",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
  ],
  edges: [],
})

let memory: MemoryVaultSession

async function openTree(seed: Record<string, string>) {
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
}

const tree = () => screen.getByRole("navigation", { name: "Arquivos do vault" })

async function moveTo(name: string, folder: string, expand: string[] = []) {
  const user = userEvent.setup()
  for (const parent of expand)
    await user.click(
      await within(tree()).findByRole("button", { name: parent })
    )
  await user.click(
    await screen.findByRole("button", { name: `Ações de ${name}` })
  )
  await user.click(await screen.findByRole("menuitem", { name: /Mover para/ }))
  const dialog = await screen.findByRole("dialog")
  await user.click(within(dialog).getByRole("option", { name: folder }))
}

const baseSeed = {
  "infra.md": "API: [[backend/api]]",
  "backend/api.md": "# api",
  "servicos/readme.md": "",
  "mapa.canvas": canvas,
}

describe("mover", () => {
  it("CA-NOTA-010-01 — mover atualiza o link; nome que fica único usa só o nome", async () => {
    await openTree(baseSeed)
    await moveTo("api", "servicos", ["backend"])
    await expect.poll(() => memory.files()["servicos/api.md"]).toBe("# api")
    await expect.poll(() => memory.files()["infra.md"]).toBe("API: [[api]]")
  })

  it("CA-NOTA-010-01 — nome que continua repetido usa pasta/nome", async () => {
    await openTree({ ...baseSeed, "legado/api.md": "" })
    await moveTo("api", "servicos", ["backend"])
    await expect
      .poll(() => memory.files()["infra.md"])
      .toBe("API: [[servicos/api]]")
  })

  it("[novo] CA-NOTA-010-02 — o cartão do canvas passa a apontar para servicos/api.md", async () => {
    await openTree(baseSeed)
    await moveTo("api", "servicos", ["backend"])
    await expect
      .poll(() => JSON.parse(memory.files()["mapa.canvas"]).nodes[0].file)
      .toBe("servicos/api.md")
  })

  it("[novo] CA-NOTA-010-03 — nota de nome único movida mantém [[deploy]]", async () => {
    await openTree({
      "deploy.md": "",
      "infra.md": "[[deploy]]",
      "runbooks/x.md": "",
    })
    await moveTo("deploy", "runbooks")
    await expect.poll(() => memory.files()["runbooks/deploy.md"]).toBe("")
    expect(memory.files()["infra.md"]).toBe("[[deploy]]")
  })

  it("CA-NOTA-011-01 — mover para pasta que já tem nota com o mesmo nome é bloqueado", async () => {
    const seed = { ...baseSeed, "servicos/api.md": "outra" }
    await openTree(seed)
    await moveTo("api", "servicos", ["backend"])
    expect(
      await screen.findByText("Já existe uma nota chamada “api” em servicos.")
    ).toBeInTheDocument()
    expect(memory.files()).toEqual(seed)
  })

  it("FR-018 — mover pasta leva as notas e atualiza os links de todas", async () => {
    await openTree(baseSeed)
    await moveTo("backend", "servicos")
    await expect
      .poll(() => memory.files()["servicos/backend/api.md"])
      .toBe("# api")
    await expect.poll(() => memory.files()["infra.md"]).toBe("API: [[api]]")
  })

  it("mover pasta para um destino com pasta de mesmo nome (só maiúsculas) é bloqueado", async () => {
    const seed = { ...baseSeed, "servicos/Backend/x.md": "" }
    await openTree(seed)
    await moveTo("backend", "servicos")
    expect(
      await screen.findByText(
        "Já existe uma pasta chamada “Backend” em servicos."
      )
    ).toBeInTheDocument()
    expect(memory.files()).toEqual(seed)
  })

  it("pasta não pode ir para dentro dela mesma", async () => {
    await openTree({ ...baseSeed, "backend/sub/y.md": "" })
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Ações de backend" }))
    await user.click(
      await screen.findByRole("menuitem", { name: /Mover para/ })
    )
    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).queryByRole("option", { name: "backend/sub" })
    ).toBeNull()
    await expect(
      useVaultStore.getState().moveEntry("backend", "backend/sub")
    ).rejects.toThrow("Uma pasta não pode ir para dentro dela mesma.")
  })

  it("mover para a própria pasta não faz nada", async () => {
    await openTree(baseSeed)
    await useVaultStore.getState().moveEntry("backend/api.md", "backend")
    expect(memory.files()).toEqual(baseSeed)
  })
})
