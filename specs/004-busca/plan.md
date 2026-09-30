# Implementation Plan: Busca

**Branch**: `main` (trabalho direto na main) | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-busca/spec.md` + o código das specs 001 a 003 ·
Constituição 1.0.1

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A 004 traz as duas buscas da RN-BUSCA-005:

- **rápida** (`Ctrl+P`): abre uma nota pelo nome, só com o teclado, na mesma ordem do
  autocomplete de links;
- **completa** (`Ctrl+Shift+F`, aba "Busca" na lateral esquerda): nome, conteúdo (inclusive
  código), tags e propriedades, sem maiúsculas nem acentos, com filtros `tag:`, `pasta:` e de
  propriedade, sugestões de valores, nome antes de conteúdo e trechos destacados que abrem a nota
  no ponto.

Abordagem técnica:

- Módulo novo `search`. O MiniSearch acha e ordena as notas; uma varredura própria acha as
  posições no arquivo para os trechos e para abrir no ponto (research R1, R2).
- O texto vem do `LinkIndex.textOf` da 003: nada é lido do disco para buscar. O índice de busca
  se reconcilia com `entries` e `textOf` a cada mudança, o que cobre gravação, alteração externa,
  renomear, mover, excluir e linkar menção sem ouvir cada evento (R3).
- Tags e propriedades são lidas do texto, só para a busca, com o parser `yaml` (R4, R5).
- A cor do destaque passa a ser desenhada só pelo `app-note-list` (`brand` a 20%), e fica registrada no
  `docs/brand.md` (R12).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict); Rust stable ≥ 1.90 (sem mudança em `src-tauri/`)

**Primary Dependencies**:

| Camada | Tecnologia | Versão |
| --- | --- | --- |
| Busca | `minisearch` (novo, MIT, sem dependências) | 7.2.0 |
| Propriedades | `yaml` (novo, ISC, sem dependências) | 2.9.1 |
| UI | shadcn/ui `base-nova`: `Tabs` e `Combobox` (novos, pela CLI); `Command`, `Dialog`, `InputGroup`, `Item`, `ScrollArea`, `Button`, `Empty`, `Skeleton`, `Tooltip`, `Kbd` (já instalados) | registro do lockfile; Base UI 1.8.0 |
| Estado | Zustand | 5.0.15 |

**Storage**: N/A. O índice de busca é derivado e fica em memória; nada é gravado.

**Testing**: Vitest + Testing Library sobre o adapter de memória; Playwright no `dev:mock`;
medição de 5.000 notas no adapter de memória e no app desktop.

**Target Platform**: desktop Windows 10+, macOS 12+ e Linux, via Tauri 2

**Project Type**: desktop-app (frontend React + núcleo Rust fino)

**Performance Goals**: busca rápida ≤ 0,3 s por tecla (SC-001); busca completa ≤ 0,5 s depois
de parar de digitar (SC-002); resultado em dia ≤ 2 s depois de uma mudança (SC-003); índice pronto
≤ 5 s depois de o vault abrir, em lotes, sem atrasar o resto (SC-004).

**Constraints**: buscar nunca grava (FR-022); offline (FR-023); só notas Markdown visíveis
(FR-024); destaque legível nos dois temas (FR-025).

**Scale/Scope**: 4 histórias, 25 requisitos funcionais, 6 critérios de sucesso; 2 dependências
npm, 2 componentes shadcn, 1 módulo novo, 0 composições `app-*` novas (`app-note-list` muda).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio / seção | Como o plano atende | Pré | Pós |
| --- | --- | --- | --- |
| **I. Local-first e offline** | `minisearch` e `yaml` rodam no navegador, sem rede; tudo sai do índice em memória. | ✅ | ✅ |
| **II. Arquivos são a verdade** | Índice de busca só em memória, reconstruído ao abrir o vault e reconciliado com os arquivos; tags e propriedades lidas, nunca reescritas; frontmatter YAML compatível com Obsidian. | ✅ | ✅ |
| **III. `shared/vault`** | Nenhuma capacidade nova de sistema; o texto vem do índice de links, que já lê pelo `shared/vault`. | ✅ | ✅ |
| **IV. 100% shadcn** | `Tabs` e `Combobox` instalados pela CLI (CMP-01) depois de consultar o registro (LAY-08: não há "autocomplete" no shadcn); resto já instalado; nenhuma peça nativa (CMP-02). | ✅ | ✅ |
| **V. LAY / COR** | Busca completa em `app-panel` (LAY-03) com `app-note-list` (LAY-02), dentro do `app-shell` (LAY-01); atalhos com `Kbd` (LAY-06); destaque com o token `brand` a 20% (princípio V: destaques usam `brand`), contraste 14,2:1 e 14,0:1, registrado no `brand.md` (LAY-09). | ✅ | ✅ |
| Restrições técnicas | Módulo `search` com `model/` puro e contrato em `index.ts`; `snippetOf` vai para `shared/lib` porque ganha o segundo uso; `app-command` não nasce agora porque a busca rápida não precisa de grupos com atalhos (COD-04, research R10). | ✅ | ✅ |
| Fluxo e portões | Todo CA-* vira teste Vitest com o ID no nome; jornada no Playwright; `pnpm verify` e validação no app desktop. | ✅ | ✅ |

**Resultado**: nenhum princípio violado.

## Project Structure

### Documentation (this feature)

```text
specs/004-busca/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões R1..R13
├── data-model.md        # Phase 1 — consulta, metadados, resultado, índice
├── quickstart.md        # Phase 1 — roteiro de validação
├── contracts/
│   ├── modules.md       # exports novos de search, links, shared/lib e app-note-list
│   └── ui.md            # abas, busca completa, busca rápida, textos e destaque
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Só aparecem arquivos criados (**novo**) ou alterados (**muda**) nesta feature.

```text
src/
├── app/
│   ├── workspace.tsx                          # muda: abas Arquivos/Busca, busca rápida, atalhos
│   └── tests/workspace-search.test.tsx        # novo
├── features/
│   ├── search/                                # novo módulo
│   │   ├── components/search-panel.tsx        # aba Busca (app-panel + Combobox + app-note-list)
│   │   ├── components/quick-search-dialog.tsx # busca rápida (CommandDialog)
│   │   ├── model/search.query.ts              # dividir a consulta (R6)
│   │   ├── model/search.metadata.ts           # tags e propriedades (R4, R5)
│   │   ├── model/search.index.ts              # MiniSearch, reconciliação, ordem (R1, R3, R7)
│   │   ├── model/search.occurrences.ts        # varredura com posições no arquivo (R2, R8)
│   │   ├── model/search.suggestions.ts        # sugestões de filtro (RN-BUSCA-006)
│   │   ├── search.store.ts                    # estado do índice do vault aberto (ADR-007)
│   │   ├── tests/                             # query, metadata, index, suggestions, panel, quick, performance
│   │   ├── index.ts
│   │   └── README.md                          # RN-BUSCA-001..006
│   ├── backlinks/
│   │   ├── components/backlinks-panel.tsx     # muda: manda o trecho em partes ao app-note-list
│   │   ├── model/backlinks.list.ts            # muda: snippetOf vem de shared/lib
│   │   └── README.md                          # muda
│   └── links/
│       ├── index.ts                           # muda: exporta codeRanges e foldText
│       └── README.md                          # muda
└── shared/
    ├── lib/snippet.ts                         # novo (sai de backlinks)
    ├── lib/snippet.test.ts                    # novo, ao lado do arquivo (TST-02; casos que estavam em backlinks-list.test.ts)
    ├── components/app-note-list.tsx           # muda: trecho em partes, destaque, meta e onOpen do item
    └── components/ui/tabs.tsx, ui/combobox.tsx  # novos, pela CLI do shadcn
e2e/search.spec.ts                             # novo
src/mocks/demo-vault.ts                        # muda: tags, propriedades e snippets
docs/brand.md                                  # muda: "Destaque de ocorrência"
```

**Structure Decision**: mesma estrutura das specs anteriores. `search` é o módulo previsto na
`arquitetura.md` §5 e §9; a leitura de tags e propriedades nasce dentro dele e muda para os módulos
`tags` e `properties` quando eles existirem.

## Fases de implementação (visão para `/speckit-tasks`)

1. **Fundação**: dependências `minisearch` e `yaml`; `tabs` e `combobox` pelo shadcn;
   `snippetOf` em `shared/lib`; `app-note-list` com trecho em partes e destaque (backlinks
   ajustado); `codeRanges` e `foldText` exportados; seed do `dev:mock`; `docs/brand.md`.
2. **US1 (P1)**: busca rápida com `suggestLinks`, botão e `Ctrl+P` no `workspace`.
3. **US2 (P1)**: consulta (palavras e frases), índice com reconciliação, ordem, varredura de
   ocorrências, aba "Busca" com estados, "Mostrar mais", abrir no ponto, `Ctrl+Shift+F/E`.
4. **US3 (P2)**: tags e propriedades lidas do texto; filtros `tag:`, `pasta:` e de propriedade.
5. **US4 (P3)**: sugestões de valores no `Combobox`.
6. **Acabamento**: Playwright, metas de desempenho, documentação (`regras-de-negocio.md` com os CA
   novos, `arquitetura.md`, READMEs, CHANGELOG), revisão `app-review-standards`, validação no app
   desktop.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Nenhum princípio foi violado. Registro o que se afasta do padrão:

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Duas dependências npm novas (`minisearch`, `yaml`) | Relevância e prefixo em 5.000 notas em milissegundos (SC-002); YAML de verdade para as propriedades (listas, aspas, blocos) | Varredura linear sem relevância; parser próprio de YAML quebra em casos comuns (research R1, R5) |
| O índice de busca ocupa memória além do texto que o índice de links já guarda (termos e metadados, na ordem de dezenas de MB em 5.000 notas grandes) | Consultas em milissegundos sem ler o disco | Buscar direto em `textOf` a cada tecla: sem relevância e lento em vaults grandes |
