---
status: aceita
date: 2026-09-30
id: ADR-007
---

# ADR-007 — MiniSearch em memória para a busca

## Contexto

- A spec 004 pede busca em nome, conteúdo, tags e propriedades, com filtros,
  relevância e resposta em até 0,5 s num vault de 5.000 notas (SC-002).
- O app é local e offline (constituição, princípio I), e índices são
  descartáveis e reconstruídos a partir dos arquivos (princípio II).
- O índice de links (spec 003) já guarda o texto de cada nota (`textOf`), então
  buscar não precisa ler o disco.

## Decisão

- `minisearch` 7.2.0 (MIT, sem dependências) indexa nome e texto de cada nota,
  em memória, no módulo `features/search`. Ele acha e ordena as notas
  (prefixo, "todas as palavras", peso maior para o nome); uma varredura própria
  acha as posições no arquivo, só para os resultados mostrados
  (`specs/004-busca/research.md`, R1 a R3).
- O índice nasce quando o índice de links fica pronto, em lotes de 500 notas,
  e se reconcilia com `entries` e `textOf` 300 ms depois de cada mudança.
- O estado do índice (em construção ou pronto, e a revisão que avisa as telas
  para buscar de novo) fica numa store Zustand do módulo (`search.store.ts`):
  é do vault inteiro e lido pelo painel da busca. O texto digitado, o limite
  de resultados e o foco do campo ficam no componente (EST-03).
- Tags e propriedades são lidas do texto, com `yaml` 2.9.1 para o bloco do
  topo, só para a busca; nada é reescrito.

## Consequências

- Zero infraestrutura, offline, e respostas medidas de 0,06 s (busca rápida)
  e 0,24 s (busca completa) no app desktop com 5.000 notas.
- Memória extra proporcional ao vault (termos, texto normalizado e metadados).
  Para vaults muito maiores, o plano B é mover a indexação para um Web Worker
  ou para o Rust (`arquitetura.md` §13).
- Nada é gravado: fechar o app descarta o índice, e reabrir o reconstrói
  (1,35 s até a busca responder em 5.000 notas).
