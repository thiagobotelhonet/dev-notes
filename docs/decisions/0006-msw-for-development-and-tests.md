---
status: substituída
superseded_by: 0013-shared-vault-adapters.md (ADR-008)
date: 2026-09-20
---

# MSW como API simulada, fora do build

## Contexto

- O template precisa rodar sozinho, com uma jornada de sessão e CRUD completa,
  antes de existir backend.
- Simulação escondida dentro dos serviços contamina o código de produção com
  desvios que ninguém lembra de tirar.

## Decisão

A simulação intercepta a rede com MSW, ligada por `main.tsx` apenas em
desenvolvimento no modo `mock`. Os testes usam os mesmos handlers. O worker é
servido por um plugin do Vite; não fica em `public/` (AMB-03).

## Consequências

- O caminho `serviço → Zod → consulta → tela` roda igual na simulação, no teste
  e contra a API real (TST-06).
- `pnpm build` roda `scripts/check-build.mjs` e falha se o worker ou as
  credenciais de demonstração vazarem para `dist/`.
- Código de aplicação não importa de `src/mocks/`; o Biome recusa. Teste pode.
- Os dados de demonstração ficam no `localStorage` do navegador e não provam
  nada sobre a segurança de um backend real.
