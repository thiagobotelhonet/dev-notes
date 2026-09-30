import { describe, expect, it } from "vitest"
import { basenameOf, kindOf, type VaultEntry } from "@/shared/vault"
import { createLinkIndex } from "../model/links.index"
import {
  affectedByMoves,
  type EntryMove,
  planChange,
} from "../model/links.rename"

function vault(files: Record<string, string>, folders: string[] = []) {
  const entries: VaultEntry[] = [
    ...folders.map((path) => ({
      path,
      kind: "folder" as const,
      name: path.split("/").pop() ?? path,
      modifiedAt: 0,
    })),
    ...Object.keys(files).map((path) => ({
      path,
      kind: kindOf(path),
      name: basenameOf(path),
      modifiedAt: 0,
    })),
  ]
  const index = createLinkIndex(files)
  const plan = async (moves: EntryMove[]) => {
    const affected = affectedByMoves(index, entries, moves)
    const contents = Object.fromEntries(
      affected
        .filter((path) => path in files)
        .map((path) => [path, files[path]])
    )
    return planChange(index, entries, contents, moves)
  }
  return { entries, index, plan }
}

const edited = (plan: Awaited<ReturnType<ReturnType<typeof vault>["plan"]>>) =>
  Object.fromEntries(plan.edits.map((edit) => [edit.path, edit.after]))

const canvasWith = (file: string) =>
  JSON.stringify({
    nodes: [{ id: "n1", type: "file", file, x: 0, y: 0, width: 1, height: 1 }],
    edges: [],
  })

describe("planChange", () => {
  it("CA-NOTA-004-01 — renomear atualiza links e o cartão do canvas", async () => {
    const { plan } = vault({
      "infra.md": "Deploy: [[deploy]]",
      "deploy.md": "# deploy",
      "mapa.canvas": canvasWith("deploy.md"),
    })
    const result = await plan([{ from: "deploy.md", to: "release.md" }])
    expect(result.conflicts).toEqual([])
    expect(edited(result)["infra.md"]).toBe("Deploy: [[release]]")
    expect(JSON.parse(edited(result)["mapa.canvas"]).nodes[0].file).toBe(
      "release.md"
    )
    expect(result.updatedLinks).toBe(2)
  })

  it("CA-LINK-006-01 — renomear para um nome repetido faz os links antigos incluírem a pasta", async () => {
    const { plan } = vault(
      {
        "backend/api.md": "",
        "frontend/util.md": "",
        "infra.md": "[[api]] e [[api#Rotas|rotas]]",
        "outra.md": "ver [[api]]",
      },
      ["backend", "frontend"]
    )
    const result = await plan([
      { from: "frontend/util.md", to: "frontend/api.md" },
    ])
    expect(edited(result)).toEqual({
      "infra.md": "[[backend/api]] e [[backend/api#Rotas|rotas]]",
      "outra.md": "ver [[backend/api]]",
    })
  })

  it("preserva trecho, apelido e incorporação", async () => {
    const { plan } = vault({
      "deploy.md": "",
      "infra.md": "![[deploy#^bloco|passos]] [[deploy#Topo]] [[deploy|aqui]]",
    })
    const result = await plan([{ from: "deploy.md", to: "release.md" }])
    expect(edited(result)["infra.md"]).toBe(
      "![[release#^bloco|passos]] [[release#Topo]] [[release|aqui]]"
    )
  })

  it("nome que continua único usa só o nome (RN-LINK-004)", async () => {
    const { plan } = vault(
      { "backend/api.md": "", "infra.md": "[[backend/api]]" },
      ["backend", "servicos"]
    )
    const result = await plan([
      { from: "backend/api.md", to: "servicos/api.md" },
    ])
    expect(edited(result)["infra.md"]).toBe("[[api]]")
  })

  it("nome que fica repetido depois de mover usa pasta/nome", async () => {
    const { plan } = vault(
      {
        "backend/api.md": "",
        "servicos/legado/api.md": "",
        "infra.md": "[[backend/api]]",
      },
      ["backend", "servicos", "servicos/legado"]
    )
    const result = await plan([
      { from: "backend/api.md", to: "servicos/api.md" },
    ])
    expect(edited(result)["infra.md"]).toBe("[[servicos/api]]")
  })

  it("mover nota de nome único mantém o link como está", async () => {
    const { plan } = vault({ "deploy.md": "", "infra.md": "[[deploy]]" }, [
      "runbooks",
    ])
    const result = await plan([{ from: "deploy.md", to: "runbooks/deploy.md" }])
    expect(result.edits).toEqual([])
  })

  it("destino que já existe na pasta, inclusive só por maiúsculas, vira conflito e nada é planejado", async () => {
    const { plan } = vault(
      { "backend/api.md": "", "backend/util.md": "", "infra.md": "[[util]]" },
      ["backend"]
    )
    const result = await plan([
      { from: "backend/util.md", to: "backend/API.md" },
    ])
    expect(result.conflicts).toEqual([
      { path: "backend/API.md", existing: "backend/api.md" },
    ])
    expect(result.edits).toEqual([])
  })

  it("renomear pasta leva os links de todas as notas dentro dela", async () => {
    const { plan } = vault(
      {
        "backend/api.md": "",
        "backend/util.md": "",
        "frontend/util.md": "",
        "infra.md": "[[backend/util]] [[api]]",
        "mapa.canvas": canvasWith("backend/api.md"),
      },
      ["backend", "frontend"]
    )
    const result = await plan([{ from: "backend", to: "servidor" }])
    expect(edited(result)["infra.md"]).toBe("[[servidor/util]] [[api]]")
    expect(JSON.parse(edited(result)["mapa.canvas"]).nodes[0].file).toBe(
      "servidor/api.md"
    )
  })

  it("canvas que ficou inválido depois de indexado não é reescrito e entra como pulado", async () => {
    const { entries, index } = vault({
      "deploy.md": "",
      "mapa.canvas": canvasWith("deploy.md"),
    })
    const moves = [{ from: "deploy.md", to: "release.md" }]
    expect(affectedByMoves(index, entries, moves)).toContain("mapa.canvas")
    const result = await planChange(
      index,
      entries,
      { "mapa.canvas": "{ quebrado" },
      moves
    )
    expect(result.skipped).toEqual(["mapa.canvas"])
    expect(result.edits).toEqual([])
  })

  it("edições guardam o hash do conteúdo lido", async () => {
    const { plan } = vault({ "deploy.md": "", "infra.md": "[[deploy]]" })
    const result = await plan([{ from: "deploy.md", to: "release.md" }])
    expect(result.edits[0].before).toMatch(/^[0-9a-f]{64}$/)
  })
})
