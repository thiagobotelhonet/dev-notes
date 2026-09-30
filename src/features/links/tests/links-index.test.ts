import { describe, expect, it } from "vitest"
import { createLinkIndex } from "../model/links.index"
import { parseLinks } from "../model/links.parser"

const vault = {
  "infra.md": "[[deploy]] [[backend/api]] [[util]] [[pendente]]",
  "deploy.md": "# deploy",
  "backend/api.md": "[[deploy]]",
  "backend/util.md": "",
  "frontend/util.md": "",
  "mapa.canvas": JSON.stringify({
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
  }),
}

describe("createLinkIndex", () => {
  it("resolve pela RN-LINK-004: com / é caminho exato; sem / é a nota com a mesma nameKey", () => {
    const index = createLinkIndex(vault)
    const [deploy, api] = parseLinks("infra.md", "[[DEPLOY]] [[Backend/API]]")
    expect(index.resolve(deploy)).toEqual({
      status: "resolved",
      path: "deploy.md",
    })
    expect(index.resolve(api)).toEqual({
      status: "resolved",
      path: "backend/api.md",
    })
  })

  it("nome repetido deixa o link ambíguo", () => {
    const index = createLinkIndex(vault)
    const [util] = parseLinks("infra.md", "[[util]]")
    expect(index.resolve(util)).toEqual({
      status: "ambiguous",
      candidates: ["backend/util.md", "frontend/util.md"],
    })
  })

  it("nota inexistente deixa o link sem destino", () => {
    const index = createLinkIndex(vault)
    const [pendente] = parseLinks("infra.md", "[[pendente]]")
    expect(index.resolve(pendente)).toEqual({ status: "broken" })
  })

  it("linksTo devolve as ocorrências que resolvem para a nota", () => {
    const index = createLinkIndex(vault)
    expect(
      index
        .linksTo("deploy.md")
        .map((link) => link.source)
        .sort()
    ).toEqual(["backend/api.md", "infra.md"])
  })

  it("canvasRefsTo devolve os canvas com cartão do arquivo", () => {
    const index = createLinkIndex(vault)
    expect(index.canvasRefsTo("deploy.md")).toEqual(["mapa.canvas"])
    expect(index.canvasRefsTo("infra.md")).toEqual([])
  })

  it("update e remove mantêm o índice coerente", () => {
    const index = createLinkIndex(vault)
    index.update("infra.md", "nada aqui")
    expect(index.linksTo("deploy.md").map((link) => link.source)).toEqual([
      "backend/api.md",
    ])
    index.update("novo.md", "[[deploy]]")
    expect(index.linksTo("deploy.md")).toHaveLength(2)
    index.remove("deploy.md")
    expect(index.linksTo("deploy.md")).toEqual([])
    const [link] = parseLinks("novo.md", "[[deploy]]")
    expect(index.resolve(link)).toEqual({ status: "broken" })
    index.update("mapa.canvas", "{ inválido")
    expect(index.canvasRefsTo("deploy.md")).toEqual([])
  })

  it("rename troca o caminho da nota e das ocorrências dela", () => {
    const index = createLinkIndex(vault)
    index.rename("backend/api.md", "servicos/api.md")
    const [api] = parseLinks("x.md", "[[api]]")
    expect(index.resolve(api)).toEqual({
      status: "resolved",
      path: "servicos/api.md",
    })
    expect(
      index
        .linksTo("deploy.md")
        .map((link) => link.source)
        .sort()
    ).toEqual(["infra.md", "servicos/api.md"])
  })
})

describe("textOf", () => {
  it("devolve o texto do último update e some com remove", () => {
    const index = createLinkIndex(vault)
    expect(index.textOf("deploy.md")).toBe("# deploy")
    expect(index.textOf("nao-existe.md")).toBeUndefined()
    index.update("deploy.md", "# deploy\n\nnovo")
    expect(index.textOf("deploy.md")).toBe("# deploy\n\nnovo")
    index.remove("deploy.md")
    expect(index.textOf("deploy.md")).toBeUndefined()
  })

  it("rename leva o texto para o caminho novo", () => {
    const index = createLinkIndex(vault)
    index.rename("backend/api.md", "servicos/api.md")
    expect(index.textOf("backend/api.md")).toBeUndefined()
    expect(index.textOf("servicos/api.md")).toBe("[[deploy]]")
  })
})
