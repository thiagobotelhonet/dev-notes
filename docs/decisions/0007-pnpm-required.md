---
status: aceita
date: 2026-09-20
---

# pnpm obrigatório

## Contexto

- As versões estão fixadas no `pnpm-lock.yaml`, sem intervalos.
- Cada gerenciador tem o seu arquivo de trava e resolve versões do seu jeito.

## Decisão

pnpm, declarado em `packageManager` no `package.json`, com Node 24
(`.node-version` e `engines`). Sem npm ou yarn.

## Consequências

- `npm install` ou `yarn` criariam outra trava, com outras versões, e a cópia
  gerada pelo template deixaria de ser reproduzível.
- Para descobrir a versão instalada de um pacote, leia
  `node_modules/<pacote>/package.json` (FER-02).
