---
status: aceita
date: 2026-09-30
id: ADR-004
---

# ADR-004 — CodeMirror 6 como editor

## Contexto

- O editor de notas é o centro do produto e vai crescer: destaque de código,
  autocomplete de links, incorporações.
- O shadcn não tem editor de texto rico; a constituição (princípio IV) só
  admite exceção dentro do `app-editor-frame` (LAY-07).

## Decisão

CodeMirror 6 (`@codemirror/state`, `view`, `commands`, `lang-markdown`) desde a
feature 001, dentro do `app-editor-frame`, com tema feito só de tokens CSS
(`specs/001-vault-notas/research.md` R11).

## Consequências

- Extensível e rápido contra uma API de baixo nível: cada recurso do editor é
  uma extensão escrita no módulo `editor`.
- O CodeMirror só trabalha com `\n`: quebra de linha e BOM do arquivo são
  detectados na leitura e reaplicados ao gravar (FR-004).
- Começar com um `Textarea` do shadcn foi descartado: obrigaria a reescrever o
  estado de edição pendente depois.
