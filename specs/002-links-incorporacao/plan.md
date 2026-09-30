# Implementation Plan: Links e Incorporação

**Branch**: `002-links-incorporacao` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-links-incorporacao/spec.md` + o código da feature
001 (`specs/001-vault-notas/`) · Constituição 1.0.1

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A 002 transforma os `[[links]]` que a 001 só sabia reescrever em links vivos no editor:

- cada link mostra o seu estado (válido, pendente, quebrado, ambíguo ou arquivo);
- `Ctrl`+clique ou `Ctrl+Enter` segue o link: abre a nota (e a seção), cria a nota do link
  pendente, oferece recriar a nota excluída ou pede a escolha entre notas de mesmo nome;
- o autocomplete sugere notas ao digitar `[[` e insere a pasta só quando o nome é repetido;
- `![[nota]]` e `![[nota#Seção]]` mostram o conteúdo num bloco somente leitura abaixo da linha,
  que acompanha a original, com ciclo interrompido e profundidade limitada.

Abordagem técnica:

- A regra fica em funções puras do módulo `links` (`resolveLinkTarget`, `findSection`,
  `suggestLinks`, registro de notas excluídas); o contrato da 001 não muda.
- O `vault.store` ganha `followLink`, o registro de notas excluídas (persistido em
  `.devnotes/deleted-notes.json`) e a data de modificação das entradas.
- O editor ganha as extensões do CodeMirror: destaque, seguir link, autocomplete e blocos de
  incorporação.
- `shared/vault` ganha `VaultEntry.modifiedAt` e o `AppDataStore`, com dois comandos Rust para
  `.devnotes/` (no Unix o escopo do Tauri não cobre pastas iniciadas por ponto; research R4).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict); Rust stable ≥ 1.90 (`src-tauri/`), como na 001

**Primary Dependencies**:

| Camada | Tecnologia | Versão |
| --- | --- | --- |
| Editor | CodeMirror 6 (`state`, `view`, `commands`, `lang-markdown`) | já instalados na 001 |
| Autocomplete | `@codemirror/autocomplete` | 6.20.3 (nova, exata) |
| Validação | Zod (registro de notas excluídas) | 4.5.4 |
| UI | shadcn/ui `base-nova` (`Button`, `Dialog`, `Command`, `Skeleton`, `AlertDialog`), lucide | já instalados |
| Estado | Zustand | 5.0.15 |
| Núcleo | Tauri 2.12.0, `trash` 5.2.9 | como na 001 |

**Storage**: notas e canvas no disco (001); **novo**: `.devnotes/deleted-notes.json` (dado do app no
vault, JSON validado por Zod). Estado dos links e árvore de incorporações só em memória.

**Testing**: Vitest + Testing Library sobre o adapter de memória (modelo, stores, editor em jsdom);
suíte de contrato de `shared/vault` com os casos novos; Playwright no `dev:mock`; `cargo test` nos
comandos novos.

**Target Platform**: desktop Windows 10+, macOS 12+ e Linux, via Tauri 2

**Project Type**: desktop-app (frontend React + núcleo Rust fino)

**Performance Goals**:

- Sugestões do autocomplete em ≤ 0,3 s por tecla com 5.000 notas (SC-001).
- Link pendente criado e aberto em ≤ 1 s (SC-003).
- Incorporação acompanha a original em ≤ 2 s (SC-004); nota com 20 incorporações abre em ≤ 1 s
  (SC-005).
- Estado do link atualizado em ≤ 2 s (SC-006).

**Constraints**:

- Exibir links e incorporações nunca grava arquivo (FR-024, princípio II).
- Offline total (FR-026, princípio I).
- Cor de texto só em pares com 4,5:1; o azul da marca vai no traço, não no texto (research R2).

**Scale/Scope**: 5 histórias, 26 requisitos funcionais, 7 critérios de sucesso; 1 dependência nova,
2 comandos Rust novos, 1 interface nova em `shared/vault`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio / seção | Como o plano atende | Pré | Pós |
| --- | --- | --- | --- |
| **I. Local-first e offline** | Nenhuma chamada de rede; autocomplete, destaque e incorporação usam só o vault e o índice em memória. | ✅ | ✅ |
| **II. Arquivos são a verdade** | Estado dos links e incorporações é derivado e recalculado. O registro de notas excluídas é o primeiro dado do app no vault: fica em `.devnotes/`, em JSON validado por Zod, guarda só caminhos e pode ser apagado sem perda (registro inválido vira vazio). Incorporação não copia conteúdo para o arquivo. Criar a nota do link pendente não sobrescreve nada: se a nota já existe, só abre. | ✅ | ✅ |
| **III. `shared/vault`** | `modifiedAt` e `AppDataStore` entram no contrato e nos dois adapters, com casos novos na suíte de contrato. `.devnotes/` é acessado por comandos Rust próprios, com validação de nome e caminho, e nunca por `@tauri-apps/*` fora do adapter. | ✅ | ✅ |
| **IV. 100% shadcn** | Diálogo de escolha (`Dialog` + `Command`), confirmação de recriar (`app-confirm`), cabeçalho e mensagens do bloco de incorporação (`Button`, `Skeleton`, ícones lucide) são shadcn. Dentro do `app-editor-frame` ficam só peças do CodeMirror (destaque, lista do autocomplete, corpo do bloco), pela exceção LAY-07. | ✅ | ✅ |
| **V. LAY / COR** | Tokens do `brand.md`; estados do link por traço + cor com contraste aprovado (research R2); `Kbd`/texto do atalho nas dicas (LAY-06); `app-confirm` ganha `tone` para ação não destrutiva (LAY-04 continua para as destrutivas). | ✅ | ✅ |
| Restrições técnicas | Dependência nova com consumidor concreto e versão exata (FER-02). Módulo `links` segue com `model/` puro e contrato em `index.ts`. | ✅ | ✅ |
| Fluxo e portões | Todo CA-* e cenário [novo] vira teste Vitest com o ID no nome; jornada "linkar" (adiada pela 001) entra no Playwright; `pnpm verify` inclui os `cargo test` novos. | ✅ | ✅ |

**Resultado**: nenhum princípio violado. A jornada "linkar", que a constituição exige e a 001
adiou, passa a existir nesta feature.

## Project Structure

### Documentation (this feature)

```text
specs/002-links-incorporacao/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões R1..R11
├── data-model.md        # Phase 1 — LinkTarget, registro de excluídas, Section, sugestões, EmbedNode
├── quickstart.md        # Phase 1 — roteiro de validação
├── contracts/
│   ├── links-module.md  # exports novos do módulo links
│   ├── shared-vault.md  # modifiedAt, AppDataStore, comandos Rust
│   └── ui.md            # estados do link, diálogos, bloco de incorporação, autocomplete
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Só aparecem arquivos criados (**novo**) ou alterados (**muda**) nesta feature.

```text
src/
├── app/
│   ├── workspace.tsx                          # muda: onFollowLink → abre, diálogo de escolha, confirmar recriar
│   └── tests/workspace-links.test.tsx         # novo: seguir link, pendente, quebrado, ambíguo (integração)
├── features/
│   ├── links/
│   │   ├── model/
│   │   │   ├── links.target.ts                # novo: resolveLinkTarget
│   │   │   ├── links.sections.ts              # novo: findSection
│   │   │   ├── links.suggest.ts               # novo: suggestLinks
│   │   │   ├── links.deleted.ts               # novo: registro de notas excluídas
│   │   │   └── links.embeds.ts                # novo: embedState (estado do bloco de incorporação)
│   │   ├── types/links.schemas.ts             # muda: esquema Zod do registro
│   │   ├── components/link-choice-dialog.tsx  # novo: Dialog + Command para link ambíguo
│   │   ├── tests/                             # novos: links-target, links-sections, links-suggest, links-deleted
│   │   ├── index.ts                           # muda: exports novos
│   │   └── README.md                          # muda: RN-LINK-001..005, RN-EMBED-001..003
│   ├── vault/
│   │   ├── vault.store.ts                     # muda: followLink, recreateNote, deleted, modifiedAt
│   │   ├── tests/vault-follow.test.ts(x)      # novo
│   │   └── README.md                          # muda
│   └── editor/
│       ├── components/
│       │   ├── note-editor.tsx                # muda: extensões novas, abrir na seção
│       │   └── embed-block.tsx                # novo: cabeçalho e estados do bloco (shadcn)
│       ├── model/
│       │   ├── editor.links.ts                # novo: destaque + seguir link (CodeMirror)
│       │   ├── editor.complete.ts             # novo: fonte do autocomplete (CodeMirror)
│       │   └── editor.embeds.ts               # novo: StateField dos blocos + widget
│       ├── note.store.ts                      # muda: open(path, { heading })
│       ├── tests/                             # novos: editor-links, editor-complete, editor-embeds
│       └── README.md                          # muda: atalhos e exceção LAY-07 ampliada
└── shared/
    ├── components/app-confirm.tsx             # muda: tone "default" | "destructive"
    └── vault/
        ├── vault.types.ts                     # muda: VaultEntry.modifiedAt, AppDataStore
        ├── adapters/memory/memory-vault.ts    # muda: modifiedAt, appData
        ├── adapters/tauri/tauri-vault.ts      # muda: modifiedAt, appData via invoke
        └── tests/vault-contract.test.ts       # muda: casos novos
src-tauri/
├── build.rs                                   # muda: comandos novos
├── capabilities/default.json                  # muda: allow-vault-app-data-*
└── src/vault.rs                               # muda: modifiedAt no scan; vault_app_data_read/write
e2e/links.spec.ts                              # novo: jornada "linkar"
src/mocks/demo-vault.ts                        # muda: notas com links pendentes, repetidos e incorporação
```

**Structure Decision**: mesma estrutura da 001 (`features/` + `shared/` + `src-tauri/`). As
extensões do CodeMirror ficam em `features/editor/model/` com nomes `editor.*` (NOM-04), porque só o
editor conhece o CodeMirror (research R1).

**Fluxo de dependências** (setas = "importa de", sem ciclo):

```text
app/ ─→ features/{vault,editor,links} ─→ shared/{vault,components,lib}
features/vault  ─→ features/links
features/editor ─→ features/vault, features/links
features/links  ─→ shared/*   (nunca vault nem editor)
```

## Fases de implementação (visão para `/speckit-tasks`)

1. **Fundação**: `modifiedAt` e `AppDataStore` em `shared/vault` (dois adapters, contrato, comandos
   Rust, `cargo test`); `@codemirror/autocomplete`; `resolveLinkTarget`, `findSection` e o registro
   de excluídas no `links`; seed do `dev:mock`.
2. **US1 (P1)**: destaque dos estados, seguir link válido e para seção, registro de excluídas no
   `vault.store` (links quebrados sobrevivem ao reabrir).
3. **US2 (P1)**: `followLink` para pendente (pasta atual, pasta do link, nome inválido) e para
   quebrado (recriar).
4. **US3 (P2)**: `suggestLinks` e a fonte do autocomplete.
5. **US4 (P2)**: blocos de incorporação (seção, não encontrada, circular, profundidade, atualização).
6. **US5 (P3)**: link ambíguo (aparência e diálogo de escolha); regressão da CA-LINK-006-01.
7. **Acabamento**: Playwright (jornada "linkar"), metas de desempenho, documentação
   (`regras-de-negocio.md` com os CA novos, `arquitetura.md` com `AppDataStore`), revisão
   `app-review-standards`, validação manual.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Nenhum princípio foi violado. Registro, como exige a seção Governance, o que se afasta do padrão:

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Dependência nova `@codemirror/autocomplete` | Lista de sugestões junto ao cursor, com teclado e acessibilidade (FR-013 a FR-017) | `Command` do shadcn em `Popover` ancorado no cursor: reimplementa posicionamento e foco dentro do editor; a lista do CodeMirror fica dentro da exceção LAY-07 |
| Comandos Rust próprios para `.devnotes/` | No Unix o escopo `raiz/**` do Tauri não cobre pastas iniciadas por ponto (research R4) | `plugin-fs` com escopo extra: expõe `.devnotes/` inteiro ao front e funcionaria diferente entre sistemas se o escopo mudar |
| Raiz React dentro de widget do CodeMirror | Cabeçalho e mensagens do bloco de incorporação precisam ser shadcn (princípio IV) dentro do editor | Montar o cabeçalho com DOM à mão dentro do widget: fere a CMP-02 |
