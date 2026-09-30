import { EditorView } from "@codemirror/view"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { NoteEditor } from "../components/note-editor"
import { useNoteStore } from "../note.store"

const runbook =
  "# Runbook\n\n![[checklist]]\n\nSó a primeira parte:\n\n![[checklist#Antes do deploy]]\n"
const checklist =
  "# Checklist\n\n## Antes do deploy\n\n- testes verdes [[deploy]]\n\n## Depois\n\n- avisar o time\n"
const chain = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => [
    `n${i + 1}.md`,
    i === 6 ? "# N7 fim\n" : `# N${i + 1}\n\n![[n${i + 2}]]\n`,
  ])
)

let memory: MemoryVaultSession
const vault = () => useVaultStore.getState()
const note = () => useNoteStore.getState()
const onFollowLink = vi.fn()

beforeEach(async () => {
  onFollowLink.mockReset()
  note().close()
  memory = createMemoryVaultSession(
    {
      "runbook.md": runbook,
      "checklist.md": checklist,
      "deploy.md": "# Deploy\n",
      "a.md": "# A\n\n![[b]]\n",
      "b.md": "# B\n\n![[a]]\n",
      "especiais.md": "![[vazia]]\n\n![[mapa.canvas]]\n\n![[util]]\n",
      "vazia.md": "",
      "mapa.canvas": "{}",
      "backend/util.md": "",
      "frontend/util.md": "",
      ...chain,
    },
    { lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" } }
  )
  await vault().restore(memory)
  await waitForIndex()
})

async function show(path: string) {
  await note().open(path)
  render(<NoteEditor onFollowLink={onFollowLink} />)
}

const block = (name: string) =>
  screen.findByRole("figure", { name: `Incorporação de ${name}` })

function viewOf(element: HTMLElement) {
  const view = EditorView.findFromDOM(
    element.closest(".cm-editor") as HTMLElement
  )
  if (!view) throw new Error("No editor around the element")
  return view
}

describe("incorporação no editor", () => {
  it("CA-EMBED-001-01 — o conteúdo aparece num bloco logo abaixo da linha, que continua no texto", async () => {
    await show("runbook.md")
    const whole = await block("checklist")
    await expect.poll(() => whole.textContent).toContain("testes verdes")
    expect(whole).toHaveTextContent("avisar o time")
    const line = whole.closest(".cm-embed")?.previousElementSibling
    expect(line?.textContent).toBe("![[checklist]]")
    expect(viewOf(line as HTMLElement).state.doc.toString()).toBe(runbook)
  })

  it("CA-EMBED-001-03 — ![[checklist#Antes do deploy]] mostra só a seção", async () => {
    await show("runbook.md")
    const section = await block("checklist › Antes do deploy")
    await expect.poll(() => section.textContent).toContain("testes verdes")
    expect(section).not.toHaveTextContent("avisar o time")
  })

  it("CA-EMBED-001-02 — alteração da original, por fora ou pelo app, aparece sem reabrir", async () => {
    await show("runbook.md")
    const whole = await block("checklist")
    await act(() =>
      memory.simulateExternal(
        { kind: "modified", path: "checklist.md" },
        `${checklist}- item novo\n`
      )
    )
    await expect.poll(() => whole.textContent).toContain("item novo")
    await act(() => vault().renameEntry("deploy.md", "release"))
    await expect
      .poll(async () => (await block("checklist")).textContent)
      .toContain("[[release]]")
  })

  it("CA-EMBED-002-01 — nota excluída mostra nota não encontrada, o texto fica, e ela volta se existir de novo", async () => {
    await show("runbook.md")
    await block("checklist")
    await act(() => vault().deleteEntry("checklist.md"))
    await expect
      .poll(() => screen.queryAllByText("Nota não encontrada: checklist"))
      .toHaveLength(2)
    expect(note().buffer).toBe(runbook)
    await act(() => vault().recreateNote("checklist.md"))
    await expect
      .poll(() => screen.queryAllByText("checklist está vazia"))
      .toHaveLength(1)
  })

  it("CA-EMBED-003-01 — incorporação circular é interrompida com aviso", async () => {
    await show("a.md")
    const b = await block("b")
    expect(
      await within(b).findByText("Incorporação circular: a já aparece acima")
    ).toBeVisible()
  })

  it("[novo] US4-6 — editar a nota que incorpora não copia conteúdo nem altera a original", async () => {
    await show("runbook.md")
    await block("checklist")
    act(() => note().edit(`${runbook}\nfim\n`))
    await note().flush()
    expect(memory.files()["runbook.md"]).toBe(`${runbook}\nfim\n`)
    expect(memory.files()["checklist.md"]).toBe(checklist)
  })

  it("abrir, rolar e fechar a nota não grava nada (FR-024)", async () => {
    const before = memory.files()
    await show("runbook.md")
    await block("checklist")
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(memory.files()).toEqual(before)
  })

  it("o botão Abrir do bloco segue o link da incorporação", async () => {
    await show("runbook.md")
    const whole = await block("checklist")
    await userEvent
      .setup()
      .click(within(whole).getByRole("button", { name: "Abrir checklist" }))
    expect(onFollowLink).toHaveBeenCalledWith(
      expect.objectContaining({ target: "checklist", subpath: "" }),
      "runbook.md"
    )
  })

  it("link dentro do bloco segue a partir da nota incorporada, e o bloco não é editável", async () => {
    await show("runbook.md")
    const whole = await block("checklist")
    const body = await within(whole).findByRole("textbox")
    await expect.poll(() => body.textContent).toContain("[[deploy]]")
    const nested = viewOf(body)
    expect(nested.state.readOnly).toBe(true)
    const position = nested.state.doc.toString().indexOf("[[deploy]]") + 3
    act(() => nested.dispatch({ selection: { anchor: position } }))
    act(() => nested.focus())
    await userEvent.setup().keyboard("{Control>}{Enter}{/Control}")
    expect(onFollowLink).toHaveBeenCalledWith(
      expect.objectContaining({ target: "deploy" }),
      "checklist.md"
    )
    expect(onFollowLink).toHaveBeenCalledTimes(1)
  })

  it("incorporações encadeadas aparecem até 5 níveis; o 6º mostra só o link", async () => {
    await show("n1.md")
    const deepest = await block("n6")
    await expect.poll(() => deepest.textContent).toContain("![[n7]]")
    expect(screen.getAllByRole("figure")).toHaveLength(5)
    expect(screen.queryByText("# N7 fim")).toBeNull()
  })

  it("nota vazia, canvas e nome repetido têm mensagem própria", async () => {
    await show("especiais.md")
    expect(await screen.findByText("vazia está vazia")).toBeVisible()
    expect(
      await screen.findByText(
        "Incorporar este tipo de arquivo ainda não está disponível"
      )
    ).toBeVisible()
    expect(
      await screen.findByText(
        "Mais de uma nota chamada “util”; indique a pasta"
      )
    ).toBeVisible()
  })
})
