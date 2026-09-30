import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createWriteLedger } from "../vault.ledger"

describe("write ledger", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("reconhece a escrita do app só dentro de 2 s", () => {
    const ledger = createWriteLedger()
    ledger.record("deploy.md", "H")
    vi.advanceTimersByTime(1999)
    expect(ledger.matches("deploy.md", "H")).toBe(true)
    vi.advanceTimersByTime(2)
    expect(ledger.matches("deploy.md", "H")).toBe(false)
  })

  it("hash diferente não é eco do app", () => {
    const ledger = createWriteLedger()
    ledger.record("deploy.md", "H")
    expect(ledger.matches("deploy.md", "outro")).toBe(false)
    expect(ledger.matches("infra.md", "H")).toBe(false)
  })

  it("remoção registrada casa com arquivo inexistente", () => {
    const ledger = createWriteLedger()
    ledger.record("deploy.md", null)
    expect(ledger.matches("deploy.md", null)).toBe(true)
    expect(ledger.matches("deploy.md", "H")).toBe(false)
  })

  it("pasta movida pelo app cobre tudo o que está dentro", () => {
    const ledger = createWriteLedger()
    ledger.recordTree("servicos/backend")
    expect(ledger.matches("servicos/backend/api.md", "qualquer")).toBe(true)
    expect(ledger.matches("servicos/backend", null)).toBe(true)
    expect(ledger.matches("servicos/outro.md", null)).toBe(false)
  })
})
