---
status: aceita
date: 2026-09-30
id: ADR-011
---

# ADR-011 — Remover TanStack Router, Query e Table

## Contexto

- O template foi feito para SPA com backend HTTP: rotas no endereço, cache de
  requisições e tabelas paginadas no servidor.
- O Dev Notes é um app desktop de janela única, sem API; os dados são arquivos
  lidos por `shared/vault`.

## Decisão

Sair com TanStack Router, Query e Table, `ky`, MSW, `src/routes/`,
`shared/api/` e as regras que só existiam por causa deles (`ROT-*`, `API-*`,
`SEG-*`, `EST-01`, `EST-04`, `CMP-05`, `CMP-06`, `IDI-03`, `TST-06`, `AMB-04`,
`FER-03`) (`specs/001-vault-notas/research.md` R1).

## Consequências

- Menos dependências e menos código de ligação, contra perder convenções
  herdadas que aqui não teriam uso real (COD-04).
- A casca do app mora em `src/app/`; o estado que o endereço guardava vira
  estado de workspace (ADR-006).
- Substitui as decisões 0001 (na parte do TanStack Router) e 0004.
- O TanStack Form continua: ele entra com as specs de propriedades e
  configurações.
