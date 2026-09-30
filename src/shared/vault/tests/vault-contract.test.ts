import { describe, expect, it } from "vitest"
import {
  createMemoryVaultSession,
  type MemoryVaultOptions,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "../adapters/memory/memory-vault"
import type { ExternalChange, VaultPath } from "../vault.types"

type Harness = MemoryVaultSession

/** Behavior every adapter must have; on Tauri it is checked by hand (quickstart §6). */
function runVaultContract(
  name: string,
  createSession: (
    seed?: Record<VaultPath, string>,
    options?: MemoryVaultOptions
  ) => Harness
) {
  const seed = {
    "infra.md": "[[deploy]]",
    "deploy.md": "# deploy",
    "backend/api.md": "# api",
    ".devnotes/config.json": "{}",
    "backend/.rascunho.md": "oculto",
  }
  const openVault = async (options?: MemoryVaultOptions) => {
    const session = createSession(seed, options)
    const vault = await session.open(memoryVaultRoot)
    return { session, vault }
  }

  describe(`contrato de shared/vault — ${name}`, () => {
    it("list() ignora nomes iniciados por ponto", async () => {
      const { vault } = await openVault()
      const paths = (await vault.storage.list()).map((entry) => entry.path)
      expect(paths).toEqual([
        "backend",
        "backend/api.md",
        "deploy.md",
        "infra.md",
      ])
    })

    it("list() classifica e nomeia as entradas", async () => {
      const { vault } = await openVault()
      const api = (await vault.storage.list()).find(
        (entry) => entry.path === "backend/api.md"
      )
      expect(api).toMatchObject({
        path: "backend/api.md",
        kind: "note",
        name: "api",
      })
    })

    it("list() traz modifiedAt: 0 nas pastas e a hora do arquivo, que aumenta a cada writeText", async () => {
      const { vault } = await openVault()
      const entry = async (path: VaultPath) =>
        (await vault.storage.list()).find((item) => item.path === path)
      expect((await entry("backend"))?.modifiedAt).toBe(0)
      const before = (await entry("deploy.md"))?.modifiedAt ?? 0
      expect(before).toBeGreaterThan(0)
      await vault.storage.writeText("deploy.md", "# deploy\n\nnovo")
      expect((await entry("deploy.md"))?.modifiedAt).toBeGreaterThan(before)
    })

    it("writeText cria a pasta pai", async () => {
      const { vault } = await openVault()
      await vault.storage.writeText("novos/sub/nota.md", "oi")
      expect(await vault.storage.exists("novos/sub")).toBe(true)
      expect(await vault.storage.readText("novos/sub/nota.md")).toBe("oi")
    })

    it("createFolder falha com already-exists, inclusive só por maiúsculas", async () => {
      const { vault } = await openVault()
      await expect(vault.storage.createFolder("Backend")).rejects.toMatchObject(
        {
          code: "already-exists",
        }
      )
      await vault.storage.createFolder("servicos")
      expect(await vault.storage.exists("servicos")).toBe(true)
    })

    it("move falha com already-exists quando o destino existe", async () => {
      const { vault } = await openVault()
      await expect(
        vault.storage.move("deploy.md", "INFRA.md")
      ).rejects.toMatchObject({ code: "already-exists" })
    })

    it('move("api.md", "API.md") muda só as maiúsculas', async () => {
      const { vault } = await openVault()
      await vault.storage.move("backend/api.md", "backend/API.md")
      expect(await vault.storage.exists("backend/API.md")).toBe(true)
      expect(await vault.storage.readText("backend/API.md")).toBe("# api")
    })

    it("move de pasta leva o conteúdo", async () => {
      const { vault } = await openVault()
      await vault.storage.createFolder("servicos")
      await vault.storage.move("backend", "servicos/backend")
      expect(await vault.storage.readText("servicos/backend/api.md")).toBe(
        "# api"
      )
      expect(await vault.storage.exists("backend")).toBe(false)
    })

    it("readText e writeText preservam BOM e CRLF byte a byte (FR-004)", async () => {
      const { vault } = await openVault()
      const text = "\uFEFFlinha 1\r\nlinha 2\r\n"
      await vault.storage.writeText("windows.md", text)
      expect(await vault.storage.readText("windows.md")).toBe(text)
      const [many] = await vault.storage.readMany(["windows.md"])
      expect(many.content).toBe(text)
    })

    it("readMany devolve na ordem pedida e deixa de fora o que sumiu", async () => {
      const { vault } = await openVault()
      const result = await vault.storage.readMany([
        "infra.md",
        "sumiu.md",
        "backend/api.md",
      ])
      expect(result).toEqual([
        { path: "infra.md", content: "[[deploy]]" },
        { path: "backend/api.md", content: "# api" },
      ])
    })

    it("moveToTrash remove da listagem", async () => {
      const { session, vault } = await openVault()
      await vault.trash.moveToTrash("deploy.md")
      expect(await vault.storage.exists("deploy.md")).toBe(false)
      expect(session.trash.removed).toEqual(["deploy.md"])
    })

    it("lixeira indisponível rejeita com trash-unavailable sem alterar nada", async () => {
      const { session, vault } = await openVault()
      session.trash.setAvailable(false)
      await expect(vault.trash.moveToTrash("deploy.md")).rejects.toMatchObject({
        code: "trash-unavailable",
      })
      expect(await vault.storage.exists("deploy.md")).toBe(true)
    })

    it("o observador recebe as mudanças externas e não as do próprio app", async () => {
      const { session, vault } = await openVault()
      const received: ExternalChange[] = []
      vault.watcher.subscribe((changes) => received.push(...changes))
      await vault.storage.writeText("deploy.md", "gravado pelo app")
      await vault.storage.move("infra.md", "infra2.md")
      await session.flushEvents()
      expect(received).toEqual([])
      await session.simulateExternal(
        { kind: "modified", path: "deploy.md" },
        "de fora"
      )
      expect(received).toEqual([{ kind: "modified", path: "deploy.md" }])
    })

    it("raiz removida gera removed com path vazio e bloqueia as chamadas seguintes", async () => {
      const { session, vault } = await openVault()
      const received: ExternalChange[] = []
      vault.watcher.subscribe((changes) => received.push(...changes))
      await session.simulateExternal({ kind: "removed", path: "" })
      expect(received).toEqual([{ kind: "removed", path: "" }])
      await expect(vault.storage.list()).rejects.toMatchObject({
        code: "vault-unavailable",
      })
    })

    it.each(["../fora.md", "/absoluto.md"])(
      "caminho fora da raiz (%s) rejeita com invalid-name",
      async (path) => {
        const { vault } = await openVault()
        await expect(vault.storage.readText(path)).rejects.toMatchObject({
          code: "invalid-name",
        })
      }
    )

    it("appData.read de arquivo inexistente devolve null", async () => {
      const { vault } = await openVault()
      expect(await vault.appData.read("deleted-notes.json")).toBeNull()
    })

    it("appData.write seguido de read devolve o mesmo conteúdo", async () => {
      const { vault } = await openVault()
      await vault.appData.write("deleted-notes.json", '{"version":1}')
      expect(await vault.appData.read("deleted-notes.json")).toBe(
        '{"version":1}'
      )
      expect(await vault.appData.read("config.json")).toBe("{}")
    })

    it.each(["../x.json", "Notas.json", "x.txt", "a/b.json", ""])(
      "nome de dado do app fora do padrão (%s) rejeita com invalid-name",
      async (name) => {
        const { vault } = await openVault()
        await expect(vault.appData.read(name)).rejects.toMatchObject({
          code: "invalid-name",
        })
        await expect(vault.appData.write(name, "{}")).rejects.toMatchObject({
          code: "invalid-name",
        })
      }
    )

    it("o dado do app não aparece em list() nem chega ao watcher", async () => {
      const { session, vault } = await openVault()
      const received: ExternalChange[] = []
      vault.watcher.subscribe((changes) => received.push(...changes))
      await vault.appData.write("deleted-notes.json", "{}")
      await session.flushEvents()
      const paths = (await vault.storage.list()).map((entry) => entry.path)
      expect(paths.some((path) => path.includes("deleted-notes"))).toBe(false)
      expect(received).toEqual([])
    })

    it("lastOpened é null sem vault anterior e o VaultRef depois de um open", async () => {
      const session = createSession(seed)
      expect(await session.lastOpened()).toBeNull()
      await session.open(memoryVaultRoot)
      expect(await session.lastOpened()).toMatchObject({
        root: memoryVaultRoot,
      })
    })

    it("último vault que não existe mais: lastOpened devolve o ref e o open rejeita", async () => {
      const gone = {
        root: "/sumiu",
        name: "sumiu",
        lastOpenedAt: "2026-09-01T00:00:00Z",
      }
      const session = createSession(seed, { lastOpened: gone })
      expect(await session.lastOpened()).toEqual(gone)
      await expect(session.open(gone.root)).rejects.toMatchObject({
        code: "vault-unavailable",
      })
    })

    it("pickFolder devolve null quando o usuário cancela", async () => {
      expect(
        await createSession(seed, { pickResult: null }).pickFolder()
      ).toBeNull()
      expect(await createSession(seed).pickFolder()).toBe(memoryVaultRoot)
    })

    it("open de pasta que não veio do seletor rejeita com vault-unavailable", async () => {
      await expect(createSession(seed).open("/outra")).rejects.toMatchObject({
        code: "vault-unavailable",
      })
    })
  })
}

runVaultContract("memory", createMemoryVaultSession)
