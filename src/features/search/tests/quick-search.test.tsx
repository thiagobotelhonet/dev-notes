import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useVaultStore } from "@/features/vault"
import {
  createMemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { QuickSearchDialog } from "../components/quick-search-dialog"

const onOpen = vi.fn()
const onOpenChange = vi.fn()

beforeEach(async () => {
  onOpen.mockReset()
  onOpenChange.mockReset()
  const memory = createMemoryVaultSession(
    {
      "deploy.md": "# Deploy\n",
      "infra.md": "o deploy falhou\n",
      "backend/api.md": "",
      "backend/notas.md": "",
      "frontend/api.md": "",
      "backend-guia.md": "",
      "Configuração.md": "",
      "deploy-mapa.canvas": "{}",
    },
    { lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" } }
  )
  await useVaultStore.getState().restore(memory)
})

function show() {
  render(<QuickSearchDialog open onOpenChange={onOpenChange} onOpen={onOpen} />)
  return {
    user: userEvent.setup(),
    field: screen.getByPlaceholderText("Nome da nota"),
    options: () =>
      within(screen.getByRole("dialog"))
        .queryAllByRole("option")
        .map((option) => option.textContent),
  }
}

describe("busca rápida", () => {
  it("CA-BUSCA-005-01 — abrir nota pelo nome", async () => {
    const { user, field } = show()
    await user.type(field, "depl")
    await user.keyboard("{Enter}")
    expect(onOpen).toHaveBeenCalledWith("deploy.md")
  })

  it("CA-BUSCA-005-02 — nome repetido mostra a pasta", async () => {
    const { user, field, options } = show()
    await user.type(field, "api")
    expect(options()).toEqual(
      expect.arrayContaining(["apibackend", "apifrontend"])
    )
  })

  it("CA-BUSCA-005-03 — nome sem acento", async () => {
    const { user, field, options } = show()
    await user.type(field, "configuracao")
    expect(options()).toEqual(["Configuraçãoraiz"])
  })

  it("CA-BUSCA-005-04 — só pelo teclado: setas e Enter abrem a escolhida; Esc fecha sem abrir", async () => {
    const { user, field, options } = show()
    await user.type(field, "api")
    expect(options()).toHaveLength(2)
    await user.keyboard("{ArrowDown}{Enter}")
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen.mock.calls[0][0]).toMatch(/^(backend|frontend)\/api\.md$/)
    onOpen.mockReset()
    onOpenChange.mockReset()
    await user.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it("CA-BUSCA-005-05 — nenhuma nota com esse nome", async () => {
    const { user, field } = show()
    await user.type(field, "xyz")
    expect(screen.getByText("Nenhuma nota com esse nome.")).toBeVisible()
  })

  it("sem texto, pede parte do nome", () => {
    show()
    expect(screen.getByText("Digite parte do nome da nota.")).toBeVisible()
  })

  it("canvas não aparece", async () => {
    const { user, field, options } = show()
    await user.type(field, "deploy")
    expect(options().some((option) => option?.includes("mapa"))).toBe(false)
  })

  it("FR-002 — a pasta também combina, depois dos nomes", async () => {
    const { user, field, options } = show()
    await user.type(field, "backend")
    const [first, ...byFolder] = options()
    expect(first).toBe("backend-guiaraiz")
    expect(byFolder.sort()).toEqual(["apibackend", "notasbackend"])
  })
})
