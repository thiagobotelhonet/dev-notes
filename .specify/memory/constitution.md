<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.0.1
Bump rationale: PATCH — esclarecimentos de redação, sem mudar o sentido dos princípios.
Origem: /speckit-analyze da feature 001 (achados C1 e C3).

Modified principles:
  - II. Os arquivos são a fonte da verdade — separa dados do vault (`.devnotes/`) da
    configuração global do app (pasta de configuração do sistema, ex.: último vault aberto).
  - III. Ponto único de acesso ao sistema — a lista de interfaces de `shared/vault` passa a
    ser exemplificativa; o que é obrigatório é passar por `shared/vault`.

Added sections: nenhuma.
Removed sections: nenhuma.

Templates: sem mudança necessária (plan, spec e tasks leem a constituição em tempo de execução).

Follow-up TODOs (fora da constituição):
  - docs/standards.md, CLAUDE.md e a correção de `docs/architecture.md` em docs/arquitetura.md §5
    estão cobertos pelas tarefas T005, T013 e T086 da feature 001.
-->

# Dev Notes Constitution

## Core Principles

### I. Local-first e offline

- Toda funcionalidade do MVP MUST funcionar sem internet (RNF-PROD-001).
- As notas MUST ficar somente no computador do usuário; nenhum dado do vault é enviado a
  servidor, API ou serviço de terceiros (RNF-PROD-002).
- Nenhuma dependência pode exigir rede em tempo de execução: fontes, ícones e assets MUST ser
  empacotados localmente (ex.: `@fontsource-variable/*`, lucide).
- Recursos que dependem de rede (sync, publish, Git, links GitHub, blocos executáveis) são
  evolução futura e, quando existirem, MUST ser opcionais e não podem degradar o uso offline.

**Rationale**: uso local e offline é o diferencial central do produto e a garantia de posse e
privacidade dos dados (DEC-PROD-003).

### II. Os arquivos são a fonte da verdade

- Notas (`.md`) e canvas (`.canvas`) no disco MUST prevalecer sobre qualquer estado em memória.
- Índices (busca, links, backlinks, tags) MUST ser descartáveis e reconstruíveis a partir dos
  arquivos; eles ficam só em memória e não são persistidos como verdade.
- Formatos MUST ser abertos e compatíveis com Obsidian: Markdown com frontmatter YAML e canvas
  em JSON Canvas, legíveis por qualquer ferramenta fora do app (RNF-PROD-003, RN-CANVAS-003).
- Dados do app referentes a um vault (layout, histórico, configurações do vault) ficam apenas em
  `.devnotes/` dentro do vault, em JSON validado por Zod. A configuração global do app, que
  precisa existir antes de um vault ser aberto (ex.: qual foi o último vault), fica na pasta de
  configuração do app no sistema operacional, nunca junto das notas e nunca em servidor.
- O app MUST NOT destruir conteúdo do usuário: exclusão vai para a lixeira do sistema
  (RN-NOTA-001), valor inválido é mantido e sinalizado (RN-PROP-003), links para notas
  excluídas permanecem no texto (RN-NOTA-003).
- Alterações externas MUST ser respeitadas: recarregar sem edição pendente, perguntar ao
  usuário quando houver (RN-NOTA-007/008).
- Operações que alteram vários arquivos (renomear, mover) MUST calcular o conjunto completo de
  mudanças antes de escrever qualquer arquivo.

**Rationale**: sem aprisionamento de dados; o usuário pode abandonar o app a qualquer momento e
continuar com seus arquivos intactos.

### III. Ponto único de acesso ao sistema: `shared/vault`

- Todo acesso ao sistema operacional (arquivos, observação de mudanças, lixeira, histórico,
  configurações, ciclo de vida da janela) MUST passar pelas interfaces de `shared/vault`, entre
  elas `VaultStorage`, `FileWatcher`, `Trash`, `HistoryStore` e `SettingsStore`.
- Features, componentes e stores MUST NOT importar APIs do Tauri, plugins `fs` ou comandos Rust
  diretamente.
- `shared/vault` MUST manter dois adapters equivalentes: Tauri (app desktop) e memória
  (Vitest, Playwright, `pnpm dev:mock`). Toda capacidade nova entra nos dois.
- Escritas feitas pelo app MUST ser registradas para que o `FileWatcher` ignore o próprio eco.

**Rationale**: trocar Tauri por web, ou incluir Git/sync no futuro, altera só o adapter; o
adapter em memória torna toda regra de negócio testável sem Tauri.

### IV. Interface 100% shadcn

- Toda a interface MUST ser montada com primitivas do shadcn/ui (preset `base-nova`, Base UI)
  e com as composições `app-*` de `shared/components/`.
- Nenhuma tela pode inventar seu próprio botão, lista, diálogo, menu, painel, aviso ou
  redimensionador.
- `shared/components/ui/` é gerado pelo shadcn e MUST NOT ser editado à mão (CMP-01).
- Componentes MUST ser instalados via MCP/CLI do shadcn com o preset do `components.json`;
  padrões Radix (`asChild`) não se aplicam, usa-se `render` do Base UI (CMP-03).
- Antes de compor algo novo, o MCP do shadcn MUST ser consultado; compor só se a peça não
  existir (LAY-08).
- As únicas exceções são o editor (CodeMirror 6) e o canvas (React Flow), e somente dentro de
  `app-editor-frame` e `app-canvas-frame` (LAY-07). Toda interface ao redor deles continua
  shadcn.

**Rationale**: padronização visual, reaproveitamento e revisão previsível (ADR-003).

### V. Layout e cores governados (regras LAY-* e COR-*)

- As regras `LAY-01` a `LAY-09` de `docs/arquitetura.md` §6.3 são obrigatórias, em especial:
  toda tela vive no `app-shell` (LAY-01); listas de notas usam `app-note-list` (LAY-02);
  painéis laterais usam `app-panel` (LAY-03); ação destrutiva confirma com `app-confirm`
  (LAY-04); redimensionar só com `Resizable` (LAY-05).
- As regras `COR-*` do `docs/standards.md` herdado são obrigatórias: componente MUST NOT
  escrever cor pronta, usa sempre tokens (COR-01); token novo entra nos três lugares — tema
  claro, tema escuro e `@theme inline` de `src/styles.css` (COR-02).
- Cores, fontes e medidas MUST vir de `docs/brand.md` (LAY-09). Ações usam `primary`;
  destaques e links usam `brand`. Cor nova só entra pelo `brand.md`.
- Todo par de cor de texto MUST atender contraste mínimo de 4,5:1 (brand.md §2.3).
- Tema claro, escuro e sistema MUST funcionar em toda tela.

**Rationale**: a identidade visual e o layout são decididos uma vez, em documento, e não
reinventados por feature (ADR-012).

## Restrições Técnicas e de Escopo

- **Produto**: app desktop open source (RNF-PROD-004), um vault por usuário, único ator
  (DEC-PROD-002). Sem servidor, multiusuário, plugins, Git ou sync no MVP.
- **Regras de negócio**: `docs/regras-de-negocio.md` é a fonte das regras `RN-*`, decisões
  `DEC-PROD-*` e critérios `CA-*`. Nenhuma spec pode contradizê-lo sem antes alterá-lo.
- **Base de código**: react-standards-template (ADR-002). Os padrões `NOM`, `COD`, `IDI`,
  `CMP-01..04, 07..10` e `COR` continuam obrigatórios, com as adaptações de
  `docs/arquitetura.md` §3.
- **Stack de referência**: Tauri 2; React 19 + TypeScript + Vite; shadcn/ui + Tailwind 4 +
  lucide; Zod; TanStack Form; CodeMirror 6; React Flow; unified/remark; MiniSearch; Zustand;
  Biome, Vitest, Testing Library, Playwright; Node 24 e pnpm. Itens com ADR em status
  **Proposto** podem ser trocados por novo ADR sem emenda, desde que os princípios I–V sejam
  mantidos.
- **Estrutura**: código por `features/*` com contrato público em `index.ts` (NOM-06); lógica
  pura em `model/`; esquemas Zod em `types/`; regras `RN-*` do módulo no `README.md` da
  feature (COD-03). Nenhuma abstração antes do segundo uso real (COD-04).
- **Estado global**: Zustand só para estado realmente global (abas, nota ativa, pendências),
  conforme ADR-006.

## Fluxo de Desenvolvimento e Portões de Qualidade

- Toda feature segue o fluxo Spec Kit: spec → plan → tasks → implement. O `plan.md` MUST
  conter a seção "Constitution Check" verificando os princípios I–V antes e depois do design.
- Todo critério `CA-*` coberto pela feature MUST virar teste Vitest em `features/*/tests/`,
  rodando contra o adapter em memória.
- Jornadas principais (criar, linkar, renomear, mover, excluir) MUST ter testes Playwright em
  `e2e/`, usando o mesmo adapter.
- `pnpm verify` (Biome, TypeScript, testes, build) MUST passar antes de qualquer merge e antes
  do build desktop.
- A revisão (humana ou pela skill `app-review-standards`) MUST verificar conformidade com esta
  constituição e com as regras `LAY-*`, `COR-*` e `CMP-*`.
- Toda decisão técnica relevante é registrada como ADR em `docs/decisions/`.

## Governance

- Esta constituição prevalece sobre specs, planos, tarefas, ADRs e demais documentos. Em caso
  de conflito, o documento divergente MUST ser corrigido.
- Os princípios I–V são inegociáveis: nenhuma spec, plano, ADR ou tarefa pode flexibilizá-los,
  e não há exceção caso a caso. Alterá-los exige decisão explícita do responsável pelo
  produto, registrada em ADR, com incremento MAJOR.
- Emendas às demais seções exigem: descrição da mudança, motivo, atualização dos documentos
  afetados (`docs/arquitetura.md`, `docs/brand.md`, `docs/regras-de-negocio.md`) e novo
  Sync Impact Report.
- Versionamento semântico: MAJOR para remoção ou redefinição de princípio; MINOR para nova
  seção ou orientação materialmente ampliada; PATCH para esclarecimento e redação.
- Complexidade que se afaste do padrão (nova dependência, exceção a regra `CMP-*` ou `LAY-*`
  prevista em documento) MUST ser justificada na tabela "Complexity Tracking" do `plan.md`.
- Orientação de desenvolvimento em tempo de execução fica em `CLAUDE.md` e `docs/standards.md`.

**Version**: 1.0.1 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-09-29
