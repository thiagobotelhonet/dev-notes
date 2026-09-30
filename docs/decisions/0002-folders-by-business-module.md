---
status: aceita
date: 2026-09-20
---

# Pasta por assunto do negócio, com camada técnica dentro

## Contexto

- Organizar por tipo de arquivo (`components/`, `services/`, `hooks/` na raiz)
  espalha um assunto por cinco pastas.
- Padrão de mercado próximo: Bulletproof React, com `api/`, `components/` e
  `types/` dentro de cada módulo.
- No TanStack Router o arquivo de rota já é o lugar natural da composição da
  tela.

## Decisão

Cada assunto é uma pasta em `src/features/<assunto>/`, dona do próprio código:
`api/`, `components/`, `types/`, `tests/` e um `index.ts` que é o contrato
público. A tela mora na rota; o que é de mais de um módulo mora em
`src/shared/`, que nunca importa de `src/features`.

## Consequências

- Entender ou apagar uma funcionalidade inteira é mexer em uma pasta só
  (`docs/development.md`, "Remover o exemplo").
- Import para dentro de outro módulo é recusado pelo Biome (NOM-03); o acesso é
  pelo `index.ts` (NOM-06).
- O nome do arquivo precisa começar pelo assunto para o buscador do editor
  continuar útil com quinze módulos (NOM-04).
