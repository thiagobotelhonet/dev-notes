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
- Correções da validação no app desktop (Windows): abrir o vault duas vezes
  seguidas não deixa mais um observador de arquivos órfão (links voltavam a
  ficar ambíguos depois de renomear); renomear a pasta do vault com o app
  aberto passa a ser detectado; mudanças externas em lote são tratadas de uma
  vez; menu "…" da árvore mais largo; bloco `![[nota#Seção]]` mantém o nome da
  seção quando a nota não existe.
- `pnpm dev` e `pnpm dev:mock` passam a usar a porta 5000.
- Feature 003 — Backlinks (`specs/003-backlinks/`): painel à direita com as
  notas que apontam para a nota aberta e as menções sem link, que podem virar
  link. Componentes shadcn novos: `item` e `scroll-area`.
- Código sem uso (import, variável, parâmetro) passa a ser barrado pelo Biome,
  como erro, e não mais pelo TypeScript: a pasta gerada `ui/` fica de fora
  (CMP-01).
