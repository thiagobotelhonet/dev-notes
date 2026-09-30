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
- Com `infra` aberta, renomear `deploy` → `release` e ver `[[release]]` no editor, sem diálogo
  de conflito.
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
| 12b | Digitar e, uns 900 ms depois, gravar o arquivo em outro editor (a gravação automática do app roda antes de o observador avisar) | O diálogo de conflito aparece; o arquivo em disco continua com o conteúdo externo até a escolha | FR-022, SC-005 |
| 13 | Excluir no gerenciador de arquivos uma nota que está aberta | O app avisa que a nota foi excluída fora do app; com edição pendente, oferece recriá-la | Edge Cases |
| 14 | (Linux, sem lixeira freedesktop) Excluir uma nota | Aviso de lixeira indisponível; nada é excluído | CA-NOTA-001-03 |
| 15 | Mudar o tema do sistema operacional entre claro e escuro (a 001 não tem controle de tema; ele chega com a paleta de comandos) | O app acompanha o sistema; todas as telas usam os tokens do `brand.md` (sem cor fora deles, conferido pelo `app-review-standards` no T088); os pares de texto são os já validados em 4,5:1 no `brand.md` §2.3, e nenhum texto aparece sobre um fundo fora desses pares | Princípio V |

Repetir os passos 1–12b no Windows, no macOS e no Linux antes de considerar a feature pronta
(`arquitetura.md` §13, risco de WebView diferente por sistema).

## 5. Metas de desempenho

Gere um vault sintético de 5.000 notas (200 delas com link para `alvo.md`) com o utilitário de
teste de `features/vault/tests/` e abra-o com `pnpm tauri dev`. O início e o fim de cada medição
estão na spec (Assumptions, "Medição de desempenho"). Registre junto a máquina usada (sistema, CPU,
memória, tipo de disco).

| Meta | Esperado | Medido (Windows, 2026-09-30) |
| --- | --- | --- |
| SC-006: tempo até a árvore aparecer | ≤ 3 s | 1,0–1,2 s |
| SC-002: renomear `alvo` | ≤ 5 s, com 200 links atualizados | 2,9 s (200 notas, 400 ocorrências) |
| SC-004: alteração externa até aparecer no editor | ≤ 2 s | 0,83 s |
| SC-001: links e cartões apontando para o nome antigo após renomear ou mover | 0 | 0 |

Medição de 2026-09-30, feita no app desktop em **build de desenvolvimento**
(`pnpm tauri dev`: Rust sem otimização e front sem minificação), com o vault
sintético gravado em disco e a interface dirigida pelo protocolo de depuração
do WebView2. Máquina: Windows 11 Home 10.0.26200, SSD. O build de release só
tende a ser mais rápido.

- SC-006 conta do recarregamento da janela até a árvore aparecer, **incluindo**
  a inicialização do app; é um limite superior do que a spec mede.
- SC-002 conta do Enter no novo nome até o aviso de sucesso, com o índice já
  pronto. A primeira medição deu 6,0 s; duas mudanças trouxeram para 2,9 s: a
  conferência dos arquivos antes de gravar passou a ser uma leitura em lote, e
  as gravações das edições rodam até 8 ao mesmo tempo (cada uma é num arquivo
  diferente).
- No adapter de memória, `vault-performance.test.ts` (SC-001, SC-002) roda no
  `pnpm test`.

## 6. Contrato do `shared/vault` no adapter Tauri

A suíte `vault-contract.test.ts` roda automaticamente só no adapter de memória (research R14).
No app desktop, os mesmos casos são conferidos à mão, nos três sistemas, com `pnpm tauri dev` e a
pasta `vault-teste/` da §4.

| # | Caso | Como provocar | Esperado |
| --- | --- | --- | --- |
| C1 | Itens ocultos | Criar `vault-teste/.oculta/x.md` e `vault-teste/.y.md` no gerenciador de arquivos | Nenhum dos dois aparece na árvore |
| C2 | Conflito só de maiúsculas | Criar a pasta `Backend` ao lado de `backend/` | Bloqueado com "Já existe uma pasta chamada…" |
| C3 | Renomear só maiúsculas | Passo 7 da §4 | O arquivo muda de grafia no disco |
| C4 | Mover pasta leva o conteúdo | Mover `frontend/` para dentro de `servicos/` | `servicos/frontend/util.md` existe no disco |
| C5 | Lixeira | Passos 9 e 14 da §4 | A entrada vai para a lixeira; sem lixeira, nada muda |
| C6 | Eco do próprio app | Editar e esperar a gravação | Nenhum aviso de alteração externa |
| C7 | Alteração externa | Passo 11 da §4 | O conteúdo novo aparece |
| C8 | Raiz removida | Com o app aberto, renomear `vault-teste/` no gerenciador de arquivos | Tela "A pasta do vault não está mais acessível" com "Escolher outra pasta" |
| C9 | Caminho fora da raiz | Coberto pelo `cargo test` de `resolve_in_vault` (T023) | `pnpm test:rust` verde |
| C10 | Último vault sumiu | Com o app fechado, renomear `vault-teste/` e abrir o app | Tela "Não foi possível abrir o vault" com "Escolher outra pasta" |
| C11 | Nota aberta reescrita pelo app | Abrir `infra` e renomear `deploy` → `release` | O editor mostra `[[release]]`; nenhum aviso de alteração externa |

## 7. Registro de verificação

### Windows 11 (2026-09-30)

Automático, na máquina de desenvolvimento:

- `pnpm verify` verde: Biome, TypeScript, 168 testes Vitest, 10 testes Rust e
  build sem simulação nem recurso de rede.
- `pnpm test:e2e`: 6 jornadas verdes, no Chrome instalado
  (`PLAYWRIGHT_CHANNEL=chrome`), porque a rede bloqueou o download do Chromium
  do Playwright (certificado autoassinado na cadeia).
- `cargo test`: os casos de link simbólico rodaram de verdade no Windows, com
  junção (`mklink /J`) no lugar do link simbólico.

No app desktop (`pnpm tauri dev`), com a pasta `vault-teste/` da §4:

| Passo / caso | Resultado |
| --- | --- |
| 1, 2, C1 — reabrir o último vault; ocultos fora da árvore | ok: árvore com pastas, notas e canvas; `.devnotes/` oculta |
| 3b — nota com CRLF e BOM | **falhou na primeira vez**: o BOM sumia ao gravar, porque o `readTextFile` do plugin descarta o BOM. Corrigido (o adapter lê pelo `vault_read_notes`) e caso novo na suíte de contrato; depois: `ef bb bf` + CRLF preservados, só a linha editada mudou |
| 4, C6 — renomear `deploy` → `release` com `infra` aberta | ok: `[[release]]` no editor, cartão do canvas atualizado mantendo a indentação por tab, aviso "2 links atualizados", sem falso conflito |
| 9, C5 — excluir nota | ok: a nota foi para a Lixeira do Windows com o local de origem |
| 11, C7 — alteração externa sem edição pendente | ok: apareceu em 0,83 s |
| 12 — alteração externa com edição pendente | ok: diálogo com as duas opções, disco intacto até a escolha, "Manter minha versão" gravou a versão do app |
| Recarregar a janela (F5) | ok: o vault reabre. Os observadores da página anterior passaram a ser encerrados no `beforeunload` |

Ainda não verificado:

- Passos 5–8, 10, 12b, 13, 14 e 15 e os casos C2–C4, C8–C11 no app desktop
  (cobertos no adapter de memória pelo `pnpm test` e pelo e2e, mas não
  repetidos à mão no Tauri).
- macOS e Linux: nenhum passo foi executado. A conferência do método
  `NsFileManager` da lixeira no macOS (research R6) depende de uma máquina
  macOS; o nome da API foi confirmado no código do crate `trash` 5.2.9.
