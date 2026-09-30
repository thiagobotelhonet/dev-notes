---
status: substituída
superseded_by: 0014-remove-tanstack-router-query-table.md (ADR-011) e 0010-tauri-desktop-shell.md (ADR-001)
date: 2026-09-20
---

# React com Vite e TanStack Router, publicado como arquivo estático

## Contexto

- O alvo são sistemas internos, portais e painéis autenticados, com uma API
  separada e já existente.
- O projeto de referência (hub logístico) usa TanStack Start em modo SPA, o que
  acrescenta build e pré-renderização de servidor.
- Nenhum requisito atual pede indexação por buscador nem renderização no
  servidor.

## Decisão

React com Vite e TanStack Router, gerando um build estático em `dist/`. O
roteador é o de arquivos, com divisão automática de código.

## Consequências

- Publicar é copiar arquivos: qualquer servidor estático com retorno para
  `index.html` serve (AMB-04).
- Não há camada de servidor onde esconder segredo: tudo que o front-end sabe, o
  navegador sabe (AMB-01).
- Se um produto público precisar de SEO ou renderização inicial no servidor, a
  fundação é reavaliada — TanStack Start em SPA é o caminho mais curto a partir
  daqui, e continua uma decisão válida no projeto de referência.
