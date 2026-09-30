import type { ExternalChange, VaultSession } from "./vault.types"

export * from "./vault.paths"
export * from "./vault.types"

declare global {
  interface Window {
    /** Only in `pnpm dev:mock`: lets Playwright simulate outside edits. */
    __devnotesMock?: {
      simulateExternal(change: ExternalChange, content?: string): Promise<void>
    }
  }
}

let session: Promise<VaultSession> | null = null

/** Mode is resolved at build time, so the memory adapter never reaches dist/ (AMB-03). */
async function createSession(): Promise<VaultSession> {
  if (import.meta.env.MODE === "mock") {
    const [{ createMemoryVaultSession, memoryVaultRoot }, { demoVault }] =
      await Promise.all([
        import("./adapters/memory/memory-vault"),
        import("../../mocks/demo-vault"),
      ])
    const memory = createMemoryVaultSession(demoVault, {
      lastOpened: {
        root: memoryVaultRoot,
        name: "vault de demonstração",
        lastOpenedAt: new Date().toISOString(),
      },
    })
    window.__devnotesMock = {
      simulateExternal: (change, content) =>
        memory.simulateExternal(change, content),
    }
    return memory
  }
  const { createTauriVaultSession } = await import(
    "./adapters/tauri/tauri-vault"
  )
  return createTauriVaultSession()
}

export function getVaultSession(): Promise<VaultSession> {
  session ??= createSession()
  return session
}
