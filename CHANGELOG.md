# Changelog

## Não lançado

- O projeto nasce do react-standards-template (commit `4d2ad32`, ADR-002) e
  vira app desktop Tauri 2: saem TanStack Router, Query e Table, ky, MSW, as
  rotas, o módulo de sessão e o gerador de projetos (ADR-011).
- Dependências novas: Tauri 2.12.0 (`@tauri-apps/api`, `@tauri-apps/cli`),
  `@tauri-apps/plugin-fs` 2.6.0, `@tauri-apps/plugin-dialog` 2.8.0, Zustand,
  CodeMirror 6 e as fontes locais Inter e JetBrains Mono no lugar da Geist.
- `docs/standards.md` adaptado: saem `ROT-*`, `API-*`, `SEG-*` e as regras
  ligadas a HTTP e rotas; entram as regras de layout `LAY-01..09`.
- Feature 001 — Vault e Notas (`specs/001-vault-notas/`).
- Dependência nova: `@codemirror/autocomplete` 6.20.3 (autocomplete de links).
- Feature 002 — Links e Incorporação (`specs/002-links-incorporacao/`):
  estados do link, seguir link, criar nota pelo link pendente, autocomplete
  e incorporação `![[nota]]`. Primeiro dado do app no vault:
  `.devnotes/deleted-notes.json` (ADR-009).
