# Quickstart: validar Links e Incorporação

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Contratos**:
[ui](./contracts/ui.md), [links](./contracts/links-module.md),
[shared-vault](./contracts/shared-vault.md)

Pré-requisitos e comandos são os mesmos da [001](../001-vault-notas/quickstart.md).

## 1. Portão automático

```bash
pnpm verify
PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e   # ou sem a variável, com o Chromium do Playwright
```

**Esperado**: tudo verde, incluindo os casos novos da suíte de contrato (`modifiedAt` e
`AppDataStore`) e o `cargo test` dos comandos de dados do app.

## 2. Critérios de aceite (Vitest)

Cada teste cita o ID no nome.

| História | Critérios |
| --- | --- |
| US1 | CA-LINK-004-01/02/03, CA-LINK-002-01 a 05 e o cenário [novo] 9 |
| US2 | CA-LINK-001-01 a 04 |
| US3 | CA-LINK-005-01 a 05 e o cenário [novo] 6 |
| US4 | CA-EMBED-001-01/02/03, CA-EMBED-002-01, CA-EMBED-003-01 e o cenário [novo] 6 |
| US5 | CA-LINK-003-01/02 e CA-LINK-006-01 (regressão da 001) |

## 3. Jornadas no navegador (Playwright, `dev:mock`)

- `Ctrl`+clique em `[[ideia nova]]` cria e abre a nota na pasta da nota atual.
- Digitar `[[api` com `backend/api` e `frontend/api` no vault, escolher a de `backend/` e ver
  `[[backend/api]]` no texto.
- Nota com `![[checklist]]` mostra o conteúdo; alterar `checklist` por fora faz o bloco mudar.
- `[[util]]` com duas notas `util`: o diálogo pede a escolha.

## 4. Validação manual no app desktop

Vault de teste (fora do repositório):

```text
vault-links/
├── infra.md          # [[deploy]] [[deploy#Rollback]] [[ideia nova]] [[util]] [[mapa.canvas]]
├── deploy.md         # "# Deploy" … "## Rollback" …
├── runbook.md        # ![[checklist]] e ![[checklist#Antes do deploy]]
├── checklist.md      # "## Antes do deploy" … "## Depois" …
├── a.md              # ![[b]]
├── b.md              # ![[a]]
├── mapa.canvas
├── backend/util.md
├── backend/api.md
└── frontend/util.md, frontend/api.md
```

| # | Passo | Resultado esperado | Cobre |
| --- | --- | --- | --- |
| 1 | Abrir `infra` | `[[deploy]]` válido, `[[ideia nova]]` pendente, `[[util]]` ambíguo e `[[mapa.canvas]]` como arquivo, cada um com o seu traço | FR-001, FR-002 |
| 2 | `Ctrl`+clique em `[[deploy#Rollback]]` | `deploy` abre no título "Rollback" | CA-LINK-004-03 |
| 3 | Voltar a `infra`, cursor em `[[ideia nova]]`, `Ctrl+Enter` | Nota criada na pasta de `infra` e aberta | CA-LINK-001-01/04 |
| 4 | Excluir `deploy`, fechar e reabrir o app | `[[deploy]]` em `infra` aparece como quebrado | CA-LINK-002-02/03 |
| 5 | `Ctrl`+clique no link quebrado → "Recriar nota" | `deploy` vazia no mesmo caminho; o link volta a válido | CA-LINK-002-04/05 |
| 6 | `Ctrl`+clique em `[[util]]` | Diálogo com `backend/util` e `frontend/util` | CA-LINK-003-02 |
| 7 | Digitar `[[api` numa nota | Sugestões com a pasta; escolher `backend` insere `[[backend/api]]` | CA-LINK-005-02/03 |
| 8 | Abrir `runbook` | Blocos com a checklist inteira e só a seção "Antes do deploy" | CA-EMBED-001-01/03 |
| 9 | Com `runbook` aberta, editar `checklist.md` em outro editor | O bloco muda em até 2 s | CA-EMBED-001-02, SC-004 |
| 10 | Abrir `a` | Aviso de incorporação circular; o app segue respondendo | CA-EMBED-003-01 |
| 11 | Conferir `.devnotes/deleted-notes.json` depois do passo 4 | Existe, lista `deploy.md` | FR-003 |
| 12 | Em macOS e Linux, repetir o passo 4 | O registro é gravado (pasta começada por ponto) | research R4 |

## 5. Metas de desempenho

Vault sintético de 5.000 notas da 001.

| Meta | Esperado | Medido (Windows, 2026-09-30) |
| --- | --- | --- |
| SC-001: sugestões depois de cada tecla | ≤ 0,3 s | 5–26 ms por tecla; 0,22 s para abrir a lista |
| SC-003: `Ctrl`+clique em pendente até a nota aberta | ≤ 1 s | 0,31 s |
| SC-004: alteração da original aparecer no bloco | ≤ 2 s | 0,83 s |
| SC-005: nota com 20 incorporações abrir | ≤ 1 s | 0,34 s até os blocos visíveis terem conteúdo (o editor só desenha o que está na tela) |
| SC-006: estado do link mudar depois de excluir/criar o destino | ≤ 2 s | 0,42 s |

Medição no app desktop em **build de desenvolvimento** (`pnpm tauri dev`), com o
vault sintético (`painel.md` com 20 incorporações) gravado em disco e a
interface dirigida pelo protocolo de depuração do WebView2. Máquina: Windows 11
Home 10.0.26200, Intel Core i7-13620H, 32 GB, SSD, com Kaspersky ativo.

**Antivírus e arquivos recém-escritos**: com o Kaspersky, a primeira leitura de
um arquivo que outro programa acabou de escrever passa pela varredura (5.001
notas: 22 s na primeira leitura, 0,18 s na segunda, também pelo Node, fora do
app). Por isso, logo depois de recriar o vault sintético, o índice de links
demora até ~20 s. As medições acima foram feitas depois dessa primeira leitura.
Com 999 notas alteradas por fora de uma vez (troca de branch, por exemplo), o
app fica em dia em ~8 s e a janela responde o tempo todo; o tempo é quase todo a
leitura sob varredura.

## 6. Registro de verificação

### 2026-09-30 — Windows 11, automático

- `pnpm verify`: verde (280 testes Vitest, 14 testes Rust, build sem código de
  simulação nem recurso de rede).
- `PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e`: 10 jornadas verdes, entre elas as
  quatro da §3 (`e2e/links.spec.ts`), com `Ctrl`+clique real no navegador.
- Metas no adapter de memória (`vault-performance.test.ts`, vault sintético de
  5.000 notas): sugestões por tecla abaixo de 0,3 s (SC-001) e resolução dos
  400 links de uma nota bem abaixo de 1 s.
- `cargo test`: `.devnotes` como link simbólico (junção no Windows) para fora
  do vault é recusado na leitura e na gravação.
- Conferido visualmente no `dev:mock`, nos temas claro e escuro: traço de cada
  estado do link, bloco de incorporação com recuo e aninhado, aviso de
  incorporação circular e lista do autocomplete.

### 2026-09-30 — Windows 11, app desktop

Roteiro da §4 no `pnpm tauri dev`, dirigido pelo protocolo de depuração do
WebView2, com o vault `vault-links` (os passos e o resultado de cada um estão
em `dev-notes-teste/CHECKLIST.md`, fora do repositório):

| Passo | Resultado |
| --- | --- |
| 1 — estados do link | ok: contínuo, tracejado, ondulado e pontilhado; a dica diz o estado |
| 2 — `Ctrl`+clique em `[[deploy#Rollback]]` | ok: abre rolada até o título |
| 3 — `Ctrl+Enter` no pendente | ok: nota criada na raiz, aviso, link volta a válido |
| 4, 6, 7 — canvas, ambíguo, autocomplete | ok |
| 8 — blocos de `runbook` | ok |
| 9 — edição externa da checklist | ok: 0,82 s |
| 10 — circular | ok |
| 11, 12 — link quebrado e reabrir | ok: `.devnotes/deleted-notes.json` com `deploy.md`; quebrado depois de recarregar a janela |
| 13 — recriar | ok |
| Lixeira do Windows | ok: a exclusão aparece em ~1,3 s e o bloco volta em ~1,5–1,8 s depois de restaurar |

Encontrado e corrigido na validação:

- O bloco `![[nota#Seção]]` perdia o nome da seção quando a nota não existia;
  agora o nome vem do próprio link.
- Menu "…" da árvore estreito demais (texto quebrando e atalho cortado).

Ainda não verificado: o passo 12 no macOS e no Linux (pasta começada por ponto,
research R4).
