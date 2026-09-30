# Implementation Plan: Vault e Notas

**Branch**: `001-vault-notas` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-vault-notas/spec.md` + `docs/arquitetura.md`
(stack, estrutura de pastas, composições `app-*`) · Constituição 1.0.1

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Primeira feature do Dev Notes, e por isso também a fundação do projeto:

1. **Nasce o app**: o react-standards-template vira um app desktop Tauri 2. Sai a camada
   HTTP/rotas e entram o `shared/vault` e o `app-shell` (research R1).
2. **Entrega da spec**:
   - abrir uma pasta como vault;
   - árvore de pastas e notas;
   - criar, editar e gravar notas automaticamente;
   - renomear e mover atualizando links e cartões de canvas;
   - excluir para a lixeira do sistema com confirmação;
   - reagir a alterações externas sem perder o que o usuário escreveu.

Abordagem técnica:

- Todo acesso ao disco passa pelas interfaces de `shared/vault`, com um adapter Tauri e um adapter
  em memória equivalentes.
- Operações em lote (renomear/mover) são calculadas por inteiro num `ChangePlan` puro antes de
  qualquer gravação.
- O observador de arquivos trata eventos só como aviso e decide pelo conteúdo real, comparado ao
  registro de escritas do próprio app.
- A interface é 100% shadcn: `app-shell`, `app-empty`, `app-confirm`, `app-choice-dialog` e
  `app-editor-frame`, que embala o CodeMirror.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict) no frontend; Rust stable ≥ 1.90 no `src-tauri/`

**Primary Dependencies**:

| Camada | Tecnologia | Versão |
| --- | --- | --- |
| Shell desktop | Tauri 2 + `plugin-fs` (feature `watch`) + `plugin-dialog` | 2.12.0 / 2.6.0 / 2.8.0 |
| Lixeira | crate `trash` | 5.2.9 |
| UI | React 19 + Vite | 19.2.8 / 8.2.2 |
| Componentes | shadcn/ui `base-nova` (`@base-ui/react`) + Tailwind 4 + lucide | 1.8.0 / 4.3.3 / 1.43.0 |
| Fontes | `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` | fixar ao instalar |
| Avisos | sonner | 2.0.8 |
| Validação | Zod (`.canvas`, `AppConfig/vault.json`) | 4.5.4 |
| Editor | CodeMirror 6 (`state`, `view`, `commands`, `lang-markdown`) | fixar ao instalar |
| Estado | Zustand (exceção ADR-006) | fixar ao instalar |
| Qualidade | Biome, Vitest, Testing Library, Playwright | 2.5.12 / 4.1.11 / template / template |
| Ambiente | Node 24, pnpm 10.33.0 | template |

Fora desta feature (entram com suas specs): unified/remark, MiniSearch, React Flow, TanStack Form.

**Storage**: arquivos do vault no disco (`.md`, `.canvas`); `AppConfig/vault.json` (fora do vault)
guarda o último vault; índice de links só em memória. Nada é gravado em `.devnotes/` nesta feature.

**Testing**:

- Vitest + Testing Library + `user-event`, sobre o adapter em memória.
- Suíte de contrato de `shared/vault`, que roda contra os dois adapters.
- Playwright no `pnpm dev:mock`.
- `cargo test` nos comandos Rust.

**Target Platform**: desktop Windows 10+, macOS 12+ e Linux (WebKitGTK), via Tauri 2

**Project Type**: desktop-app (frontend React + núcleo Rust fino)

**Performance Goals**:

- Árvore de um vault de 5.000 notas em ≤ 3 s (SC-006).
- Renomear uma nota com 200 referências em ≤ 5 s (SC-002).
- Alteração externa visível em ≤ 2 s (SC-004).

**Constraints**:

- Offline total e nenhum acesso fora da pasta do vault (princípios I e III).
- Nenhuma exclusão definitiva (FR-024).
- Nenhuma cor, medida ou fonte fora dos tokens do `brand.md` (princípio V).

**Scale/Scope**:

- Um vault por vez, com até cerca de 5.000 notas.
- 5 histórias de usuário e 24 requisitos funcionais.
- 5 composições `app-*` e 5 comandos Rust.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio / seção | Como o plano atende | Pré | Pós |
| --- | --- | --- | --- |
| **I. Local-first e offline** | Nenhuma chamada de rede. As fontes vêm de pacotes locais (`@fontsource-variable/*`) e os ícones do lucide empacotado. O último vault fica em `AppConfig`, na máquina. | ✅ | ✅ |
| **II. Arquivos são a verdade** | O último vault fica em `AppConfig/vault.json`, a configuração global que a constituição 1.0.1 permite fora do vault. Nada é gravado em `.devnotes/` nesta feature. Quebra de linha e BOM originais são preservados ao gravar. O índice de links fica só em memória e é reconstruído ao abrir o vault. A reescrita de canvas preserva o JSON Canvas. A exclusão vai para a lixeira. Valores e links nunca são apagados. O `ChangePlan` é calculado antes de gravar e confere o hash de cada arquivo antes de reescrevê-lo. | ✅ | ✅ |
| **III. `shared/vault`** | As features importam só de `@/shared/vault`, inclusive para o ciclo de vida da janela (`onBeforeClose`). As APIs `@tauri-apps/*` e os comandos Rust aparecem apenas em `shared/vault/adapters/tauri/`, e o Biome recebe uma regra de import restrito para cobrar isso. Adapter em memória com a mesma suíte de contrato. Ledger contra eco do observador. | ✅ | ✅ |
| **IV. 100% shadcn** | A interface usa peças shadcn instaladas via MCP/CLI e composições `app-*`. A única exceção é o CodeMirror, dentro do `app-editor-frame`, e o motivo fica no `README.md` da feature `editor`. `ui/` nunca é editado. Composição usa `render`, nunca `asChild`. | ✅ | ✅ |
| **V. LAY / COR** | LAY-01 (tudo dentro do `app-shell`), LAY-04 (`app-confirm`), LAY-05 (`Resizable`), LAY-06 (`Kbd` nos menus), LAY-07, LAY-08 e LAY-09. COR-01..04: tokens do `brand.md` copiados para `src/styles.css`, sem hex nem colchetes nos componentes, tema via `ThemeProvider`. | ✅ | ✅ |
| Restrições técnicas | Stack da `arquitetura.md` §2 e padrões herdados do template (R1). Os ADRs em status Proposto usados aqui (001, 004, 006, 008, 011) são confirmados por esta feature. | ✅ | ✅ |
| Fluxo e portões | Todo CA-* e cenário [novo] vira teste Vitest. Jornadas no Playwright. O `pnpm verify` passa a incluir `cargo test`. Revisão com `app-review-standards`. | ✅ | ✅ |

**Resultado**: nenhum princípio violado. Os dois desvios de regras herdadas estão na seção
Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-vault-notas/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões R1..R14
├── data-model.md        # Phase 1 — entidades, máquina de estados, ChangePlan
├── quickstart.md        # Phase 1 — roteiro de validação
├── contracts/
│   ├── shared-vault.md  # Ports de shared/vault + comandos Rust internos
│   └── ui.md            # Telas, composições app-*, mensagens, atalhos
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — ainda não criado)
```

### Source Code (repository root)

Só aparecem os arquivos que esta feature cria (NOM-05). Os marcados com `(template)` vêm do
react-standards-template já adaptado (research R1).

```text
dev-notes/
├── src/
│   ├── main.tsx                         # (template) initializeTheme() + render <Root/>
│   ├── styles.css                       # tokens do brand.md §5 (COR-02)
│   ├── config/
│   │   └── app.ts                       # (template) nome, idioma; + autosaveDelayMs = 1000
│   ├── app/
│   │   ├── root.tsx                     # ThemeProvider + único <Toaster> (CMP-09)
│   │   └── workspace.tsx                # monta app-shell com explorador e nota ativa
│   ├── features/
│   │   ├── vault/                       # explorador, criar, renomear, mover, excluir
│   │   │   ├── components/              # vault-tree.tsx, vault-tree-item.tsx, vault-move-dialog.tsx
│   │   │   ├── model/                   # vault.names.ts, vault.operations.ts, vault.deletion.ts
│   │   │   ├── tests/                   # vault-*.test.ts(x) com CA-NOTA-001/004/006/009/010/011
│   │   │   ├── vault.store.ts           # vault aberto, árvore, status do índice (ADR-006)
│   │   │   ├── index.ts                 # contrato público (NOM-06)
│   │   │   └── README.md                # RN-NOTA-001..012 (COD-03)
│   │   ├── editor/                      # nota aberta, gravação automática, conflito externo
│   │   │   ├── components/              # note-editor.tsx (CodeMirror em app-editor-frame)
│   │   │   ├── model/                   # note.machine.ts (máquina de estados de OpenNote)
│   │   │   ├── tests/                   # CA-NOTA-007/008 e cenários [novo] da US4
│   │   │   ├── note.store.ts
│   │   │   ├── index.ts
│   │   │   └── README.md                # motivo da exceção LAY-07
│   │   └── links/                       # só o necessário para reescrever (spec 002 amplia)
│   │       ├── model/                   # links.parser.ts, links.index.ts, links.rename.ts, links.canvas.ts
│   │       ├── types/                   # links.schemas.ts (Zod do JSON Canvas)
│   │       ├── tests/                   # CA-NOTA-004-01, CA-LINK-006-01, CA-NOTA-003-01
│   │       ├── index.ts
│   │       └── README.md
│   ├── shared/
│   │   ├── vault/
│   │   │   ├── vault.types.ts           # VaultPath, VaultEntry, VaultError, ports
│   │   │   ├── vault.paths.ts           # normalizar/validar VaultPath, nameKey
│   │   │   ├── vault.ledger.ts          # registro de escritas do app (FR-023)
│   │   │   ├── adapters/tauri/          # único lugar com @tauri-apps/* e invoke()
│   │   │   ├── adapters/memory/         # Map em memória + simulateExternal/setAvailable
│   │   │   ├── tests/vault-contract.test.ts
│   │   │   └── index.ts                 # escolhe o adapter (research R13)
│   │   ├── components/
│   │   │   ├── ui/                      # gerado pelo shadcn, nunca editado (CMP-01)
│   │   │   ├── app-shell.tsx
│   │   │   ├── app-empty.tsx
│   │   │   ├── app-confirm.tsx
│   │   │   ├── app-choice-dialog.tsx
│   │   │   ├── app-editor-frame.tsx
│   │   │   └── theme-provider.tsx       # (template)
│   │   ├── hooks/
│   │   └── lib/                         # (template) utils.ts; + hash.ts (SHA-256 Web Crypto)
│   └── mocks/
│       └── demo-vault.ts                # vault de demonstração do dev:mock (não vai ao build)
├── src-tauri/
│   ├── Cargo.toml                       # tauri 2.12.0, plugin-fs 2.6.0 [watch], plugin-dialog 2.8.0, trash 5.2.9
│   ├── tauri.conf.json
│   ├── capabilities/default.json        # permissões de research R3 (sem fs:allow-remove)
│   ├── icons/                           # pnpm tauri icon (quando o SVG do logo existir)
│   └── src/
│       ├── main.rs
│       ├── lib.rs                       # registra plugins e comandos; vault_restore no setup
│       └── vault.rs                     # vault_pick/restore/scan/read_notes/trash + validação de caminho
├── e2e/
│   └── vault.spec.ts                    # jornadas: criar, renomear com links, excluir, conflito
├── public/favicon.svg                   # quando o logo em SVG existir (brand.md 1.2)
├── docs/                                # arquitetura, regras, brand, standards (adaptado), decisions/
├── specs/
├── components.json                      # (template) style base-nova
├── biome.json                           # (template) + noRestrictedImports para @tauri-apps/*
├── package.json                         # scripts: dev, dev:mock, tauri, build, test, test:e2e, verify
└── CLAUDE.md                            # (template) + aponta para a constituição
```

**Structure Decision**: a estrutura é a de `docs/arquitetura.md` §5: `features/` + `shared/`, com
`shared/vault` no lugar de `shared/api` e o núcleo Rust em `src-tauri/`. Esta feature cria três
features:

- `vault`, dona das RN-NOTA-*;
- `editor`, dona da nota aberta e da gravação;
- `links`, com só o modelo de reescrita.

A `links` nasce aqui porque renomear e mover dependem dela (`arquitetura.md` §10.1); a spec 002
amplia a `links` sem mudar o contrato. As composições `app-*` restantes de `arquitetura.md` §6.2
(`app-tabs`, `app-panel`, `app-note-list`, `app-command`, `app-canvas-frame`) não são criadas
agora (NOM-05). O leiaute e os estados de cada composição estão em
[contracts/ui.md](./contracts/ui.md).

**Fluxo de dependências** (setas = "importa de"):

```text
app/ ─→ features/{vault,editor,links} ─→ shared/{vault,components,lib}
features/vault ─→ features/links (via index.ts)
features/editor ─→ features/vault (via index.ts)
shared/* nunca importa features/* (CMP-04)
features/vault nunca importa features/editor
```

O `vault.store` avisa o `editor` pelos ganchos `onBeforeMutate` e `onEntryEvent`
([data-model.md](./data-model.md) "VaultEvent"), que o `note.store` registra ao ser criado. Assim
não há dependência circular entre as duas features.

## Fases de implementação (visão para `/speckit-tasks`)

1. **Fundação**: o projeto nasce do template com as remoções e adaptações de R1. Na mesma fase:
   - Tauri 2 no `src-tauri/`;
   - tokens e fontes do `brand.md` no `src/styles.css`;
   - `src/app/root.tsx`;
   - o `standards.md` adaptado e os ADRs 001, 004, 006, 008 e 011 escritos em `docs/decisions/`;
   - o `CLAUDE.md` apontando para a constituição.
2. **`shared/vault`**: tipos, caminhos, ledger, adapter em memória, suíte de contrato, adapter
   Tauri e comandos Rust.
3. **US1 (P1)**: `app-shell`, `app-empty`, `app-editor-frame`, explorador, criar nota/pasta,
   editor e gravação automática.
4. **US2 (P2)**: `links` model (parser, índice, rename e canvas) e renomear com o `ChangePlan`.
5. **US3 (P2)**: `app-confirm` e exclusão de nota e pasta, inclusive lixeira indisponível.
6. **US4 (P2)**: observador, máquina de estados completa e `app-choice-dialog`.
7. **US5 (P3)**: mover nota e pasta, reaproveitando o `ChangePlan`.
8. **Acabamento**: Playwright, metas de desempenho com vault sintético de 5.000 notas, revisão
   `app-review-standards` e testes manuais nos três sistemas.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Nenhum princípio da constituição foi violado. Os itens abaixo são desvios de regras **herdadas do
template**, registrados como exige a seção Governance da constituição:

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Store global Zustand (EST-03 do template diz que não há store global) | Explorador, editor, observador e diálogos compartilham o vault aberto e a nota ativa (ADR-006, research R10) | React Context: re-render amplo no `app-shell`; mais código de ligação |
| Comandos Rust próprios que não passam pelo escopo do `plugin-fs` | Listagem recursiva e leitura em lote (SC-006, SC-002), lixeira (sem plugin oficial) e reabertura do vault sem o bug do `persisted-scope` (research R3, R4, R6) | `readDir` por pasta: um IPC por pasta; `persisted-scope`: corrompe o escopo com `[`. Mitigado pela validação de caminho dentro do vault no Rust e por `cargo test` |
