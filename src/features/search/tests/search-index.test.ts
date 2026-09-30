import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useVaultStore, waitForIndex } from "@/features/vault"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import { searchNotes, whenSearchReady } from "../search.store"

const seed = {
  "deploy.md": "# Deploy\n\nPasso a passo.\n",
  "infra.md": "# Infra\n\nO deploy de ontem.\n\nDepois falhou.\n",
  "runbook.md":
    "# Runbook\n\nRodar o deploy.\n\n```bash\nkubectl rollout restart\n```\n",
  "incidente.md": "o deploy falhou ontem\n",
  "relato.md": "falhou o deploy\n",
  "proxy.md": "Configuração do proxy\n",
  "rapido.md": "rapidamente\n",
  "a.md": "igual\n",
  "b.md": "igual\n",
  "mapa.canvas": '{"nodes":[{"id":"1","type":"text","text":"rollout"}]}',
  ".devnotes/oculta.md": "rollout\n",
}

let memory: MemoryVaultSession
const vault = () => useVaultStore.getState()

beforeEach(async () => {
  memory = createMemoryVaultSession(seed, {
    lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" },
  })
  await vault().restore(memory)
  await waitForIndex()
  await whenSearchReady()
})

const paths = (text: string) => searchNotes(text).map((result) => result.path)

describe("busca completa — texto", () => {
  it("CA-BUSCA-003-01 — busca sem acento", () => {
    expect(paths("configuracao")).toEqual(["proxy.md"])
  })

  it("CA-BUSCA-004-01 — prioridade do nome", () => {
    const found = paths("deploy")
    expect(found[0]).toBe("deploy.md")
    expect(found).toContain("infra.md")
  })

  it("CA-BUSCA-001-01 — conteúdo de bloco de código", () => {
    expect(paths("rollout")).toEqual(["runbook.md"])
  })

  it("CA-BUSCA-001-02 — várias palavras exigem todas", () => {
    const found = paths("deploy falhou")
    expect(found).toContain("infra.md")
    expect(found).not.toContain("runbook.md")
    expect(found).not.toContain("deploy.md")
  })

  it("CA-BUSCA-001-03 — frase exata", () => {
    expect(paths('"deploy falhou"')).toEqual(["incidente.md"])
  })

  it("CA-BUSCA-001-05 — palavra parcial não conta", () => {
    expect(paths("api")).toEqual([])
    expect(paths("rapid")).toEqual(["rapido.md"])
  })

  it("prefixo: depl acha deploy", () => {
    expect(paths("depl")[0]).toBe("deploy.md")
  })

  it("empate fica na ordem do caminho", () => {
    expect(paths("igual")).toEqual(["a.md", "b.md"])
  })

  it("resultado marca quando o termo está no nome", () => {
    const [first, second] = searchNotes("deploy")
    expect(first.inName).toBe(true)
    expect(second.inName).toBe(false)
  })

  it("FR-024 — canvas e pastas ocultas ficam de fora", () => {
    expect(paths("rollout")).not.toContain("mapa.canvas")
    expect(paths("rollout")).not.toContain(".devnotes/oculta.md")
  })

  it("FR-022 — buscar não grava nada", () => {
    const before = memory.files()
    paths("deploy")
    paths('"deploy falhou"')
    expect(memory.files()).toEqual(before)
  })
})

describe("busca completa — índice em dia (FR-012)", () => {
  it("nota criada, alterada e excluída por fora", async () => {
    await act(() =>
      memory.simulateExternal(
        { kind: "created", path: "nova.md" },
        "outro rollout\n"
      )
    )
    await expect.poll(() => paths("rollout")).toContain("nova.md")
    await act(() =>
      memory.simulateExternal(
        { kind: "modified", path: "nova.md" },
        "sem o termo\n"
      )
    )
    await expect.poll(() => paths("rollout")).not.toContain("nova.md")
    await act(() =>
      memory.simulateExternal({ kind: "removed", path: "runbook.md" }, "")
    )
    await expect.poll(() => paths("rollout")).toEqual([])
  })

  it("gravação do editor", async () => {
    act(() => vault().noteSaved("relato.md", "agora com rollout\n"))
    await expect.poll(() => paths("rollout")).toContain("relato.md")
  })

  it("nota renomeada e movida pelo app", async () => {
    await act(() => vault().renameEntry("runbook.md", "procedimento"))
    await expect.poll(() => paths("rollout")).toEqual(["procedimento.md"])
    await act(() => vault().createFolder("", "ops"))
    await act(() => vault().moveEntry("procedimento.md", "ops"))
    await expect.poll(() => paths("rollout")).toEqual(["ops/procedimento.md"])
  })

  it("troca de vault reconstrói o índice", async () => {
    const other = createMemoryVaultSession(
      { "outro.md": "rollout em outro vault\n" },
      { lastOpened: { root: memoryVaultRoot, name: "w", lastOpenedAt: "" } }
    )
    await vault().restore(other)
    await waitForIndex()
    await expect.poll(() => paths("rollout")).toEqual(["outro.md"])
  })
})

describe("busca completa — filtros", () => {
  const filtros = {
    "snippets/deploy-api.md":
      "---\nlinguagem: csharp\n---\n#backend\n\nComo fazer o deploy.\n",
    "snippets/dotnet/build.md":
      "---\nlinguagem: CSharp\n---\nAntes do deploy, o build.\n",
    "snippets/hello-py.md":
      "---\nlinguagem: python\ntags: [backend/api]\n---\nprint\n",
    "infra.md": "o deploy de sempre #backend #urgente\n",
    "codigo.md": "```\n#backend\n```\n",
    "outra.md": "---\nautores: [ana, bia]\n---\ntexto\n",
    "intranet.md": "Ver http://intranet antes.\n",
  }

  beforeEach(async () => {
    memory = createMemoryVaultSession(filtros, {
      lastOpened: { root: memoryVaultRoot, name: "f", lastOpenedAt: "" },
    })
    await vault().restore(memory)
    await waitForIndex()
    await whenSearchReady()
  })

  it("CA-BUSCA-002-01 — busca com filtros combinados", () => {
    expect(paths("deploy tag:#backend pasta:snippets")).toEqual([
      "snippets/deploy-api.md",
    ])
  })

  it("CA-BUSCA-002-02 — tag mãe inclui as filhas; filha não inclui a mãe", () => {
    expect(paths("tag:#backend")).toEqual([
      "infra.md",
      "snippets/deploy-api.md",
      "snippets/hello-py.md",
    ])
    expect(paths("tag:#backend/api")).toEqual(["snippets/hello-py.md"])
  })

  it("CA-BUSCA-002-03 — filtro por propriedade, sem maiúsculas", () => {
    expect(paths("linguagem:csharp")).toEqual([
      "snippets/deploy-api.md",
      "snippets/dotnet/build.md",
    ])
    expect(paths("linguagem:python")).toEqual(["snippets/hello-py.md"])
  })

  it("CA-BUSCA-002-04 — só filtros, na ordem do caminho", () => {
    expect(paths("tag:backend")).toHaveLength(3)
    expect(paths("pasta:snippets")).toEqual([
      "snippets/deploy-api.md",
      "snippets/dotnet/build.md",
      "snippets/hello-py.md",
    ])
  })

  it("CA-BUSCA-002-05 — tag em código não conta, mas o texto acha", () => {
    expect(paths("tag:#backend")).not.toContain("codigo.md")
    expect(paths("backend")).toContain("codigo.md")
  })

  it("CA-BUSCA-002-06 — pasta inclui subpastas, mas não pasta de nome parecido", () => {
    expect(paths("deploy pasta:snippets")).toContain("snippets/dotnet/build.md")
    expect(paths("pasta:snip")).toEqual([])
  })

  it("CA-BUSCA-002-07 — texto com dois-pontos que não é filtro acha a nota", () => {
    expect(paths("http://intranet")).toEqual(["intranet.md"])
  })

  it("propriedade com lista casa com um dos itens", () => {
    expect(paths("autores:bia")).toEqual(["outra.md"])
  })

  it("filtros repetidos exigem todos", () => {
    expect(paths("tag:#backend tag:#urgente")).toEqual(["infra.md"])
  })

  it("FR-006 — propriedade como texto, sem filtro", () => {
    expect(paths("csharp")).toEqual([
      "snippets/deploy-api.md",
      "snippets/dotnet/build.md",
    ])
    expect(paths("autores")).toEqual(["outra.md"])
  })

  it("tag acrescentada por fora entra no filtro", async () => {
    await act(() =>
      memory.simulateExternal(
        { kind: "modified", path: "outra.md" },
        "agora #backend\n"
      )
    )
    await expect.poll(() => paths("tag:#backend")).toContain("outra.md")
  })
})
