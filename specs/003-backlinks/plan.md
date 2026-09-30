# Implementation Plan: Backlinks

**Branch**: `003-backlinks` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-backlinks/spec.md` + o código das specs 001 e 002
· Constituição 1.0.1

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A 003 dá a cada nota um painel à direita com:

- as notas que têm link para ela, com o trecho de cada link, e clique para ir até ele;
- uma seção recolhida com as notas que citam o nome sem link (palavra inteira, sem diferenciar
  maiúsculas, fora de link e de código, só para nomes com 3 caracteres ou mais);
- a ação "Linkar", que troca só aquela menção por um link e grava a nota que menciona.

Abordagem técnica:

- A regra da menção e o texto do link ficam em funções puras de `links`; o `LinkIndex` passa a
  guardar o texto das notas que já recebe (`textOf`), então nada precisa ser lido do disco ao abrir
  uma nota. A busca em 5.000 notas leva dezenas de milissegundos.
- `vault.store` ganha `linkMention`, com as garantias de gravação das specs anteriores (conferir o
  arquivo, registrar a escrita, avisar o editor).
- Módulo novo `backlinks` só com o painel; as composições `app-panel` e `app-note-list` e o lado
  direito do `app-shell` nascem aqui e servem às próximas specs (busca, histórico, snippets).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict); Rust stable ≥ 1.90 (sem mudança em `src-tauri/`)

**Primary Dependencies**:

| Camada | Tecnologia | Versão |
| --- | --- | --- |
| UI | shadcn/ui `base-nova`: `Item` e `ScrollArea` (novos, pela CLI); `Collapsible`, `Button`, `Badge`, `Tooltip`, `Kbd`, `Empty`, `Skeleton`, `Resizable` (já instalados) | registro do lockfile |
| Estado | Zustand | 5.0.15 |
| Editor | CodeMirror 6 | já instalado |

**Storage**: N/A. Tudo é derivado; a única escrita é a menção transformada em link, dentro da nota.

**Testing**: Vitest + Testing Library sobre o adapter de memória; Playwright no `dev:mock`;
medição de 5.000 notas no adapter de memória e no app desktop.

**Target Platform**: desktop Windows 10+, macOS 12+ e Linux, via Tauri 2

**Project Type**: desktop-app (frontend React + núcleo Rust fino)

**Performance Goals**: links no painel em ≤ 0,5 s e menções em ≤ 2 s com 5.000 notas (SC-001);
painel em dia ≤ 2 s depois de uma mudança (SC-003); linkar ≤ 1 s (SC-004).

**Constraints**: nada gravado ao exibir o painel (FR-017); offline (FR-018); gravar só sobre o
conteúdo que o app conhece (princípio II).

**Scale/Scope**: 3 histórias, 18 requisitos funcionais, 6 critérios de sucesso; 0 dependências npm,
2 componentes shadcn, 2 composições `app-*` novas, 1 módulo novo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio / seção | Como o plano atende | Pré | Pós |
| --- | --- | --- | --- |
| **I. Local-first e offline** | Nenhuma chamada de rede; tudo sai do índice em memória. | ✅ | ✅ |
| **II. Arquivos são a verdade** | Painel derivado e recalculado; o texto guardado no índice é descartável e reconstruído ao abrir o vault. Linkar só grava se o arquivo for igual ao que o app conhece, troca só o intervalo da menção e preserva BOM e quebras de linha. | ✅ | ✅ |
| **III. `shared/vault`** | Nenhuma capacidade nova de sistema; a escrita passa por `storage.writeText` (ledger) dentro do `vault.store`. | ✅ | ✅ |
| **IV. 100% shadcn** | `Item`, `ScrollArea`, `Collapsible`, `Button`, `Badge`, `Empty`, `Skeleton`, `Tooltip`, `Kbd`, `Resizable`; `Item` e `ScrollArea` instalados pela CLI (CMP-01), depois de consultar o registro (LAY-08). | ✅ | ✅ |
| **V. LAY / COR** | Primeiro `app-panel` (LAY-03) e `app-note-list` (LAY-02), dentro do `app-shell` (LAY-01) e redimensionável (LAY-05); atalho visível com `Kbd` (LAY-06); destaque do trecho por token. | ✅ | ✅ |
| Restrições técnicas | Módulo `backlinks` com `model/` puro e contrato em `index.ts`; nenhuma abstração sem uso: `app-panel` e `app-note-list` já têm o primeiro uso aqui e os seguintes previstos na arquitetura. | ✅ | ✅ |
| Fluxo e portões | Todo CA-* vira teste Vitest com o ID no nome; jornada no Playwright; `pnpm verify` e validação no app desktop. | ✅ | ✅ |

**Resultado**: nenhum princípio violado.

## Project Structure

### Documentation (this feature)

```text
specs/003-backlinks/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões R1..R10
├── data-model.md        # Phase 1 — Backlink, Mention, trecho, texto do link
├── quickstart.md        # Phase 1 — roteiro de validação
├── contracts/
│   ├── modules.md       # exports novos de links, vault, editor, backlinks e shared/components
│   └── ui.md            # painel, itens, avisos e atalho
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Só aparecem arquivos criados (**novo**) ou alterados (**muda**) nesta feature.

```text
src/
├── app/
│   ├── workspace.tsx                          # muda: painel à direita, atalho, onOpen → editor
│   └── tests/workspace-backlinks.test.tsx     # novo: abrir no ponto, mostrar e esconder
├── features/
│   ├── backlinks/                             # novo módulo
│   │   ├── components/backlinks-panel.tsx     # painel (app-panel + app-note-list + Collapsible)
│   │   ├── model/backlinks.list.ts            # agrupar por nota e montar o trecho
│   │   ├── tests/                             # backlinks-list, backlinks-panel
│   │   ├── index.ts
│   │   └── README.md                          # RN-BACK-001..004
│   ├── links/
│   │   ├── model/links.mentions.ts            # novo: findMentions, mentionLink
│   │   ├── model/links.index.ts               # muda: textOf
│   │   ├── model/links.parser.ts              # muda: exporta a regra de trechos de código ao módulo
│   │   ├── tests/links-mentions.test.ts       # novo
│   │   ├── index.ts                           # muda
│   │   └── README.md                          # muda
│   ├── vault/
│   │   ├── vault.store.ts                     # muda: linkMention; notas criadas por fora marcadas depois do índice
│   │   ├── tests/vault-external.test.tsx      # muda: caso das notas criadas
│   │   ├── tests/vault-mention.test.ts        # novo
│   │   └── README.md                          # muda
│   └── editor/
│       ├── note.store.ts                      # muda: open(path, { offset })
│       ├── tests/note-reveal.test.tsx         # novo: abrir no ponto
│       ├── components/note-editor.tsx         # muda: revelar posição; ação no cabeçalho
│       └── README.md                          # muda
└── shared/components/
    ├── app-panel.tsx                          # novo (LAY-03)
    ├── app-note-list.tsx                      # novo (LAY-02)
    ├── app-shell.tsx                          # muda: aside à direita
    ├── app-editor-frame.tsx                   # muda: actions no cabeçalho
    └── ui/item.tsx, ui/scroll-area.tsx        # novos, pela CLI do shadcn
e2e/backlinks.spec.ts                          # novo
src/mocks/demo-vault.ts                        # muda: menções e nota de nome curto
```

**Structure Decision**: mesma estrutura das specs anteriores. `backlinks` é o módulo previsto na
`arquitetura.md` §5 e §9; a regra de menção fica em `links` porque o `vault` precisa dela antes de
gravar (research R1).

## Fases de implementação (visão para `/speckit-tasks`)

1. **Fundação**: `textOf` no índice; `findMentions` e `mentionLink` em `links`; `open(path,
   { offset })`; `item` e `scroll-area` pelo shadcn; `app-panel`, `app-note-list`, lado direito do
   `app-shell` e ações do `app-editor-frame`; seed do `dev:mock`.
2. **US1 (P1)**: módulo `backlinks` com a seção de links, agrupamento e trecho; painel no
   `workspace` com atalho; abrir no ponto; atualização automática.
3. **US2 (P2)**: seção de menções recolhida, com contagem e o aviso de nome curto.
4. **US3 (P2)**: `linkMention` no `vault.store` e o botão "Linkar" com os avisos.
5. **Acabamento**: Playwright, metas de desempenho, documentação (`regras-de-negocio.md` com os CA
   novos, `arquitetura.md`, READMEs), revisão `app-review-standards`, validação no app desktop.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Nenhum princípio foi violado. Registro o que se afasta do padrão:

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| O `LinkIndex` passa a guardar o texto de todas as notas (~10 MB com 5.000 notas de 2 KB) | Procurar menções sem ler o disco a cada nota aberta (SC-001) | Ler as notas sob demanda: ~0,6 s com o disco parado e até ~20 s depois de mudanças em massa com antivírus (validação da 002) |
