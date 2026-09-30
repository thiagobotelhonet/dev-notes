import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { SearchPanel } from "../components/search-panel"
import { useSearchStore, whenSearchReady } from "../search.store"

const infra = "# Infra\n\nO deploy de ontem.\n\nOutro deploy hoje.\n"
const cinco = "rollout 1\nrollout 2\nrollout 3\nrollout 4\nrollout 5\n"
const lote = Object.fromEntries(
  Array.from({ length: 120 }, (_, i) => [
    `lote/n${String(i + 1).padStart(3, "0")}.md`,
    "item de lote\n",
  ])
)

let memory: MemoryVaultSession
const onOpen = vi.fn()

beforeEach(async () => {
  onOpen.mockReset()
  memory = createMemoryVaultSession(
    {
      "deploy.md": "# Passos\n",
      "infra.md": infra,
      "cinco.md": cinco,
      "proxy.md": "Configuração do proxy\n",
      ...lote,
    },
    { lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" } }
  )
  await useVaultStore.getState().restore(memory)
  await waitForIndex()
  await whenSearchReady()
})

const panel = () => screen.getByRole("region", { name: "Busca" })
const field = () => screen.getByRole("combobox", { name: "Buscar nas notas" })

async function search(text: string) {
  const user = userEvent.setup()
  render(<SearchPanel onOpen={onOpen} />)
  await user.type(field(), text)
  return user
}

describe("painel da busca completa", () => {
  it("sem consulta, mostra a dica dos filtros", () => {
    render(<SearchPanel onOpen={onOpen} />)
    expect(
      within(panel()).getByText("Busque por texto ou use filtros")
    ).toBeVisible()
  })

  it("enquanto o índice se prepara, mostra o esqueleto", () => {
    useSearchStore.setState({ status: "building" })
    render(<SearchPanel onOpen={onOpen} />)
    expect(within(panel()).getByText("Preparando a busca…")).toBeInTheDocument()
    useSearchStore.setState({ status: "ready" })
  })

  it("sem resultado, diz que nenhuma nota corresponde", async () => {
    await search("xyzw")
    expect(
      await within(panel()).findByText("Nenhuma nota corresponde à busca.")
    ).toBeVisible()
  })

  it("contagem no singular e no plural", async () => {
    const user = await search("configuracao")
    expect(await within(panel()).findByText("1 nota")).toBeVisible()
    await user.clear(field())
    await user.type(field(), "deploy")
    expect(await within(panel()).findByText("2 notas")).toBeVisible()
  })

  it("quantidade de ocorrências e até 3 trechos por nota", async () => {
    await search("rollout")
    expect(await within(panel()).findByText(/5 ocorrências/)).toBeVisible()
    expect(
      within(panel()).getAllByRole("button", { name: /^rollout \d$/ })
    ).toHaveLength(3)
  })

  it("só o nome casa: sem ocorrências nem trechos", async () => {
    await search("deploy")
    const header = await within(panel()).findByRole("button", {
      name: /^deploy\s*raiz$/,
    })
    expect(header).toBeVisible()
    await userEvent.setup().click(header)
    expect(onOpen).toHaveBeenCalledWith("deploy.md", undefined)
  })

  it("CA-BUSCA-001-04 — escolher um trecho abre a nota na ocorrência", async () => {
    await search("deploy")
    await userEvent.setup().click(
      await within(panel()).findByRole("button", {
        name: /Outro deploy hoje/,
      })
    )
    expect(onOpen).toHaveBeenCalledWith(
      "infra.md",
      infra.indexOf("deploy", infra.indexOf("Outro"))
    )
  })

  it("escolher a nota abre na primeira ocorrência", async () => {
    await search("deploy")
    await userEvent
      .setup()
      .click(
        await within(panel()).findByRole("button", { name: /^infra\s*raiz/ })
      )
    expect(onOpen).toHaveBeenCalledWith("infra.md", infra.indexOf("deploy"))
  })

  it("Mostrar mais acrescenta resultados", async () => {
    /* Folder filter only: no snippets, so 120 results stay light (TST-08). */
    const user = await search("pasta:lote")
    expect(await within(panel()).findByText("120 notas")).toBeVisible()
    expect(within(panel()).getAllByText(/^n\d{3}$/)).toHaveLength(100)
    await user.click(
      within(panel()).getByRole("button", { name: "Mostrar mais" })
    )
    expect(within(panel()).getAllByText(/^n\d{3}$/)).toHaveLength(120)
    expect(
      within(panel()).queryByRole("button", { name: "Mostrar mais" })
    ).toBeNull()
  })

  it("CA-BUSCA-001-06 — nota que passa a ter o termo entra sem nova busca", async () => {
    await search("kubectl")
    await within(panel()).findByText("Nenhuma nota corresponde à busca.")
    await act(() =>
      memory.simulateExternal(
        { kind: "created", path: "runbook.md" },
        "kubectl rollout restart\n"
      )
    )
    expect(await within(panel()).findByText("runbook")).toBeVisible()
  })

  it("limpar a busca volta à dica", async () => {
    const user = await search("deploy")
    await user.click(
      within(panel()).getByRole("button", { name: "Limpar busca" })
    )
    expect(field()).toHaveValue("")
    expect(
      await within(panel()).findByText("Busque por texto ou use filtros")
    ).toBeVisible()
  })
})

describe("sugestões de filtro no painel", () => {
  beforeEach(async () => {
    memory = createMemoryVaultSession(
      {
        "a.md": "#backend\n",
        "b.md": "#backend/api\n",
        "snippets/c.md": "---\nlinguagem: csharp\n---\n",
      },
      { lastOpened: { root: memoryVaultRoot, name: "s", lastOpenedAt: "" } }
    )
    await useVaultStore.getState().restore(memory)
    await waitForIndex()
    await whenSearchReady()
  })

  it("CA-BUSCA-006-04 — escolher a sugestão com o teclado completa o filtro e busca", async () => {
    const user = await search("tag:#ba")
    expect(
      await screen.findByRole("option", { name: "#backend" })
    ).toBeVisible()
    /* The first suggestion comes highlighted (autoHighlight). */
    await user.keyboard("{Enter}")
    expect(field()).toHaveValue("tag:#backend")
    expect(await within(panel()).findByText("2 notas")).toBeVisible()
  })

  it("Tab também escolhe a sugestão destacada", async () => {
    const user = await search("linguagem:c")
    await screen.findByRole("option", { name: "csharp" })
    await user.keyboard("{Tab}")
    expect(field()).toHaveValue("linguagem:csharp")
  })

  it("a seta leva à próxima sugestão", async () => {
    const user = await search("tag:#ba")
    await screen.findByRole("option", { name: "#backend/api" })
    await user.keyboard("{ArrowDown}{Enter}")
    expect(field()).toHaveValue("tag:#backend/api")
  })

  it("Esc fecha só a lista e mantém a consulta", async () => {
    const user = await search("pasta:sn")
    await screen.findByRole("option", { name: "snippets" })
    await user.keyboard("{Escape}")
    await expect.poll(() => screen.queryByRole("option")).toBeNull()
    expect(field()).toHaveValue("pasta:sn")
  })
})
