import { describe, expect, it } from "vitest"
import { basenameOf, kindOf, type VaultEntry } from "@/shared/vault"
import { type DeletedNotes, withDeleted } from "../model/links.deleted"
import { createLinkIndex } from "../model/links.index"
import { parseLinks } from "../model/links.parser"
import { resolveLinkTarget } from "../model/links.target"

const files = {
  "infra.md": "",
  "deploy.md": "# Deploy\n\n## Rollback\n",
  "backend/api.md": "",
  "frontend/api.md": "",
  "backend/util.md": "",
  "frontend/util.md": "",
  "backend/infra.md": "",
  "mapa.canvas": "{}",
  "logo.png": "",
}
const entries: VaultEntry[] = Object.keys(files).map((path) => ({
  path,
  kind: kindOf(path),
  name: basenameOf(path),
  modifiedAt: 1,
}))
const index = createLinkIndex(
  Object.fromEntries(Object.entries(files).filter(([p]) => !p.endsWith(".png")))
)

function target(text: string, from = "infra.md", deleted: DeletedNotes = []) {
  const [link] = parseLinks(from, text)
  return resolveLinkTarget({ link, from, index, entries, deleted })
}

describe("resolveLinkTarget", () => {
  it("válido: nome único, sem diferença de maiúsculas, com .md escrito e caminho exato com /", () => {
    expect(target("[[deploy]]")).toEqual({ state: "valid", path: "deploy.md" })
    expect(target("[[Deploy]]")).toEqual({ state: "valid", path: "deploy.md" })
    expect(target("[[deploy.md]]")).toEqual({
      state: "valid",
      path: "deploy.md",
    })
    expect(target("[[backend/api]]")).toEqual({
      state: "valid",
      path: "backend/api.md",
    })
  })

  it("válido com seção: heading sem #; #^bloco abre a nota inteira", () => {
    expect(target("[[deploy#Rollback]]")).toEqual({
      state: "valid",
      path: "deploy.md",
      heading: "Rollback",
    })
    expect(target("[[deploy#^abc123]]")).toEqual({
      state: "valid",
      path: "deploy.md",
    })
  })

  it("ambíguo: nome repetido sem pasta, com as candidatas", () => {
    expect(target("[[util]]")).toEqual({
      state: "ambiguous",
      candidates: ["backend/util.md", "frontend/util.md"],
    })
  })

  it("arquivo: [[mapa.canvas]] aponta para o canvas e nunca vira pendente", () => {
    expect(target("[[mapa.canvas]]")).toEqual({
      state: "file",
      path: "mapa.canvas",
      kind: "canvas",
    })
    expect(target("[[logo.png]]")).toEqual({
      state: "file",
      path: "logo.png",
      kind: "other",
    })
  })

  it("quebrado: sem arquivo e com o caminho no registro de notas excluídas", () => {
    const deleted = withDeleted([], ["runbooks/rollback.md"], new Date())
    expect(target("[[runbooks/rollback]]", "infra.md", deleted)).toEqual({
      state: "broken",
      path: "runbooks/rollback.md",
    })
  })

  it("quebrado sem pasta: casa pelo nome e devolve o excluído mais recente", () => {
    const first = withDeleted(
      [],
      ["antigo/checklist.md"],
      new Date("2026-09-01T00:00:00Z")
    )
    const deleted = withDeleted(
      first,
      ["novo/Checklist.md"],
      new Date("2026-09-02T00:00:00Z")
    )
    expect(target("[[checklist]]", "infra.md", deleted)).toEqual({
      state: "broken",
      path: "novo/Checklist.md",
    })
  })

  it("pendente: com / o caminho do link; sem /, a pasta da nota que contém o link", () => {
    expect(target("[[runbooks/rollback]]")).toEqual({
      state: "pending",
      path: "runbooks/rollback.md",
    })
    expect(target("[[ideia nova]]", "backend/infra.md")).toEqual({
      state: "pending",
      path: "backend/ideia nova.md",
    })
    expect(target("[[ideia nova]]")).toEqual({
      state: "pending",
      path: "ideia nova.md",
    })
  })

  it("pendente com nome inválido continua pendente; quem valida é quem cria", () => {
    expect(target("[[a:b]]")).toEqual({ state: "pending", path: "a:b.md" })
  })
})
