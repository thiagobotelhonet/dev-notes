# Feature Specification: Backlinks

**Feature Branch**: `003-backlinks`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "docs/regras-de-negocio.md — spec 003, feature `backlinks`: cobre o grupo
RN-BACK-001..004 (painel da nota com as notas que têm link para ela; seção separada e recolhida
por padrão com as notas que citam o nome sem link; menção só conta como palavra inteira; cada
menção sem link pode virar link por uma ação do usuário), com CA-BACK-002-01 e CA-BACK-003-01 como
cenários de aceite (DEC-PROD-016). Usa o índice de links da spec 001 (`linksTo`) e a resolução de
links da spec 002 (`resolveLinkTarget`, links ambíguos e com pasta), sem mudar esses contratos. É o
primeiro painel lateral do app (LAY-03, `app-panel`) e a primeira lista de notas (LAY-02,
`app-note-list`). Transformar menção em link grava a nota que menciona, então segue as regras de
gravação da spec 001 (edição pendente gravada antes, alteração externa, nunca sobrescrever conteúdo
desconhecido) e insere o link no formato da RN-LINK-004 (pasta quando o nome é repetido)."

**Fontes**: `docs/regras-de-negocio.md` v1.1 (§3 Glossário, §5 DEC-PROD-016, §6.10, §9) ·
`.specify/memory/constitution.md` v1.0.1 · `specs/001-vault-notas/spec.md` (gravação e alteração
externa) · `specs/002-links-incorporacao/spec.md` (estados e resolução de links)

## Clarifications

### Session 2026-09-30

- Q: Notas com nome muito curto (`a`, `db`) geram menções sem link? → A: Não. Nomes com menos de 3 caracteres não geram menções; os links para essas notas continuam no painel.
- Q: O usuário pode linkar várias menções de uma vez? → A: Não nesta spec. Cada menção é linkada por vez (RN-BACK-004); lote pode vir depois.

## User Scenarios & Testing *(mandatory)*

Convenção: cenários com ID `CA-*` vêm literalmente de `regras-de-negocio.md` §9. Cenários marcados
**[novo]** cobrem regras que ainda não tinham critério de aceite e devem ser incorporados ao
documento de regras.

### User Story 1 - Ver quem aponta para a nota (Priority: P1)

O dev abre a nota `deploy` e, ao lado do texto, vê a lista das notas que têm link para ela, com o
trecho onde o link aparece. Com um clique, vai para a nota que aponta, já no ponto do link.

**Why this priority**: é o que transforma links de mão única em navegação nos dois sentidos; sem
isso, descobrir onde uma nota é usada exige abrir nota por nota.

**Independent Test**: num vault em que `infra` e `runbook` têm link para `deploy`, abrir `deploy` e
conferir que as duas aparecem no painel com o trecho do link; clicar numa delas e conferir que ela
abre no ponto do link.

**Acceptance Scenarios** (RN-BACK-001):

1. **[novo] CA-BACK-001-01 — Painel de backlinks**: **Dado** que `infra` e `runbook` contêm
   `[[deploy]]`, **Quando** o usuário abre `deploy`, **Então** o painel mostra `infra` e `runbook`,
   cada uma com a pasta e o trecho onde o link aparece.
2. **[novo] CA-BACK-001-02 — Abrir no ponto do link**: **Dado** o cenário anterior, **Quando** o
   usuário escolhe `infra` no painel, **Então** `infra` abre com o cursor no link para `deploy`.
3. **[novo] CA-BACK-001-03 — Link com pasta e nome repetido**: **Dado** que existem `backend/api` e
   `frontend/api`, e `infra` contém `[[backend/api]]` e `[[api]]`, **Quando** o usuário abre
   `backend/api`, **Então** `infra` aparece no painel pelo link `[[backend/api]]`, e o link ambíguo
   `[[api]]` não conta para nenhuma das duas.
4. **[novo] CA-BACK-001-04 — Várias ocorrências na mesma nota**: **Dado** que `infra` tem três links
   para `deploy`, **Quando** o usuário abre `deploy`, **Então** `infra` aparece uma vez no painel,
   com a quantidade de links e o trecho de cada um.
5. **[novo] CA-BACK-001-05 — Painel acompanha mudanças**: **Dado** que `deploy` está aberta,
   **Quando** outra nota ganha ou perde um link para `deploy` (pelo app ou por outra ferramenta),
   **Então** o painel se atualiza sem o usuário reabrir `deploy`.
6. **[novo] CA-BACK-001-06 — Nenhum backlink**: **Dado** que nenhuma nota aponta para `rascunho`,
   **Quando** o usuário abre `rascunho`, **Então** o painel diz que nenhuma nota aponta para ela.

---

### User Story 2 - Descobrir menções sem link (Priority: P2)

O dev escreveu "o deploy falhou" em várias notas sem criar link. Ao abrir `deploy`, uma seção
recolhida do painel mostra as notas que citam "deploy" sem link, para ele decidir quais merecem
link.

**Why this priority**: revela conexões que o usuário não registrou; tem valor, mas o painel de
links (US1) já é útil sem ela.

**Independent Test**: num vault em que `infra` cita "deploy" sem link e outra nota tem só
"rapidamente", abrir `deploy` e a nota `api`, e conferir quem aparece como menção.

**Acceptance Scenarios** (RN-BACK-002, 003):

1. **CA-BACK-002-01 — Menção sem link** (parte de exibição): **Dado** que `infra` cita "deploy" no
   texto sem link, **Quando** o usuário abre a nota `deploy`, **Então** `infra` aparece na seção
   recolhida de menções sem link.
2. **CA-BACK-003-01 — Palavra parcial não conta**: **Dado** que existe a nota `api` e outra nota
   contém só a palavra "rapidamente", **Quando** o usuário abre a nota `api`, **Então** a outra
   nota não aparece como menção.
3. **[novo] CA-BACK-002-02 — Seção recolhida por padrão**: **Dado** que há menções sem link para
   `deploy`, **Quando** o usuário abre `deploy`, **Então** a seção de menções aparece recolhida,
   com a quantidade de notas visível, e abre com uma ação do usuário.
4. **[novo] CA-BACK-003-02 — Maiúsculas não contam**: **Dado** que `infra` cita "Deploy" sem link,
   **Quando** o usuário abre `deploy`, **Então** `infra` aparece como menção.
5. **[novo] CA-BACK-003-03 — Link e código não são menção**: **Dado** que `infra` tem `[[deploy]]`,
   um bloco de código com "deploy" e nenhuma outra citação, **Quando** o usuário abre `deploy`,
   **Então** `infra` aparece só nos links, não nas menções.
6. **[novo] CA-BACK-003-04 — Nome com várias palavras**: **Dado** que existe a nota `ideia nova` e
   `infra` cita "a ideia nova do time", **Quando** o usuário abre `ideia nova`, **Então** `infra`
   aparece como menção.

---

### User Story 3 - Transformar menção em link (Priority: P2)

Na lista de menções, o dev escolhe "Linkar" ao lado de um trecho e a citação vira link, sem abrir a
outra nota e sem perder nada do que já estava escrito nela.

**Why this priority**: fecha o ciclo da US2; sem ela, o usuário precisaria abrir cada nota e
escrever o link à mão.

**Independent Test**: com `infra` citando "deploy" sem link, abrir `deploy`, linkar a menção e
conferir no disco que `infra` passou a ter o link no lugar exato e nada mais mudou.

**Acceptance Scenarios** (RN-BACK-004; regras de gravação da spec 001):

1. **CA-BACK-002-01 — Menção sem link** (parte de ação): **Dado** que `infra` cita "deploy" no
   texto sem link, **Quando** o usuário transforma a menção em link, **Então** o trecho passa a
   ser `[[deploy]]` em `infra`, `infra` sai das menções e entra nos links do painel.
2. **[novo] CA-BACK-004-01 — Texto preservado**: **Dado** que `infra` cita "Deploy" (com maiúscula)
   sem link, **Quando** o usuário linka a menção, **Então** o texto passa a ser `[[Deploy]]` e o
   resto do arquivo fica igual byte a byte, inclusive quebras de linha e BOM.
3. **[novo] CA-BACK-004-02 — Nome repetido inclui a pasta**: **Dado** que existem `backend/api` e
   `frontend/api`, e `infra` cita "api" sem link, **Quando** o usuário abre `backend/api` e linka a
   menção, **Então** o texto passa a ser `[[backend/api|api]]`: o link aponta para a nota certa e
   o texto lido continua "api" (RN-LINK-004).
4. **[novo] CA-BACK-004-03 — Nota alterada por fora**: **Dado** que a menção aparece no painel,
   **Quando** `infra` é alterada por outra ferramenta e o trecho some antes de o usuário linkar,
   **Então** nada é gravado, o app avisa que a nota mudou e o painel é atualizado.
5. **[novo] CA-BACK-004-04 — Uma menção por vez**: **Dado** que `infra` cita "deploy" duas vezes,
   **Quando** o usuário linka uma das menções, **Então** só aquela vira link e a outra continua na
   lista.

---

### Edge Cases

- **A própria nota**: links e menções da nota para ela mesma não aparecem no painel dela.
- **Incorporação**: `![[deploy]]` conta como link para `deploy` e aparece no painel identificado
  como incorporação.
- **Link quebrado ou pendente**: `[[deploy]]` escrito numa nota quando `deploy` ainda não existe
  passa a aparecer no painel de `deploy` assim que ela for criada.
- **Nota renomeada ou movida pelo app**: os links são reescritos pela spec 001 e o painel continua
  mostrando as mesmas notas.
- **Nota que aponta excluída**: sai do painel.
- **Menção dentro de outro link**: "deploy" dentro de `[[deploy-antigo]]` ou do apelido de um link
  (`[[release|o deploy]]`) não é menção.
- **Palavra inteira**: letras (com e sem acento), números, hífen e sublinhado fazem parte da
  palavra; "api" não é menção dentro de "rapidamente", "api-gateway" nem "api_v2", mas é em "a api,"
  ou "(api)".
- **Acentos**: a menção precisa ter os mesmos acentos do nome; "configuracao" não é menção de
  `configuração`, porque o link resultante não apontaria para ela.
- **Nome repetido nas menções**: "util" citado sem pasta aparece como menção no painel de
  `backend/util` e no de `frontend/util`; quem linka escolhe, pelo painel em que está, para qual
  nota o link aponta.
- **Nome muito curto**: notas com nome de menos de 3 caracteres (`a`, `db`) não geram menções,
  porque casariam com artigos e siglas em quase toda nota; os links para elas continuam no painel
  (FR-009).
- **Linkar com a nota que menciona aberta**: só há uma nota aberta por vez e o painel é da nota
  aberta, então a nota que menciona está fechada; se isso mudar (abas), a edição pendente dela é
  gravada antes (regra da spec 001).
- **Gravação falha**: se não for possível gravar, nada muda, o app avisa e a menção continua na
  lista.
- **Vault grande**: o painel aparece sem travar a abertura da nota; as menções podem chegar depois
  dos links.
- **Nota aberta com edição não gravada**: o painel reflete o que está gravado nas outras notas; a
  edição da nota aberta não muda os backlinks dela.

## Requirements *(mandatory)*

### Functional Requirements

**Painel de backlinks (RN-BACK-001)**

- **FR-001**: Com uma nota aberta, o app MUST mostrar num painel lateral as notas que contêm link
  para ela, incluindo incorporações (`![[...]]`), cada uma com o nome, a pasta e o trecho de cada
  ocorrência.
- **FR-002**: Um link conta para a nota quando resolve para ela pelas regras de resolução da spec
  002 (RN-LINK-004): caminho exato com pasta, ou nome único sem pasta. Link ambíguo, pendente ou
  quebrado MUST NOT contar para nenhuma nota.
- **FR-003**: Cada nota aparece uma vez no painel, com a quantidade de ocorrências; as notas vêm em
  ordem alfabética pelo caminho.
- **FR-004**: Escolher uma ocorrência MUST abrir a nota que aponta com o cursor no link (a edição
  pendente da nota atual é gravada antes, como na spec 001).
- **FR-005**: O painel MUST se atualizar quando notas são criadas, alteradas, renomeadas, movidas ou
  excluídas, pelo app ou por outra ferramenta, sem reabrir a nota.
- **FR-006**: Sem backlinks, o painel MUST dizer que nenhuma nota aponta para a nota aberta.
- **FR-007**: O usuário MUST poder mostrar e esconder o painel, com mouse e com atalho de teclado
  visível (LAY-06).

**Menções sem link (RN-BACK-002, 003)**

- **FR-008**: O painel MUST ter uma seção separada, recolhida por padrão, com as notas que citam o
  nome da nota aberta sem link, com a quantidade de notas visível mesmo recolhida.
- **FR-009**: Só MUST contar como menção a ocorrência do nome como palavra inteira (ou sequência de
  palavras inteiras, para nomes com espaço), sem diferenciar maiúsculas, com os mesmos acentos, fora
  de links, de apelidos de link e de trechos de código. Notas com nome de menos de 3 caracteres
  MUST NOT gerar menções.
- **FR-010**: Cada menção MUST mostrar o trecho em que aparece e poder ser aberta no ponto da menção.

**Transformar menção em link (RN-BACK-004)**

- **FR-011**: Cada menção MUST ter uma ação que a transforma em link, gravando a nota que menciona
  sem abri-la.
- **FR-012**: O link inserido MUST preservar o texto lido: `[[texto]]` quando o nome é único no
  vault (o texto como estava escrito, inclusive maiúsculas), e `[[pasta/nome|texto]]` quando o nome
  é repetido (RN-LINK-004). O link resultante MUST apontar para a nota aberta.
- **FR-013**: Antes de gravar, o app MUST conferir que o arquivo ainda tem a menção no mesmo
  lugar; se o arquivo mudou fora do app, MUST NOT gravar, MUST avisar e MUST atualizar o painel
  (spec 001, "nunca sobrescrever conteúdo desconhecido").
- **FR-014**: A gravação MUST alterar só o trecho da menção, preservando o resto do arquivo byte a
  byte, inclusive quebras de linha e BOM (FR-004 da spec 001), e MUST ser registrada como escrita
  do próprio app, sem gerar aviso de alteração externa.
- **FR-015**: Depois de linkar, a menção MUST sair da seção de menções e a nota MUST aparecer (ou
  continuar) na lista de links, sem reabrir a nota.
- **FR-016**: Falha ao gravar MUST deixar o arquivo como estava e avisar o usuário.

**Gerais**

- **FR-017**: Exibir o painel MUST NOT alterar nenhum arquivo; só a ação de linkar grava.
- **FR-018**: Todas as funções desta spec MUST funcionar sem internet.

### Key Entities *(include if feature involves data)*

- **Backlink**: ocorrência de link, numa nota, que resolve para a nota aberta; tem a nota de
  origem, a posição e o trecho.
- **Menção sem link**: ocorrência do nome da nota aberta como palavra inteira, fora de links e de
  código, numa outra nota; tem a nota de origem, a posição, o texto exato e o trecho.
- **Painel de backlinks**: lista das notas com backlinks para a nota aberta e seção recolhida de
  menções sem link; derivado dos arquivos, nunca gravado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Num vault de 5.000 notas, a lista de links aparece em até 0,5 s depois de abrir a
  nota, e as menções em até 2 s.
- **SC-002**: A abertura da nota não fica mais lenta por causa do painel (continua dentro das metas
  da spec 001).
- **SC-003**: O painel reflete uma mudança em outra nota (link criado, removido ou nota excluída) em
  até 2 s.
- **SC-004**: Linkar uma menção grava e atualiza o painel em até 1 s.
- **SC-005**: 100% das menções linkadas passam a apontar para a nota em cujo painel a ação foi
  feita, e nenhum outro byte do arquivo muda.
- **SC-006**: Nenhuma palavra parcial (nome dentro de outra palavra) aparece como menção.

## Assumptions

- **Local do painel**: painel lateral à direita da nota, aberto por padrão; a
  escolha de mostrar ou esconder vale durante a sessão. Lembrar entre sessões fica para a spec de
  abas e painéis (RN-UI-001).
- **Uma nota aberta por vez**: como nas specs 001 e 002; o painel é sempre da nota aberta.
- **Trecho**: a linha onde está a ocorrência, cortada ao redor dela quando for longa.
- **Linkar em lote**: fora desta spec; cada menção é linkada por vez (RN-BACK-004). Linkar todas
  as menções de uma nota ou do painel pode vir depois.
- **Canvas**: cartões de canvas que referenciam a nota não aparecem no painel até a spec de canvas.
- **Menções em propriedades (frontmatter)**: tratadas como texto comum até a spec de propriedades.
- **Desfazer**: linkar não tem desfazer próprio nesta spec; o histórico de versões fica para a spec
  de histórico. O usuário pode apagar os colchetes à mão.
- **Nomes considerados**: só o nome da nota (sem pasta e sem `.md`); apelidos de nota ficam para a
  spec de propriedades.
- **Dependências**: índice e reescrita de links (spec 001), resolução e estados de link (spec 002).
  Nenhum contrato dessas specs muda.
- **Fora do escopo**: grafo de notas, backlinks entre vaults, busca por texto livre (spec de busca).
