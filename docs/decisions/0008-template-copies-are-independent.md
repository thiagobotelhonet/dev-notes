---
status: substituída
superseded_by: o gerador saiu do projeto (ADR-002); a decisão vale só para o template de origem
date: 2026-09-20
---

# A cópia gerada é independente do template

## Contexto

- Uma biblioteca compartilhada precisa ser versionada, publicada e migrada a
  cada mudança de contrato.
- Hoje existe um punhado de aplicações, com necessidades visuais diferentes.

## Decisão

`pnpm create-project` copia os arquivos do template, sem histórico do git, sem
dependências instaladas e sem `.env` pessoal, e ajusta nome, título e
`storageKey`. A partir daí, cada cópia evolui sozinha.

## Consequências

- Correção feita no template não chega às cópias automaticamente: ela é
  descrita no `CHANGELOG.md` e levada à mão para quem precisa.
- Arquivo novo na raiz só entra nas cópias se for acrescentado à lista de
  `scripts/create-project.mjs` — inclusive documentação e regras de agente.
- Se o custo de propagar correções passar o custo de versionar e distribuir,
  vale reavaliar e extrair uma biblioteca.
