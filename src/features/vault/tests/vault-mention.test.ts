import { act } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { findMentions } from "@/features/links"
import type { ExternalChange } from "@/shared/vault"
import {
  createMemoryVaultSession,
  type MemoryVaultSession,
  memoryVaultRoot,
} from "@/shared/vault/adapters/memory/memory-vault"
import {
  onEntryEvent,
  useVaultStore,
  type VaultEvent,
  waitForIndex,
} from "../vault.store"

const seed = {
  "deploy.md": "# Deploy\n",
  "infra.md": "Ontem o deploy falhou.\n",
  "runbook.md": "﻿linha 1\r\nRodar o Deploy de novo.\r\n",
  "backend/api.md": "",
  "frontend/api.md": "",
  "notas.md": "a api nova\n",
  "duas.md": "deploy aqui e deploy ali\n",
}

let memory: MemoryVaultSession
const store = () => useVaultStore.getState()

beforeEach(async () => {
  memory = createMemoryVaultSession(seed, {
    lastOpened: { root: memoryVaultRoot, name: "v", lastOpenedAt: "" },
  })
  await store().restore(memory)
  await waitForIndex()
})

function mention(path: keyof typeof seed, name: string, position = 0) {
  const found = findMentions(seed[path], name)[position]
  return { path, ...found }
}

const link = (m: ReturnType<typeof mention>, target: string) =>
  act(() => store().linkMention(m, target))

describe("linkMention", () => {
  it("CA-BACK-002-01 (ação) — a menção vira link na nota que menciona", async () => {
    expect(await link(mention("infra.md", "deploy"), "deploy.md")).toBe(
      "linked"
    )
    expect(memory.files()["infra.md"]).toBe("Ontem o [[deploy]] falhou.\n")
  })

  it("CA-BACK-004-01 — o texto fica como estava escrito e o resto do arquivo, com BOM e CRLF, igual", async () => {
    expect(await link(mention("runbook.md", "deploy"), "deploy.md")).toBe(
      "linked"
    )
    expect(memory.files()["runbook.md"]).toBe(
      "﻿linha 1\r\nRodar o [[Deploy]] de novo.\r\n"
    )
  })

  it("CA-BACK-004-02 — com nome repetido, o link leva a pasta e mantém o texto", async () => {
    expect(await link(mention("notas.md", "api"), "backend/api.md")).toBe(
      "linked"
    )
    expect(memory.files()["notas.md"]).toBe("a [[backend/api|api]] nova\n")
  })

  it("CA-BACK-004-03 — arquivo alterado por fora antes de linkar: nada é gravado e o índice fica em dia", async () => {
    await memory.simulateExternal(
      { kind: "modified", path: "infra.md" },
      "texto novo sem a menção\n",
      { silent: true }
    )
    expect(await link(mention("infra.md", "deploy"), "deploy.md")).toBe(
      "changed"
    )
    expect(memory.files()["infra.md"]).toBe("texto novo sem a menção\n")
    expect(store().linkIndex?.textOf("infra.md")).toBe(
      "texto novo sem a menção\n"
    )
  })

  it("CA-BACK-004-04 — só a menção escolhida vira link", async () => {
    expect(await link(mention("duas.md", "deploy", 1), "deploy.md")).toBe(
      "linked"
    )
    expect(memory.files()["duas.md"]).toBe("deploy aqui e [[deploy]] ali\n")
  })

  it("falha ao gravar devolve failed e nada muda", async () => {
    memory.failWritesOn(["infra.md"])
    expect(await link(mention("infra.md", "deploy"), "deploy.md")).toBe(
      "failed"
    )
    expect(memory.files()["infra.md"]).toBe(seed["infra.md"])
  })

  it("a gravação é do próprio app: sem alteração externa, com data nova e evento rewritten", async () => {
    const received: ExternalChange[] = []
    store().vault?.watcher.subscribe((changes) => received.push(...changes))
    const events: VaultEvent[] = []
    const stop = onEntryEvent((event) => events.push(event))
    useVaultStore.setState({
      entries: store().entries.map((entry) => ({ ...entry, modifiedAt: 1000 })),
    })
    try {
      await link(mention("infra.md", "deploy"), "deploy.md")
      await memory.flushEvents()
      expect(received).toEqual([])
      expect(events).toContainEqual({ kind: "rewritten", path: "infra.md" })
      expect(
        store().entries.find((entry) => entry.path === "infra.md")?.modifiedAt
      ).toBeGreaterThan(1000)
      expect(
        store()
          .linkIndex?.linksTo("deploy.md")
          .map((l) => l.source)
      ).toContain("infra.md")
    } finally {
      stop()
    }
  })
})
