# Quickstart: validar a Busca

Roteiro para provar que a spec 004 funciona. Detalhes de contrato em
[contracts/modules.md](./contracts/modules.md) e [contracts/ui.md](./contracts/ui.md); regras de
consulta e ordem em [data-model.md](./data-model.md).

## Pré-requisitos

- Node 24, pnpm, Rust stable ≥ 1.90 (para `test:rust` e o app desktop).
- Porta 4300 livre para o `pnpm test:e2e`.

## 1. Portão automático

```bash
pnpm verify        # check, typecheck, test, test:rust, build
pnpm test:e2e      # jornadas no dev:mock
```

Esperado: tudo verde; o build continua sem o adapter de memória e sem `src/mocks/` (AMB-03).

## 2. Critérios de aceite (Vitest, adapter em memória)

Cada `CA-BUSCA-*` da spec vira teste com o ID no nome:

| Arquivo | Cobre |
| --- | --- |
| `src/features/search/tests/search-query.test.ts` | divisão da consulta, aspas, filtros, `http://` como texto |
| `src/shared/lib/snippet.test.ts` | trecho da linha (movido de backlinks) |
| `src/features/search/tests/search-occurrences.test.ts` | posições no arquivo (acento, BOM, CRLF), início de palavra, frases, trechos |
| `src/features/search/tests/search-metadata.test.ts` | tags (código, título, `C#`), propriedades, bloco malformado |
| `src/features/search/tests/search-index.test.ts` | CA-BUSCA-001-*, 002-*, 003-01, 004-01; reconciliação |
| `src/features/search/tests/search-suggestions.test.ts` | CA-BUSCA-006-01..03 |
| `src/features/search/tests/search-panel.test.tsx` | estados, contagem, "Mostrar mais", abrir no ponto, CA-BUSCA-006-04 |
| `src/features/search/tests/quick-search.test.tsx` | CA-BUSCA-005-01..05 |
| `src/features/search/tests/search-performance.test.ts` | SC-001, SC-002 com 5.000 notas |
| `src/app/tests/workspace-search.test.tsx` | abas, atalhos, abrir no ponto pelo editor |

## 3. Jornada no navegador (Playwright, `dev:mock`)

- `Ctrl+P`, parte do nome, Enter: a nota abre e o navegador não abre a impressão. É o único caso
  que precisa de um navegador de verdade (TST-07); o resto da busca fica no Vitest (revisão de
  padrões da T038).

## 4. Validação manual no app desktop

Vault de teste (fora do repositório, gerado por `gerar-vaults.mjs` como `vault-busca`):

```text
vault-busca/
├── deploy.md                    # "# Deploy"
├── infra.md                     # "o deploy falhou" e, em outra linha, "falhou de novo"; #backend
├── runbook.md                   # bloco de código com "kubectl rollout restart"; "falhou o deploy"
├── Configuração.md              # "Configuração do proxy"
├── rapido.md                    # "rapidamente, api-gateway e api_v2"
├── backend/api.md, frontend/api.md
└── snippets/
    ├── deploy-api.md            # #backend, "deploy", linguagem: csharp
    ├── hello-py.md              # linguagem: python, tags: [backend/api]
    └── dotnet/build.md          # "deploy", linguagem: csharp
```

| # | Passo | Resultado esperado | Cobre |
| --- | --- | --- | --- |
| 1 | `Ctrl+P`, `depl`, Enter | `deploy` abre; a janela de impressão não aparece | CA-BUSCA-005-01, R11 |
| 2 | `Ctrl+P`, `api` | `backend/api` e `frontend/api`, com a pasta | CA-BUSCA-005-02 |
| 3 | `Ctrl+P`, `configuracao` | `Configuração` aparece | CA-BUSCA-005-03 |
| 4 | `Ctrl+Shift+F`, `deploy` | `deploy` antes de `infra`; trechos destacados | CA-BUSCA-004-01 |
| 5 | Buscar `rollout` e escolher o trecho | `runbook` abre com o cursor em "rollout" | CA-BUSCA-001-01, 001-04 |
| 6 | Buscar `deploy falhou` e depois `"deploy falhou"` | primeiro `infra` e `runbook` (têm as duas palavras), sem `deploy` (só tem "deploy"); depois só `infra` (frase exata) | CA-BUSCA-001-02, 001-03 |
| 7 | Buscar `gateway` e `api` | `rapido` aparece em `gateway`; em `api` também (parte de `api-gateway`), mas não por "rapidamente" | R2 |
| 8 | Buscar `deploy tag:#backend pasta:snippets` | só `snippets/deploy-api` | CA-BUSCA-002-01 |
| 9 | Buscar `tag:#backend` | `infra`, `snippets/deploy-api` e `snippets/hello-py` (tag filha) | CA-BUSCA-002-02, 002-04 |
| 10 | Buscar `linguagem:csharp` | `deploy-api` e `dotnet/build` | CA-BUSCA-002-03, 002-06 |
| 11 | Digitar `tag:#ba`, `pasta:sn`, `linguagem:` | sugestões de tags, pastas e valores; escolher com o teclado | CA-BUSCA-006-01..04 |
| 12 | Com `rollout` buscado, escrever "rollout" em `infra.md` em outro editor | `infra` entra no resultado em até 2 s | CA-BUSCA-001-06, SC-003 |
| 13 | Renomear `infra` pela árvore com a busca aberta | o resultado mostra o nome novo | FR-012 |
| 14 | `Ctrl+Shift+E` | volta à árvore; `Ctrl+Shift+F` volta à busca com a consulta | FR-005 |

## 5. Metas de desempenho

Vault sintético de 5.000 notas das specs anteriores, depois da primeira leitura (antivírus).

| Meta | Esperado |
| --- | --- |
| SC-001: busca rápida, cada tecla | ≤ 0,3 s |
| SC-002: busca completa depois de parar de digitar | ≤ 0,5 s |
| SC-003: mudança numa nota aparece no resultado | ≤ 2 s |
| SC-004: busca pronta depois de o vault abrir | ≤ 5 s, sem atrasar árvore, abertura e digitação |

## 6. Registro de verificação

2026-09-30, Windows 11 Home, Intel Core i7-13620H, 32 GB, SSD NVMe, `pnpm tauri dev`, com a
interface dirigida pelo protocolo de depuração do WebView2 (como nas specs 002 e 003). Vaults
gerados por `gerar-vaults.mjs` (fora do repositório): `vault-busca` (o `runbook.md` tem BOM e CRLF)
e `vault-sintetico`.

### Roteiro da §4

| Passo | Resultado |
| --- | --- |
| 1 | ok, com `runb` no lugar de `depl`: no `vault-busca`, `depl` também casa com `snippets/deploy-api`, que vem primeiro por ser a mais recente (ordem da spec 002, FR-002). `Ctrl+P` enviado pelo próprio Windows (não pelo protocolo de depuração) abriu a busca rápida e não a impressão |
| 2 | ok: `api` com `backend` e `frontend` |
| 3 | ok |
| 4 | ok: `deploy` primeiro, 5 notas, trechos destacados |
| 5 | ok: `runbook` (BOM e CRLF) abre com o cursor em "rollout" |
| 6 | ok: `deploy falhou` acha `infra` e `runbook`, não `deploy`; a frase só `infra` |
| 7 | ok: `gateway` e `api` acham `rapido` (partes de `api-gateway`); "rapidamente" não conta para `api` |
| 8 | ok: só `snippets/deploy-api` |
| 9 | ok: `infra`, `deploy-api` e `hello-py` (tag filha pela propriedade `tags`) |
| 10 | ok: `deploy-api` e `dotnet/build` |
| 11 | **falhou na primeira rodada**: a seta para baixo às vezes era ignorada quando chegava durante a animação de abertura da lista (100 ms), e o Tab ficava sem sugestão para escolher. Corrigido: a primeira sugestão já vem destacada (`autoHighlight`); Enter ou Tab escolhem na hora e as setas mudam o destaque. Depois: ok |
| 12 | ok: 0,69 s |
| 13 | ok: `infra2` no resultado depois de renomear pela árvore |
| 14 | ok: a consulta continua ao voltar à aba |

### Metas da §5 (medianas, depois do aquecimento do antivírus)

| Meta | Esperado | Medido |
| --- | --- | --- |
| SC-001: busca rápida, cada tecla | ≤ 0,3 s | 0,06 s |
| SC-002: busca completa depois de parar de digitar (conta a espera de 150 ms) | ≤ 0,5 s | 0,24 s |
| SC-003: mudança numa nota aparece no resultado | ≤ 2 s | 0,83 s |
| SC-004: vault reaberto até a busca responder | ≤ 5 s | 1,35 s |
| SC-004: abrir `alvo` com o índice sendo montado / pronto | sem atraso | 0,24 s / 0,30 s |
| Abrir `alvo`, painel de backlinks visível / escondido | metas das specs 001 a 003 | 0,24 s / 0,11 s (0,19 s / 0,08 s na 003, dentro da variação daquela medição) |

- Unidade (adapter em memória, `search-performance.test.ts`): 5.000 notas com propriedades, tags e
  código; índice, busca rápida e as consultas de texto, frase e filtros abaixo das metas.
- Pendente: roteiro da §4 no macOS e no Linux, quando houver máquina.
