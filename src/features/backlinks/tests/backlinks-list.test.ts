import { describe, expect, it } from "vitest"
import { createLinkIndex } from "@/features/links"
import { backlinkGroups, mentionGroups } from "../model/backlinks.list"

const vault = {
  "deploy.md": "# Deploy\n\n[[deploy]] aponta para si mesma\n",
  "infra.md": "Deploy: [[deploy]]\nDe novo: [[deploy]]\nE mais: [[deploy]]\n",
  "runbook.md": "# Runbook\n\n![[deploy]]\n",
  "backend/api.md": "",
  "frontend/api.md": "",
  "notas.md": "[[backend/api]] e [[api]]\n",
}

const index = createLinkIndex(vault)
const summary = (path: string) =>
  backlinkGroups(index, path).map((group) => ({
    source: group.source,
    name: group.name,
    folder: group.folder,
    count: group.occurrences.length,
  }))

describe("backlinkGroups", () => {
  it("CA-BACK-001-01 (modelo) — uma entrada por nota que aponta, em ordem alfabética, com nome e pasta", () => {
    expect(summary("deploy.md")).toEqual([
      { source: "infra.md", name: "infra", folder: "", count: 3 },
      { source: "runbook.md", name: "runbook", folder: "", count: 1 },
    ])
  })

  it("CA-BACK-001-03 (modelo) — link com pasta conta; link ambíguo não conta para nenhuma", () => {
    expect(summary("backend/api.md")).toEqual([
      { source: "notas.md", name: "notas", folder: "", count: 1 },
    ])
    expect(summary("frontend/api.md")).toEqual([])
  })

  it("CA-BACK-001-04 (modelo) — várias ocorrências na mesma nota, na ordem do texto", () => {
    const [infra] = backlinkGroups(index, "deploy.md")
    const starts = infra.occurrences.map((occurrence) => occurrence.start)
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
    expect(infra.occurrences.map((o) => o.snippet.before)).toEqual([
      "Deploy: ",
      "De novo: ",
      "E mais: ",
    ])
    expect(starts[1]).toBe(
      vault["infra.md"].indexOf("[[deploy]]", starts[0] + 1)
    )
  })

  it("incorporação vem marcada e a própria nota não aparece", () => {
    const groups = backlinkGroups(index, "deploy.md")
    expect(
      groups.find((g) => g.source === "runbook.md")?.occurrences[0].embed
    ).toBe(true)
    expect(groups.some((g) => g.source === "deploy.md")).toBe(false)
  })
})

describe("mentionGroups", () => {
  const mentions = createLinkIndex({
    "deploy.md": "# Deploy\n\no deploy desta nota não conta\n",
    "infra.md": "Ontem o deploy falhou. Depois o Deploy voltou.\n",
    "runbook.md": "[[deploy]] e `deploy` em código\n",
    "rapido.md": "rapidamente\n",
    "api.md": "",
    "db.md": "",
    "outra.md": "o db caiu\n",
  })

  it("CA-BACK-002-01 (modelo) — uma entrada por nota que cita o nome, na ordem do texto", () => {
    const result = mentionGroups(mentions, "deploy.md")
    expect(result.shortName).toBe(false)
    expect(result.groups.map((group) => group.source)).toEqual(["infra.md"])
    const [infra] = result.groups
    expect(infra.occurrences.map((o) => o.snippet.match)).toEqual([
      "deploy",
      "Deploy",
    ])
    expect(infra.occurrences[0].start).toBeLessThan(infra.occurrences[1].start)
  })

  it("a própria nota e os links não entram como menção", () => {
    const sources = mentionGroups(mentions, "deploy.md").groups.map(
      (group) => group.source
    )
    expect(sources).not.toContain("deploy.md")
    expect(sources).not.toContain("runbook.md")
  })

  it("nome com menos de 3 caracteres avisa em vez de procurar", () => {
    expect(mentionGroups(mentions, "db.md")).toEqual({
      shortName: true,
      groups: [],
    })
  })

  it("CA-BACK-003-01 (modelo) — rapidamente não é menção de api", () => {
    expect(mentionGroups(mentions, "api.md").groups).toEqual([])
  })
})
