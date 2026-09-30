---
status: substituída
superseded_by: 0014-remove-tanstack-router-query-table.md (ADR-011)
date: 2026-09-20
---

# O endereço é dono do estado da lista, em português

## Contexto

- Filtro, busca, página e ordenação guardados em `useState` somem na recarga e
  não podem ser compartilhados por link.
- O endereço é lido por pessoas; o contrato da API é lido por máquinas, e os
  dois envelhecem em ritmos diferentes.

## Decisão

Esses quatro estados vivem na URL, validados por Zod com `default` e `catch`
(ROT-04, ROT-05). Os parâmetros do endereço são em português (`pagina`,
`porPagina`, `ordenarPor`, `ordem`); o serviço traduz para os nomes do contrato
(`page`, `pageSize`, `sort`, `order`) em um lugar só (IDI-03).

## Consequências

- Recarregar, compartilhar o link e voltar reproduzem a mesma tela.
- Valor no padrão é retirado do endereço por `stripSearchParams` (ROT-06), e a
  busca escreve com `replace` para não encher o histórico (ROT-07).
- Trocar o backend muda o serviço; o endereço da aplicação continua igual.
