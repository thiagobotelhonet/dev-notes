# Quickstart: validar Backlinks

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Contratos**:
[modules](./contracts/modules.md), [ui](./contracts/ui.md)

Pré-requisitos e comandos são os mesmos da [001](../001-vault-notas/quickstart.md). O app de
desenvolvimento usa a porta 5000.

## 1. Portão automático

```bash
pnpm verify
PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e   # ou sem a variável, com o Chromium do Playwright
```

**Esperado**: tudo verde.

## 2. Critérios de aceite (Vitest)

Cada teste cita o ID no nome.

| História | Critérios |
| --- | --- |
| US1 | CA-BACK-001-01 a 06 |
| US2 | CA-BACK-002-01 (exibição), CA-BACK-002-02, CA-BACK-003-01 a 04 |
| US3 | CA-BACK-002-01 (ação), CA-BACK-004-01 a 04 |

## 3. Jornada no navegador (Playwright, `dev:mock`)

- Abrir `deploy`: o painel mostra `infra` e `runbook` com o trecho do link; abrir a seção de
  menções, linkar a de `infra` e ver o link no texto de `infra`.

## 4. Validação manual no app desktop

Vault de teste (fora do repositório):

```text
vault-backlinks/
├── deploy.md          # "# Deploy"
├── infra.md           # "[[deploy]] ... o deploy falhou ... [[deploy]] ... `deploy`"
├── runbook.md         # "![[deploy]]" e "Rodar o Deploy de novo."
├── rapido.md          # "rapidamente, api-gateway e api_v2"
├── backend/api.md, frontend/api.md
├── notas.md           # "a api (nova) e o [[backend/api]] e [[api]]"
└── db.md              # nome com 2 caracteres
```

| # | Passo | Resultado esperado | Cobre |
| --- | --- | --- | --- |
| 1 | Abrir `deploy` | Painel à direita: `infra` (2 links) e `runbook` (incorporação), com trechos | CA-BACK-001-01/04 |
| 2 | Clicar no segundo trecho de `infra` | `infra` abre com o cursor no segundo `[[deploy]]` | CA-BACK-001-02 |
| 3 | Voltar a `deploy`, abrir "Menções sem link" | Estava recolhida; mostra `infra` ("o deploy falhou") e `runbook` ("Deploy"); nada de código | CA-BACK-002-01/02, CA-BACK-003-02/03 |
| 4 | Linkar a menção de `runbook` | `runbook.md` passa a ter `[[Deploy]]`; o resto do arquivo igual | CA-BACK-004-01 |
| 5 | Abrir `backend/api` | `notas` aparece pelo `[[backend/api]]`; o `[[api]]` ambíguo não conta | CA-BACK-001-03 |
| 6 | Nas menções de `backend/api`, linkar "api" de `notas` | Vira `[[backend/api|api]]` | CA-BACK-004-02 |
| 7 | Abrir a nota `api` do backend e conferir as menções | `rapido` não aparece | CA-BACK-003-01 |
| 8 | Com `deploy` aberta, editar `infra.md` em outro editor tirando um link | O painel muda em até 2 s | CA-BACK-001-05, SC-003 |
| 9 | Com a lista de menções aberta, alterar `infra.md` por fora e clicar "Linkar" numa menção dela | Aviso de que a nota mudou; nada gravado; lista atualizada | CA-BACK-004-03 |
| 10 | `Ctrl+Shift+B` duas vezes | O painel some e volta | FR-007 |
| 11 | Abrir `db` | Menções: "Menções não são procuradas para nomes com menos de 3 caracteres." | FR-009 |

## 5. Metas de desempenho

Vault sintético de 5.000 notas das specs anteriores, depois da primeira leitura dos arquivos
(antivírus, ver o quickstart da 002).

| Meta | Esperado |
| --- | --- |
| SC-001: links no painel depois de abrir a nota | ≤ 0,5 s |
| SC-001: menções | ≤ 2 s |
| SC-003: painel refletir mudança em outra nota | ≤ 2 s |
| SC-004: linkar uma menção até o painel atualizar | ≤ 1 s |

## 6. Registro de verificação

2026-09-30, Windows 11 Home, Intel Core i7-13620H, 32 GB, SSD NVMe, `pnpm tauri dev`, com a
interface dirigida pelo protocolo de depuração do WebView2 (como na validação da 002). Vaults
gerados por `gerar-vaults.mjs` (fora do repositório): `vault-backlinks` (o `runbook.md` tem BOM e
CRLF) e `vault-sintetico`.

### Roteiro da §4

| Passo | Resultado |
| --- | --- |
| 1 | ok: `infra` com 2 trechos, `runbook` marcado "incorporação" |
| 2 | ok: cursor no segundo `[[deploy]]` de `infra` |
| 2b (extra) | **falhou na primeira rodada**: trecho de `runbook` (BOM e CRLF) punha o cursor deslocado uma posição por linha. Causa: o índice conta posições no arquivo e o editor tira o BOM e troca CRLF por `\n`. Corrigido: `open(path, { offset })` converte a posição (`editorOffset`), com teste. Depois: ok |
| 3 | ok: recolhida, "Menções sem link (2)", `infra` e `runbook`, nada de código |
| 4 | ok: `runbook.md` igual byte a byte, só `Deploy` → `[[Deploy]]`; BOM e CRLF mantidos |
| 5 | ok: `notas` com um trecho, o do `[[backend/api]]` |
| 6 | ok: `a [[backend/api|api]] (nova)` |
| 7 | ok: `rapido` fora das menções (a menção de `frontend/api`, "API do frontend", aparece, como deve) |
| 8 | ok: 0,68–0,79 s |
| 9 | ok: aviso "mudou fora do Dev Notes", arquivo com o conteúdo externo, lista atualizada |
| 10 | ok |
| 11 | ok |

### Metas da §5 (mediana de 5 rodadas, depois do aquecimento do antivírus)

| Meta | Esperado | Medido |
| --- | --- | --- |
| SC-001: links no painel depois de abrir `alvo` (201 notas apontando) | ≤ 0,5 s | 0,20 s |
| SC-001: menções | ≤ 2 s | 0,22 s |
| SC-003: link removido em outra nota | ≤ 2 s | 0,78 s |
| SC-003: link criado em outra nota | ≤ 2 s | 0,74 s |
| SC-004: linkar uma menção até o painel mostrar | ≤ 1 s | 0,15 s |
| SC-002: abrir `alvo`, painel visível / escondido | dentro das metas da 001 | 0,19 s / 0,08 s |
| SC-002: abrir `painel` (20 incorporações), painel visível / escondido | dentro das metas da 001 | 0,13 s / 0,07 s |

- SC-002: a 001 não fixa tempo de abertura; com o painel visível a abertura fica até 0,1 s mais
  lenta numa nota com 201 backlinks, que é o custo de desenhar a lista. Adiar o desenho da lista
  (`startTransition`) foi testado e não mudou o resultado além do ruído; ficou de fora.
- Unidade (adapter em memória, `backlinks-performance.test.ts`): `backlinkGroups` e
  `mentionGroups` de `alvo` em 5.000 notas bem abaixo de 0,5 s e 2 s.
- Pendente: roteiro da §4 no macOS e no Linux, quando houver máquina.
