import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Toaster, toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { BacklinksPanel } from "../components/backlinks-panel"

const infra =
  "Deploy: [[deploy]]\nDe novo: [[deploy]]\nE mais: [[deploy]]\nPendente: [[ideia nova]]\n"

let memory: MemoryVaultSession
const vault = () => useVaultStore.getState()
const onOpen = vi.fn()
const onClose = vi.fn()

beforeEach(async () => {
  onOpen.mockReset()
  onClose.mockReset()
  memory = createMemoryVaultSession(
    {
      "deploy.md": "# Deploy\n",
      "infra.md": infra,
      "backend/runbook.md": "# Runbook\n\n![[deploy]]\n",
      "rascunho.md": "",
    },
    { lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" } }
  )
  await vault().restore(memory)
  await waitForIndex()
})

const panel = () => screen.getByRole("region", { name: "Backlinks" })
const show = (path: string) =>
  render(<BacklinksPanel path={path} onOpen={onOpen} onClose={onClose} />)
const noteNames = () =>
  within(panel())
    .queryAllByText(/^(infra|runbook|infra2|nova)$/)
    .map((element) => element.textContent)

describe("painel de backlinks", () => {
  it("CA-BACK-001-01 — mostra as notas que apontam, com a pasta e o trecho de cada link", async () => {
    show("deploy.md")
    await expect.poll(noteNames).toEqual(["runbook", "infra"])
    expect(within(panel()).getByText("backend")).toBeVisible()
    expect(within(panel()).getByText("raiz")).toBeVisible()
    expect(
      within(panel()).getByRole("button", { name: /Deploy: \[\[deploy\]\]/ })
    ).toBeVisible()
  })

  it("CA-BACK-001-04 — a nota aparece uma vez, com um trecho por link", async () => {
    show("deploy.md")
    await expect.poll(noteNames).toContain("infra")
    expect(within(panel()).getAllByText("infra")).toHaveLength(1)
    expect(
      within(panel()).getAllByRole("button", { name: /\[\[deploy\]\]/ })
    ).toHaveLength(4)
    expect(within(panel()).getByText("Links para esta nota (2)")).toBeVisible()
  })

  it("CA-BACK-001-02 (painel) — clicar num trecho pede para abrir a nota no ponto do link", async () => {
    show("deploy.md")
    const second = await within(panel()).findByRole("button", {
      name: /De novo: \[\[deploy\]\]/,
    })
    await userEvent.setup().click(second)
    expect(onOpen).toHaveBeenCalledWith(
      "infra.md",
      infra.indexOf("[[deploy]]", infra.indexOf("De novo"))
    )
  })

  it("o botão de fechar pede para esconder o painel", async () => {
    show("deploy.md")
    await userEvent
      .setup()
      .click(
        within(panel()).getByRole("button", { name: "Esconder backlinks" })
      )
    expect(onClose).toHaveBeenCalled()
  })

  it("link de incorporação vem marcado como incorporação", async () => {
    show("deploy.md")
    expect(
      await within(panel()).findByRole("button", { name: /incorporação/ })
    ).toHaveTextContent("![[deploy]]")
  })

  it("CA-BACK-001-05 — acompanha links que somem e aparecem, sem remontar", async () => {
    show("deploy.md")
    await expect.poll(noteNames).toContain("runbook")
    await act(() =>
      memory.simulateExternal(
        { kind: "modified", path: "backend/runbook.md" },
        "# Runbook\n\nsem link\n"
      )
    )
    await expect.poll(noteNames).toEqual(["infra"])
    await act(() =>
      memory.simulateExternal(
        { kind: "created", path: "nova.md" },
        "[[deploy]]\n"
      )
    )
    await expect.poll(noteNames).toEqual(["infra", "nova"])
  })

  it("CA-BACK-001-06 — sem backlinks, diz que nenhuma nota aponta para ela", async () => {
    show("rascunho.md")
    expect(
      await within(panel()).findByText("Nenhuma nota aponta para esta.")
    ).toBeVisible()
  })

  it("enquanto o índice não está pronto, mostra o esqueleto", async () => {
    useVaultStore.setState({ linkIndex: null })
    show("deploy.md")
    expect(await within(panel()).findByText("Carregando…")).toBeInTheDocument()
  })

  it("link pendente passa a contar quando a nota é criada", async () => {
    await act(() =>
      memory.simulateExternal({ kind: "created", path: "ideia nova.md" }, "")
    )
    show("ideia nova.md")
    await expect.poll(noteNames).toEqual(["infra"])
  })

  it("nota que aponta renomeada pelo app continua no painel com o nome novo", async () => {
    show("deploy.md")
    await expect.poll(noteNames).toContain("infra")
    await act(() => vault().renameEntry("infra.md", "infra2"))
    await expect.poll(noteNames).toEqual(["runbook", "infra2"])
  })

  it("mostrar e atualizar o painel não grava nada (FR-017)", async () => {
    const before = memory.files()
    const view = show("deploy.md")
    await expect.poll(noteNames).toContain("infra")
    await new Promise((resolve) => setTimeout(resolve, 400))
    view.unmount()
    expect(memory.files()).toEqual(before)
  })
})

describe("menções sem link", () => {
  const texto = "Ontem o deploy falhou.\nDepois o Deploy voltou.\n"

  beforeEach(async () => {
    memory = createMemoryVaultSession(
      {
        "deploy.md": "# Deploy\n",
        "infra.md": texto,
        "runbook.md": "![[deploy]] e `deploy` em código\n",
        "api.md": "",
        "rapido.md": "rapidamente\n",
        "db.md": "",
        "ideia nova.md": "",
        "time.md": "a ideia nova do time\n",
      },
      { lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" } }
    )
    await vault().restore(memory)
    await waitForIndex()
  })

  const section = () =>
    within(panel()).getByRole("button", { name: /^Menções sem link/ })

  it("CA-BACK-002-02 — a seção vem recolhida, com a contagem, e abre ao clicar", async () => {
    show("deploy.md")
    await expect.poll(() => section().textContent).toBe("Menções sem link (1)")
    expect(section()).toHaveAttribute("aria-expanded", "false")
    expect(within(panel()).queryByText(/falhou/)).toBeNull()
    await userEvent.setup().click(section())
    expect(section()).toHaveAttribute("aria-expanded", "true")
  })

  it("CA-BACK-002-01 (exibição) — aberta, mostra a nota que cita o nome com o trecho", async () => {
    show("deploy.md")
    await userEvent.setup().click(section())
    expect(
      await within(panel()).findByRole("button", { name: /o deploy falhou/ })
    ).toBeVisible()
  })

  it("CA-BACK-003-02 — maiúsculas não contam", async () => {
    show("deploy.md")
    await userEvent.setup().click(section())
    expect(
      await within(panel()).findByRole("button", { name: /o Deploy voltou/ })
    ).toBeVisible()
  })

  it("CA-BACK-003-03 — link e código não são menção: runbook fica só nos links", async () => {
    show("deploy.md")
    await userEvent.setup().click(section())
    await within(panel()).findByRole("button", { name: /o deploy falhou/ })
    /* Only its ![[deploy]] in the links section; nothing among the mentions. */
    expect(within(panel()).getAllByText("runbook")).toHaveLength(1)
    expect(
      within(panel()).getAllByRole("button", { name: /em código/ })
    ).toHaveLength(1)
  })

  it("CA-BACK-003-01 — rapidamente não é menção de api", async () => {
    show("api.md")
    await userEvent.setup().click(section())
    expect(
      await within(panel()).findByText("Nenhuma menção sem link.")
    ).toBeVisible()
  })

  it("CA-BACK-003-04 — nome com várias palavras", async () => {
    show("ideia nova.md")
    await userEvent.setup().click(section())
    expect(
      await within(panel()).findByRole("button", {
        name: /a ideia nova do time/,
      })
    ).toBeVisible()
  })

  it("nome curto avisa que menções não são procuradas", async () => {
    show("db.md")
    await userEvent.setup().click(section())
    expect(
      await within(panel()).findByText(
        "Menções não são procuradas para nomes com menos de 3 caracteres."
      )
    ).toBeVisible()
  })

  it("clicar num trecho de menção pede para abrir no ponto da menção (FR-010)", async () => {
    show("deploy.md")
    await userEvent.setup().click(section())
    await userEvent
      .setup()
      .click(
        await within(panel()).findByRole("button", { name: /o deploy falhou/ })
      )
    expect(onOpen).toHaveBeenCalledWith("infra.md", texto.indexOf("deploy"))
  })

  describe("linkar menção (RN-BACK-004)", () => {
    beforeEach(() => {
      toast.dismiss()
    })

    const showWithToasts = async () => {
      render(
        <>
          <BacklinksPanel path="deploy.md" onOpen={onOpen} onClose={onClose} />
          <Toaster />
        </>
      )
      const user = userEvent.setup()
      await user.click(section())
      await within(panel()).findByRole("button", { name: /o deploy falhou/ })
      return user
    }
    const linkButtons = () =>
      within(panel()).queryAllByRole("button", {
        name: "Linkar menção em infra",
      })

    it("CA-BACK-002-01 (ação) — Linkar grava o link, avisa e a nota passa para os links", async () => {
      const user = await showWithToasts()
      await user.click(linkButtons()[0])
      expect(
        await screen.findByText("Menção em “infra” virou link.")
      ).toBeVisible()
      expect(memory.files()["infra.md"]).toBe(
        "Ontem o [[deploy]] falhou.\nDepois o Deploy voltou.\n"
      )
      await expect
        .poll(() => section().textContent)
        .toBe("Menções sem link (1)")
      expect(linkButtons()).toHaveLength(1)
      expect(
        within(panel()).getByText("Links para esta nota (2)")
      ).toBeVisible()
    })

    it("CA-BACK-004-03 — arquivo mudado por fora: avisa, não grava e atualiza a lista", async () => {
      const user = await showWithToasts()
      await memory.simulateExternal(
        { kind: "modified", path: "infra.md" },
        "sem menção agora\n",
        { silent: true }
      )
      await user.click(linkButtons()[0])
      expect(
        await screen.findByText(
          "“infra” mudou fora do Dev Notes. A lista foi atualizada."
        )
      ).toBeVisible()
      expect(memory.files()["infra.md"]).toBe("sem menção agora\n")
      await expect.poll(() => linkButtons()).toHaveLength(0)
    })

    it("falha ao gravar avisa que nada foi alterado", async () => {
      const user = await showWithToasts()
      memory.failWritesOn(["infra.md"])
      await user.click(linkButtons()[0])
      expect(
        await screen.findByText(
          "Não foi possível gravar “infra”. Nada foi alterado."
        )
      ).toBeVisible()
      expect(memory.files()["infra.md"]).toBe(texto)
      expect(linkButtons()).toHaveLength(2)
    })

    it("só pelo teclado: Tab chega ao trecho e ao Linkar, Enter executa cada um", async () => {
      const user = await showWithToasts()
      const snippet = within(panel()).getByRole("button", {
        name: /o deploy falhou/,
      })
      snippet.focus()
      await user.keyboard("{Enter}")
      expect(onOpen).toHaveBeenCalledWith("infra.md", texto.indexOf("deploy"))
      await user.tab()
      expect(linkButtons()[0]).toHaveFocus()
      await user.keyboard("{Enter}")
      expect(
        await screen.findByText("Menção em “infra” virou link.")
      ).toBeVisible()
    })
  })

  it("trocar de nota recolhe a seção de novo", async () => {
    const view = show("deploy.md")
    await userEvent.setup().click(section())
    view.rerender(
      <BacklinksPanel path="ideia nova.md" onOpen={onOpen} onClose={onClose} />
    )
    await expect
      .poll(() => section().getAttribute("aria-expanded"))
      .toBe("false")
  })
})
