---
status: aceita
date: 2026-09-30
id: ADR-006
---

# ADR-006 — Zustand para estado de workspace

## Contexto

- A EST-03 herdada diz que não há store global.
- Explorador, editor, observador de arquivos e diálogos de conflito
  compartilham o vault aberto, a nota ativa e a edição pendente; passar isso
  por props ou contexto atravessaria o `app-shell` inteiro.

## Decisão

Uma store Zustand por feature dona do estado (`vault.store.ts`,
`note.store.ts`), registrada como exceção na EST-03 de `standards.md`
(`specs/001-vault-notas/research.md` R10). O índice de links fica em
`features/links/model`, não numa store React.

## Consequências

- Estado global real, com re-render só de quem lê cada parte, contra uma
  exceção à regra do template.
- Uma feature não importa a outra em ciclo: o `vault.store` avisa o editor por
  ganchos (`onBeforeMutate`, `onEntryEvent`) que o `note.store` registra.
- React Context foi descartado (re-render amplo e mais código de ligação), e
  `useSyncExternalStore` à mão reimplementaria o Zustand.
