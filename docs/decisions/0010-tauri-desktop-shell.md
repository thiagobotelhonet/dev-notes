---
status: aceita
date: 2026-09-30
id: ADR-001
---

# ADR-001 — Tauri 2 como shell desktop

## Contexto

- O Dev Notes é um app desktop local-first: as notas ficam só no computador do
  usuário e tudo funciona sem internet (constituição, princípio I).
- O front vem do react-standards-template (React + Vite, ADR-002).
- Precisa de acesso a arquivos, observação de mudanças, seletor de pasta e
  lixeira do sistema em Windows, macOS e Linux.

## Decisão

Tauri 2 (`tauri` 2.12.0, `plugin-fs` 2.6.0 com `watch`, `plugin-dialog`
2.8.0), com um núcleo Rust fino em `src-tauri/` para o que os plugins não
cobrem: listar o vault num IPC só, ler notas em lote, lixeira (crate `trash`)
e reabrir o último vault (`specs/001-vault-notas/research.md` R2–R4, R6).

## Consequências

- App leve, com o WebView do sistema, contra WebView diferente por sistema:
  a feature só fica pronta depois do roteiro manual nos três sistemas
  (`arquitetura.md` §13).
- O `plugin-fs` fica fixado na v2: a v3 alpha muda o evento de watch.
- Comandos Rust próprios não passam pelo escopo do `plugin-fs`; todo caminho é
  validado dentro da raiz do vault (`resolve_in_vault`) e coberto por
  `cargo test`, que entra no `pnpm verify`.
- Build desktop exige Rust e as dependências do Tauri na máquina e no CI.
- Substitui as decisões 0001 (rotas) e 0005 (sessão), que pressupunham uma
  SPA com backend.
