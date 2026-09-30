# Quickstart: validar Vault e Notas

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) ·
**Contratos**: [shared-vault](./contracts/shared-vault.md), [ui](./contracts/ui.md)

Roteiro para provar que a feature funciona de ponta a ponta. Não contém código de implementação.

## Pré-requisitos

| Item | Versão |
| --- | --- |
| Node | 24 (`.node-version`) |
| pnpm | 10.33.0 (`packageManager`) |
| Rust | stable ≥ 1.90 (`rustup`) |
| Dependências do Tauri | WebView2 (Windows) · Xcode CLT (macOS) · WebKitGTK 4.1 e `libayatana-appindicator` (Linux) — ver <https://v2.tauri.app/start/prerequisites/> |

```bash
pnpm install
```

## 1. Portão automático

```bash
pnpm verify        # Biome, TypeScript, Vitest, cargo test, build
```

**Esperado**: tudo verde. Em particular:

- a suíte de contrato `shared/vault/tests/vault-contract.test.ts` passa com o adapter em memória;
- o `build` confirma que `src/mocks/` e o adapter em memória não estão no bundle (AMB-03);
- o Biome reprova qualquer import de `@tauri-apps/*` fora de `shared/vault/adapters/tauri/`
  (princípio III).

## 2. Critérios de aceite (Vitest, adapter em memória)

```bash
pnpm test -- features/vault features/editor features/links
```

Cada teste tem no nome o ID do critério. Todos precisam passar:

| História | Critérios |
| --- | --- |
| US1 | cenários [novo] 1–5 da spec |
| US2 | CA-NOTA-004-01, CA-NOTA-006-01, CA-LINK-006-01 |
| US3 | CA-NOTA-001-01, CA-NOTA-001-02, CA-NOTA-001-03, CA-NOTA-003-01, CA-NOTA-009-01, CA-NOTA-009-02 |
| US4 | CA-NOTA-007-01, CA-NOTA-008-01 e cenários [novo] 3–4 |
| US5 | CA-NOTA-010-01, CA-NOTA-010-02, CA-NOTA-010-03, CA-NOTA-011-01 |

## 3. Jornadas no navegador (Playwright + `dev:mock`)

```bash
pnpm test:e2e
```

`e2e/vault.spec.ts` sobe o `pnpm dev:mock` (vault de demonstração em memória) e percorre as
jornadas abaixo. **Esperado**: todas passam em Chromium.

- Criar uma nota e escrever nela.
- Renomear `deploy` → `release` e ver `[[release]]` em `infra`.
- Mover `backend/api` para `servicos/` e ver o link atualizado em `infra`.
- Excluir com confirmação e ver o link quebrado.
- Conflito externo resolvido pelas duas opções.

## 4. Validação manual no app desktop

```bash
pnpm tauri dev
```

Prepare uma pasta de teste fora do repositório com:

```text
vault-teste/
├── infra.md              # contém [[deploy]] e [[backend/api]]
├── deploy.md
├── mapa.canvas           # um nó {"type":"file","file":"deploy.md"}
├── backend/api.md
├── backend/util.md
└── frontend/util.md
```

| # | Passo | Resultado esperado | Cobre |
| --- | --- | --- | --- |
| 1 | Abrir o app pela primeira vez e escolher `vault-teste/` | A árvore mostra as pastas, as notas e o canvas | FR-001, FR-002 |
| 2 | Fechar e reabrir o app | O mesmo vault abre sozinho | FR-001 |
| 3 | Criar uma nota, digitar, esperar 1 s e abrir o arquivo em outro editor | O texto está no arquivo; o indicador "Não gravado" some | FR-004, SC-007 |
| 3b | Editar uma nota salva com quebras CRLF e BOM (ex.: criada no Bloco de Notas do Windows) | Depois de gravar, o arquivo continua com CRLF e BOM; só a linha editada muda | FR-004 |
| 4 | Renomear `deploy` → `release` | `infra.md` passa a ter `[[release]]`; `mapa.canvas` aponta `release.md`; toast com a quantidade de links | CA-NOTA-004-01 |
| 5 | Renomear `backend/util` → `api` | Bloqueado com aviso; nada muda no disco | CA-NOTA-006-01 |
| 6 | Renomear `frontend/util` → `api` | Links antigos `[[api]]` viram `[[backend/api]]` | CA-LINK-006-01 |
| 7 | Renomear `release` → `Release` | O arquivo muda só as maiúsculas, sem erro | research R8 |
| 8 | Criar a pasta `servicos/` e mover `backend/api` para ela | Links e cartões apontam para `servicos/api` | CA-NOTA-010-01/02 |
| 9 | Excluir uma nota e confirmar | A nota está na lixeira do sistema; `[[...]]` continua no texto das outras notas | CA-NOTA-001-01, CA-NOTA-003-01 |
| 10 | Excluir uma pasta | A confirmação mostra a quantidade de notas; a pasta vai inteira para a lixeira | CA-NOTA-009-01 |
| 11 | Com uma nota aberta e sem edição, alterá-la em outro editor | O conteúdo novo aparece em até 2 s | CA-NOTA-007-01, SC-004 |
| 12 | Digitar e, antes de 1 s, alterar o arquivo em outro editor | O diálogo aparece com as duas opções; nenhuma versão é perdida antes da escolha | CA-NOTA-008-01, SC-005 |
| 13 | Excluir no gerenciador de arquivos uma nota que está aberta | O app avisa que a nota foi excluída fora do app; com edição pendente, oferece recriá-la | Edge Cases |
| 14 | (Linux, sem lixeira freedesktop) Excluir uma nota | Aviso de lixeira indisponível; nada é excluído | CA-NOTA-001-03 |
| 15 | Mudar o tema do sistema operacional entre claro e escuro (a 001 não tem controle de tema; ele chega com a paleta de comandos) | O app acompanha o sistema; todas as telas usam os tokens do `brand.md`; o contraste é aprovado | Princípio V |

Repetir os passos 1–12 no Windows, no macOS e no Linux antes de considerar a feature pronta
(`arquitetura.md` §13, risco de WebView diferente por sistema).

## 5. Metas de desempenho

Gere um vault sintético de 5.000 notas (200 delas com link para `alvo.md`) com o utilitário de
teste de `features/vault/tests/` e abra-o com `pnpm tauri dev`.

| Meta | Esperado |
| --- | --- |
| SC-006: tempo até a árvore aparecer | ≤ 3 s |
| SC-002: renomear `alvo` | ≤ 5 s, com 200 links atualizados |
| SC-001: links e cartões apontando para o nome antigo após renomear ou mover | 0 |
