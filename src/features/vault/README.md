# vault

Explorador de arquivos do vault: abrir a pasta, árvore, criar notas e pastas,
renomear, mover e excluir. Dono das regras `RN-NOTA-*`
(`docs/regras-de-negocio.md` §6.1) e da spec `specs/001-vault-notas/`.

## Contrato (`index.ts`)

| Export | Para quê |
|---|---|
| `useVaultStore` | vault aberto, árvore, índice de links e as ações (store Zustand, ADR-006) |
| `VaultTree`, `VaultTreeSkeleton` | explorador; recebe `onOpenNote` e não conhece o editor |
| `onBeforeMutate`, `onEntryEvent`, `VaultEvent` | ganchos para quem reage às operações do vault (o editor) |
| `waitForIndex` | espera o índice de links do vault aberto |
| `FollowOutcome`, `FollowRequest` | resultado de `followLink`: abrir, escolher, nota excluída, nome inválido ou tipo não suportado |

A feature nunca importa `features/editor`. O editor se registra sozinho nos
ganchos ao ser carregado, e o `app/` passa ao explorador o `onOpenNote` que
abre a nota no editor.

## Regras de negócio

| Regra | O que o módulo faz | Implementado em |
|---|---|---|
| RN-NOTA-001 | Excluir envia a nota para a lixeira do sistema | US3 |
| RN-NOTA-002 | Excluir pede confirmação | US3 |
| RN-NOTA-003 | Links para a nota excluída continuam no texto | US3 |
| RN-NOTA-004 | Renomear atualiza os links | US2 |
| RN-NOTA-005 | Renomear atualiza os cartões de canvas | US2 |
| RN-NOTA-006 | Nome repetido na mesma pasta é bloqueado | US2 |
| RN-NOTA-007 | Alteração externa sem edição pendente aparece sozinha | US4 |
| RN-NOTA-008 | Alteração externa com edição pendente pede escolha | US4 |
| RN-NOTA-009 | Excluir pasta confirma com a quantidade de notas | US3 |
| RN-NOTA-010 | Mover atualiza links e cartões | US5 |
| RN-NOTA-011 | Mover para pasta com o mesmo nome é bloqueado | US5 |
| RN-NOTA-012 | Mover sozinho não repete nome; vale junto com renomear (spec, US5) | US5 |

Todas as histórias da spec 001 estão implementadas: abrir e reabrir o vault
(FR-001), árvore (FR-002), criar nota e pasta (FR-003), nomes (FR-005),
excluir para a lixeira, inclusive quando ela não existe (FR-007 a FR-010,
FR-024), renomear e mover com links e cartões de canvas (FR-011 a FR-018),
integridade das operações em lote (FR-019, FR-020) e mudanças externas
(FR-021 a FR-023).

## Como renomear e mover funcionam

1. Espera o índice de links (montado em segundo plano ao abrir o vault).
2. Calcula os arquivos afetados: as notas movidas, quem tem link para elas e os
   canvas com cartão delas (`affectedByMoves`, feature `links`).
3. `onBeforeMutate`: o editor grava a nota aberta, se ela estiver entre os
   afetados.
4. Lê o conteúdo atual dos afetados e monta o `ChangePlan` inteiro. Conflito
   de nome bloqueia tudo antes de gravar qualquer arquivo (FR-019).
5. Move primeiro; depois confere o conteúdo de todos os afetados numa leitura
   só e grava as edições, até 8 ao mesmo tempo. Arquivo alterado fora do app
   no meio do caminho é pulado e listado no aviso (FR-020).
6. Avisa o editor: `moved` para cada nota movida e `rewritten` para cada
   arquivo reescrito, porque o observador ignora as escritas do próprio app.

Se o usuário trocar de vault no meio de uma operação, o resultado dela é
descartado ao terminar, para não misturar a árvore do vault novo com a do
antigo.

## Seguir link (spec 002)

`followLink(link, notaDeOrigem)` resolve o destino com `resolveLinkTarget`
(feature `links`) e devolve o que fazer; quem mostra é o `app/`:

| Estado do link | Resultado |
| --- | --- |
| válido | `open`, com a seção quando o link tem `#Seção` |
| quebrado | `broken`: o `app/` pergunta antes; `recreateNote` recria vazia, sem sobrescrever |
| canvas ou outro arquivo | `unsupported`; nunca cria nota (FR-011) |
| pendente | cria a nota vazia e devolve `open` com `created` (RN-LINK-001) |
| ambíguo | `choose` com as candidatas e a seção; nada abre nem é criado até a escolha (FR-010) |

Link pendente (RN-LINK-001, FR-007, FR-009):

- Com pasta (`[[runbooks/rollback]]`), a nota nasce nela, e as pastas que
  faltam são criadas. Sem pasta, nasce na pasta da nota onde o link está
  escrito, inclusive quando é uma nota incorporada.
- Cada parte do caminho passa pelas regras de nome da spec 001; nome inválido
  devolve `invalid` com o motivo e não cria nada.
- Se o arquivo passou a existir antes da gravação, só abre: nada é
  sobrescrito (princípio II).

## Registro de notas excluídas (FR-003, ADR-009)

- Guardado em `.devnotes/deleted-notes.json` por `AppDataStore`, lido ao abrir o
  vault e gravado 500 ms depois de cada mudança (e ao fechar).
- Entra: cada nota excluída pelo app, inclusive as de uma pasta, e cada nota
  que some por mudança externa com o app aberto.
- Sai: quando volta a existir uma nota naquele caminho, por qualquer motivo.
- Renomear e mover pelo app não mexem no registro: os links são reescritos.
- Falha ao gravar o registro não interrompe nada nem mostra aviso.

## Exclusão (FR-024)

Excluir chama `Trash` de `shared/vault`. Lixeira indisponível bloqueia a
exclusão, sem alterar nada, e o aviso diz que dá para excluir pelo
gerenciador de arquivos. Nunca há exclusão definitiva.

## Decisões locais

- Nomes seguem as regras do Windows em todo sistema, para o vault abrir em
  qualquer um (research R7). `API` e `api` na mesma pasta são o mesmo nome.
- Nota nova se chama "Sem título" (depois "Sem título 2"…).
- Pastas começam recolhidas; só os filhos das pastas abertas são montados.
- Canvas aparece na árvore, desabilitado, até a spec de canvas.
