import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Toaster, toast } from "sonner"
import { beforeEach, describe, expect, it } from "vitest"
import { planChange } from "@/features/links"
import { AppShell } from "@/shared/components/app-shell"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { VaultTree } from "../components/vault-tree"
import { applyChangePlan } from "../model/vault.operations"
import { useVaultStore, waitForIndex } from "../vault.store"

const canvas = JSON.stringify({
  nodes: [
    {
      id: "n1",
      type: "file",
      file: "deploy.md",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
  ],
  edges: [],
})
const seed = {
  "infra.md": "Deploy: [[deploy]] | API: [[api]] | Util: [[backend/util]]",
  "deploy.md": "# deploy",
  "mapa.canvas": canvas,
  "backend/api.md": "# api",
  "backend/util.md": "# util",
  "frontend/util.md": "# util do front",
  "frontend/tela.md": "",
}

let memory: MemoryVaultSession
const user = () => userEvent.setup()

async function renderTree() {
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

async function expandFolder(name: string) {
  await user().click(within(tree()).getByRole("button", { name }))
}

async function rename(currentName: string, newName: string) {
  const actor = user()
  await actor.click(
    screen.getByRole("button", { name: `Ações de ${currentName}` })
  )
  await actor.click(await screen.findByRole("menuitem", { name: /Renomear/ }))
  const field = await screen.findByRole("textbox", {
    name: `Novo nome de ${currentName}`,
  })
  await actor.clear(field)
  await actor.type(field, `${newName}{Enter}`)
  return field
}

beforeEach(async () => {
  toast.dismiss()
  await renderTree()
})

describe("renomear", () => {
  it("CA-NOTA-004-01 — renomear atualiza links e o cartão do canvas no disco", async () => {
    await rename("deploy", "release")
    expect(
      await screen.findAllByText(/“deploy” agora é “release”/)
    ).not.toHaveLength(0)
    const files = memory.files()
    expect(files["release.md"]).toBe("# deploy")
    expect(files["deploy.md"]).toBeUndefined()
    expect(files["infra.md"]).toContain("Deploy: [[release]]")
    expect(JSON.parse(files["mapa.canvas"]).nodes[0].file).toBe("release.md")
  })

  it("o aviso de sucesso diz quantos links foram atualizados", async () => {
    await rename("deploy", "release")
    expect(
      await screen.findAllByText(
        "“deploy” agora é “release”. 2 links atualizados."
      )
    ).not.toHaveLength(0)
  })

  it.each(["api", "API"])(
    "CA-NOTA-006-01 — renomear backend/util para %s é bloqueado e o disco não muda",
    async (name) => {
      await expandFolder("backend")
      const field = await rename("util", name)
      expect(
        await screen.findByText("Já existe uma nota chamada “api” em backend.")
      ).toBeVisible()
      expect(field).toHaveAttribute("aria-invalid", "true")
      expect(memory.files()).toEqual(seed)
    }
  )

  it("renomear pasta para o nome de uma pasta irmã é bloqueado", async () => {
    await rename("frontend", "Backend")
    expect(
      await screen.findByText(
        "Já existe uma pasta chamada “backend” em a raiz."
      )
    ).toBeVisible()
    expect(memory.files()).toEqual(seed)
  })

  it("renomear para o mesmo nome não faz nada", async () => {
    const field = await rename("deploy", "deploy")
    await screen.findByRole("button", { name: "deploy" })
    expect(field).not.toBeInTheDocument()
    expect(memory.files()).toEqual(seed)
  })

  it("mudar só as maiúsculas funciona", async () => {
    await rename("deploy", "Deploy")
    expect(
      await within(tree()).findByRole("button", { name: "Deploy" })
    ).toBeVisible()
    expect(memory.files()["Deploy.md"]).toBe("# deploy")
  })

  it("nome inválido é bloqueado", async () => {
    await rename("deploy", "de:ploy")
    expect(
      await screen.findByText("Nome inválido: não use o caractere :.")
    ).toBeVisible()
    expect(memory.files()).toEqual(seed)
  })

  it("FR-018 — renomear pasta atualiza os links das notas dentro dela", async () => {
    await rename("backend", "servidor")
    await screen.findByText(/“backend” agora é “servidor”/)
    const files = memory.files()
    expect(files["servidor/util.md"]).toBe("# util")
    expect(files["infra.md"]).toContain("Util: [[servidor/util]]")
    expect(files["infra.md"]).toContain("API: [[api]]")
  })

  it("FR-020 — falha de gravação não interrompe as outras edições e entra no aviso", async () => {
    memory.failWritesOn(["infra.md"])
    await rename("deploy", "release")
    expect(
      await screen.findByText("1 arquivo não foi atualizado: infra.md.")
    ).toBeInTheDocument()
    expect(JSON.parse(memory.files()["mapa.canvas"]).nodes[0].file).toBe(
      "release.md"
    )
  })
})

describe("aplicar o plano", () => {
  it("FR-020 — arquivo alterado fora do app entre o plano e a aplicação é pulado e listado", async () => {
    const { vault, entries, linkIndex } = useVaultStore.getState()
    if (!vault || !linkIndex) throw new Error("vault not open")
    const plan = await planChange(
      linkIndex,
      entries,
      { "infra.md": seed["infra.md"], "mapa.canvas": canvas },
      [{ from: "deploy.md", to: "release.md" }]
    )
    await memory.simulateExternal(
      { kind: "modified", path: "infra.md" },
      "mudou por fora"
    )
    const result = await applyChangePlan(vault.storage, plan)
    expect(result.failed).toEqual(["infra.md"])
    expect(result.applied).toEqual(["mapa.canvas"])
    expect(memory.files()["infra.md"]).toBe("mudou por fora")
  })
})
