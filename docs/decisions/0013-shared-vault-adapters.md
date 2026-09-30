---
status: aceita
date: 2026-09-30
id: ADR-008
---

# ADR-008 — `shared/vault` com adapters Tauri e memória

## Contexto

- Toda regra de negócio lê e grava arquivos; testá-la contra o disco de
  verdade exigiria o Tauri em cada teste.
- Trocar Tauri por web, ou incluir Git e sync no futuro, não pode espalhar
  mudanças pelas features (constituição, princípio III).

## Decisão

Todo acesso ao sistema operacional passa pelas interfaces de `shared/vault`
(`VaultSession`, `VaultStorage`, `FileWatcher`, `Trash`), com dois adapters
equivalentes: Tauri (app desktop) e memória (Vitest, Playwright e
`pnpm dev:mock`). Uma suíte de contrato define o comportamento esperado
(`specs/001-vault-notas/contracts/shared-vault.md`, research R13 e R14).

## Consequências

- Dois usos reais desde o primeiro dia, o que passa na COD-04.
- Toda capacidade nova entra nos dois adapters e ganha caso na suíte de
  contrato.
- A suíte roda sozinha no adapter de memória; no Tauri, os mesmos casos são
  conferidos pelo `cargo test` e pelo roteiro manual do quickstart §6 até
  existir um job de CI desktop.
- O Biome proíbe `@tauri-apps/*` fora de `shared/vault/adapters/tauri/`.
- Substitui a decisão 0006 (MSW): não há mais API HTTP a simular.
