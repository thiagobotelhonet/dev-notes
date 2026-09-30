# Feature Specification: Links e Incorporação

**Feature Branch**: `002-links-incorporacao`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "docs/regras-de-negocio.md — spec 002, feature `links`: cobre o grupo
RN-LINK-001..006 (links internos [[nome]] e [[pasta/nome]], link pendente que cria a nota ao ser
clicado, aparência diferente de link pendente e de link quebrado, notas com o mesmo nome em pastas
diferentes, inclusão automática da pasta quando o nome é repetido, autocomplete de links) e
RN-EMBED-001..003 (incorporação ![[nota]]), com os CA-LINK-* e CA-EMBED-* como cenários de aceite.
Amplia o módulo `links` criado pela spec 001 (índice de links, parser e reescrita ao renomear/mover)
sem mudar o contrato dela, e usa o editor CodeMirror 6 da 001."

**Fontes**: `docs/regras-de-negocio.md` v1.1 (§3 Glossário, §6.2, §6.3, §7, §9) ·
`.specify/memory/constitution.md` v1.0.1 · `specs/001-vault-notas/spec.md` (vault, notas, renomear e
mover)

## Clarifications

### Session 2026-09-30

- Q: Como o usuário segue um link no editor? → A: Ctrl+clique (Cmd+clique no macOS) segue o link; o clique simples só posiciona o cursor para editar. Pelo teclado, um atalho segue o link onde está o cursor.
- Q: Como a incorporação `![[nota]]` aparece no editor? → A: A linha `![[nota]]` continua visível e editável; o conteúdo incorporado aparece num bloco somente leitura logo abaixo dela, com o nome da nota e uma ação para abrir a original.
- Q: Os links dentro de um bloco incorporado devem funcionar? → A: Sim. Têm a mesma aparência de estado e seguem com Ctrl+clique, como no texto normal; o resto do bloco é somente leitura.
- Q: Em que ordem o autocomplete mostra as notas? → A: Primeiro as notas cujo nome começa com o texto digitado, depois as que contêm o texto no nome, depois as que só combinam pela pasta; no empate, a editada mais recentemente vem antes.

## User Scenarios & Testing *(mandatory)*

Convenção: cenários com ID `CA-*` vêm literalmente de `regras-de-negocio.md` §9. Cenários marcados
**[novo]** cobrem regras que ainda não tinham critério de aceite e devem ser incorporados ao
documento de regras.

### User Story 1 - Navegar pelos links entre notas (Priority: P1)

O dev escreve `[[deploy]]` numa nota e o link aparece destacado no texto. Ao seguir o link, a nota
`deploy` abre. Pela aparência, ele sabe na hora se o link aponta para uma nota que existe, para uma
nota que ainda não existe ou para uma nota que foi excluída.

**Why this priority**: links internos são o que transforma arquivos soltos numa base de
conhecimento; sem segui-los, o vault é só uma pasta de arquivos.

**Independent Test**: num vault com notas que se referenciam, abrir uma nota, seguir um link e
conferir que a nota de destino abriu; conferir que um link para nome inexistente tem aparência
diferente.

**Acceptance Scenarios**:

1. **[novo] CA-LINK-004-01 — Seguir link**: **Dado** que `infra` contém `[[deploy]]` e a nota
   `deploy` existe, **Quando** o usuário segue o link, **Então** a nota `deploy` é aberta.
2. **[novo] CA-LINK-004-02 — Seguir link com pasta**: **Dado** que existem `backend/api` e
   `frontend/api` e `infra` contém `[[backend/api]]`, **Quando** o usuário segue o link, **Então**
   a nota `backend/api` é aberta.
3. **[novo] CA-LINK-004-03 — Seguir link para seção**: **Dado** que `infra` contém
   `[[deploy#Rollback]]` e `deploy` tem o título "Rollback", **Quando** o usuário segue o link,
   **Então** `deploy` é aberta posicionada no título "Rollback".
4. **[novo] CA-LINK-002-01 — Aparência de link pendente**: **Dado** que `infra` contém
   `[[deploy]]` e `[[ideia nova]]`, e só `deploy` existe, **Quando** `infra` é aberta, **Então**
   `[[ideia nova]]` aparece com aparência de link pendente, diferente de `[[deploy]]`, e a
   diferença não depende só de cor.
5. **[novo] CA-LINK-002-02 — Aparência de link quebrado**: **Dado** que `infra` contém
   `[[deploy]]`, **Quando** `deploy` é excluída pelo app, **Então** `[[deploy]]` continua no texto
   e passa a aparecer como link quebrado, diferente de link pendente e de link válido.
6. **[novo] CA-LINK-002-03 — Link quebrado sobrevive ao reabrir o app**: **Dado** que `deploy` foi
   excluída e `infra` contém `[[deploy]]`, **Quando** o app é fechado e aberto de novo, **Então**
   `[[deploy]]` continua aparecendo como link quebrado, não como pendente.
7. **[novo] CA-LINK-002-04 — Seguir link quebrado**: **Dado** que `[[deploy]]` aparece como link
   quebrado, **Quando** o usuário segue o link, **Então** o app avisa que a nota foi excluída e pode
   ser restaurada pela lixeira do sistema, e oferece recriá-la vazia; nada é criado sem a escolha.
8. **[novo] CA-LINK-002-05 — Nota restaurada**: **Dado** que `[[deploy]]` aparece como link
   quebrado, **Quando** `deploy` volta ao vault (restaurada pela lixeira ou recriada), **Então** o
   link volta a aparecer como válido.
9. **[novo]** **Dado** que um link está com aparência de pendente, **Quando** a nota de destino é
   criada (pelo app ou por outra ferramenta), **Então** o link passa a aparecer como válido sem o
   usuário precisar reabrir a nota.

---

### User Story 2 - Criar nota a partir de link pendente (Priority: P1)

O dev escreve `[[ideia nova]]` enquanto pensa, sem sair do texto. Mais tarde, ao seguir o link, a
nota `ideia nova` é criada e aberta para ele escrever.

**Why this priority**: é a forma mais natural de criar notas conectadas; decisão de produto
explícita (DEC-PROD-011).

**Independent Test**: escrever um link para um nome que não existe, seguir o link e conferir que o
arquivo foi criado no disco e aberto no editor.

**Acceptance Scenarios** (RN-LINK-001, 002; ciclo de vida §7):

1. **CA-LINK-001-01 — Link pendente cria nota**: **Dado** que `[[ideia nova]]` aparece com
   aparência de link pendente, **Quando** o usuário clica nele, **Então** a nota `ideia nova` é
   criada e aberta.
2. **[novo] CA-LINK-001-02 — Link pendente com pasta**: **Dado** que `infra` contém
   `[[runbooks/rollback]]` e a pasta `runbooks/` não existe, **Quando** o usuário segue o link,
   **Então** a pasta `runbooks/` e a nota `rollback` dentro dela são criadas, e a nota é aberta.
3. **[novo] CA-LINK-001-03 — Nome inválido**: **Dado** que `infra` contém `[[a:b]]`, **Quando** o
   usuário segue o link, **Então** nenhuma nota é criada **E** o app avisa que o nome é inválido e
   por quê.
4. **[novo] CA-LINK-001-04 — Link pendente sem pasta**: **Dado** que `backend/infra` contém
   `[[ideia nova]]`, **Quando** o usuário segue o link, **Então** a nota nasce em
   `backend/ideia nova`, na mesma pasta da nota que contém o link, e é aberta.

---

### User Story 3 - Autocompletar links ao escrever (Priority: P2)

Ao digitar `[[`, o dev vê a lista de notas do vault e escolhe uma sem precisar lembrar o nome
exato ou a pasta. O link inserido já sai no formato certo: só o nome quando ele é único, e
`pasta/nome` quando há notas com o mesmo nome em pastas diferentes.

**Why this priority**: reduz erro de digitação e links ambíguos, mas o usuário já consegue
escrever links à mão sem ele.

**Independent Test**: num vault com `backend/api`, `frontend/api` e `deploy`, digitar `[[ap`,
escolher `backend/api` e conferir o texto inserido.

**Acceptance Scenarios** (RN-LINK-003, 004, 005):

1. **[novo] CA-LINK-005-01 — Autocomplete com nome único**: **Dado** que `deploy` é a única nota
   com esse nome, **Quando** o usuário digita `[[depl` e escolhe `deploy` na lista, **Então** o
   texto fica `[[deploy]]`.
2. **[novo] CA-LINK-005-02 — Autocomplete com nome repetido**: **Dado** que existem `backend/api` e
   `frontend/api`, **Quando** o usuário digita `[[api` e escolhe a nota de `backend/`, **Então** o
   texto fica `[[backend/api]]`.
3. **[novo] CA-LINK-005-03 — Sugestão mostra a pasta**: **Dado** que existem `backend/api` e
   `frontend/api`, **Quando** o usuário digita `[[api`, **Então** as duas aparecem na lista, cada
   uma com a sua pasta visível.
4. **[novo] CA-LINK-005-04 — Ordem das sugestões**: **Dado** que existem `api` (editada ontem),
   `api-gateway` (editada hoje), `rapid-api` e `backend/servicos/leia-me`, **Quando** o usuário
   digita `[[api`, **Então** a lista mostra `api-gateway`, `api`, `rapid-api` nessa ordem, e
   `backend/servicos/leia-me` não aparece.
5. **[novo] CA-LINK-005-05 — Link para nota que não existe**: **Dado** que nenhuma nota se chama
   `ideia nova`, **Quando** o usuário digita `[[ideia nova]]` sem escolher sugestão, **Então** o
   texto fica como foi digitado e o link aparece como pendente.
6. **[novo]** **Dado** que a lista de sugestões está aberta, **Quando** o usuário usa só o teclado
   (setas, Enter, Esc), **Então** consegue escolher uma sugestão ou fechar a lista sem inserir
   nada.

---

### User Story 4 - Incorporar uma nota em outra (Priority: P2)

O dev escreve `![[checklist-deploy]]` num runbook e o conteúdo da checklist aparece ali, sempre
atualizado. Quando a checklist muda, todos os runbooks que a incorporam mostram a versão nova.

**Why this priority**: evita copiar e colar conteúdo que envelhece; está no MVP (DEC-PROD-006),
mas o vault já é útil sem ela.

**Independent Test**: incorporar uma nota em outra, alterar a original e conferir que a
incorporação mostra a alteração.

**Acceptance Scenarios** (RN-EMBED-001, 002, 003):

1. **[novo] CA-EMBED-001-01 — Incorporação mostra o conteúdo**: **Dado** que `runbook` contém
   `![[checklist]]` e `checklist` existe, **Quando** `runbook` é aberta, **Então** o conteúdo de
   `checklist` aparece num bloco logo abaixo da linha `![[checklist]]`, que continua visível.
2. **[novo] CA-EMBED-001-02 — Incorporação acompanha a original**: **Dado** que `runbook` está
   aberta e incorpora `checklist`, **Quando** `checklist` é alterada (pelo app ou por outra
   ferramenta), **Então** a incorporação passa a mostrar o conteúdo novo sem reabrir `runbook`.
3. **[novo] CA-EMBED-001-03 — Incorporar uma seção**: **Dado** que `runbook` contém
   `![[checklist#Antes do deploy]]`, **Quando** `runbook` é aberta, **Então** só a seção "Antes do
   deploy" de `checklist` aparece.
4. **[novo] CA-EMBED-002-01 — Nota não encontrada**: **Dado** que `runbook` contém
   `![[checklist]]`, **Quando** `checklist` é excluída ou não existe, **Então** a incorporação
   mostra "nota não encontrada" **E** o texto `![[checklist]]` permanece em `runbook`.
5. **CA-EMBED-003-01 — Incorporação circular**: **Dado** que A incorpora B e B incorpora A,
   **Quando** o usuário abre A, **Então** a incorporação circular é interrompida com aviso e o app
   continua funcionando.
6. **[novo]** **Dado** que `runbook` incorpora `checklist`, **Quando** o usuário edita `runbook`,
   **Então** o arquivo `checklist` não é alterado e o arquivo `runbook` continua contendo só o texto
   `![[checklist]]`, sem cópia do conteúdo.

---

### User Story 5 - Conviver com nomes repetidos (Priority: P3)

O dev tem `util` em `backend/` e em `frontend/`. Links escritos à mão ou vindos de outra ferramenta
que usam só `[[util]]` não sabem para qual das duas apontam; o app deixa isso claro e pede a
escolha em vez de adivinhar.

**Why this priority**: nomes repetidos são permitidos (RN-LINK-003) e o autocomplete e o renomear
já evitam links ambíguos; resta o caso de links escritos fora dessas proteções.

**Independent Test**: num vault com duas notas `util`, escrever `[[util]]`, seguir o link e
conferir que o app pede a escolha.

**Acceptance Scenarios** (RN-LINK-003, 004, 006):

1. **[novo] CA-LINK-003-01 — Link ambíguo**: **Dado** que existem `backend/util` e `frontend/util`
   e `infra` contém `[[util]]`, **Quando** `infra` é aberta, **Então** `[[util]]` aparece com
   aparência de link ambíguo, diferente de válido e de pendente.
2. **[novo] CA-LINK-003-02 — Seguir link ambíguo**: **Dado** o cenário anterior, **Quando** o
   usuário segue `[[util]]`, **Então** o app mostra as duas notas para ele escolher qual abrir e
   nenhuma nota é aberta nem criada sem a escolha.
3. **CA-LINK-006-01 — Renomear gera nome repetido** (já entregue pela spec 001, continua valendo):
   **Dado** que existe `backend/api` e notas com `[[api]]`, **Quando** `frontend/util` é renomeada
   para `api`, **Então** os links antigos passam a `[[backend/api]]` e continuam apontando para a
   mesma nota.

---

### Edge Cases

- **Link dentro de código**: `[[deploy]]` dentro de bloco de código ou de código inline não é
  link: não é destacado, não é seguido e não entra nas sugestões nem na reescrita (mesma regra da
  spec 001).
- **Link com apelido**: `[[deploy|como publicar]]` é exibido e seguido como link para `deploy`; o
  apelido é preservado em qualquer reescrita.
- **Link para seção que não existe**: `[[deploy#Seção inexistente]]` abre `deploy` no início, sem
  erro.
- **Link com `.md` escrito**: `[[deploy.md]]` aponta para `deploy`, como na spec 001.
- **Link para arquivo que não é nota**: `[[mapa.canvas]]` aponta para o canvas existente e nunca
  cria uma nota chamada `mapa.canvas`; seguir o link avisa que abrir canvas ainda não está
  disponível (até a spec de canvas).
- **Maiúsculas e acentos**: `[[Deploy]]` aponta para `deploy` (maiúsculas não contam, como na spec
  001). O autocomplete encontra `configuração` ao digitar `configuracao`.
- **Nome vazio**: `[[]]` e `[[#Seção]]` não são tratados como link nesta spec: não recebem
  destaque, não são seguidos nem incorporados. Link para seção da própria nota (`[[#Seção]]`, como
  no Obsidian) fica para a spec do editor.
- **Criar a partir de link pendente com nome que já existe só com outra grafia**: `[[Ideia Nova]]`
  com a nota `ideia nova` existente é um link válido, não pendente; seguir abre a nota existente.
- **Nota aberta com edição pendente e link seguido**: a edição é gravada antes de abrir a nota de
  destino (mesma regra de troca de nota da spec 001).
- **Link pendente dentro de um bloco incorporado**: seguir cria a nota na pasta da nota
  incorporada, que é onde o link está escrito (FR-007).
- **Incorporação de nota vazia**: mostra um aviso discreto de que a nota está vazia, não um espaço
  em branco sem explicação.
- **Incorporação de arquivo que não é nota** (`![[mapa.canvas]]`, `![[logo.png]]`): mostra que o
  tipo ainda não é suportado para incorporação; o texto não é alterado.
- **Incorporações encadeadas sem ciclo**: A incorpora B, que incorpora C; as três aparecem, até o
  limite de profundidade (Assumptions).
- **Incorporação da própria nota** (`![[runbook]]` dentro de `runbook`): tratada como circular
  (RN-EMBED-003).
- **Muitas incorporações na mesma nota**: a nota continua abrindo e rolando sem travar.
- **Link ou incorporação para nota renomeada ou movida pelo app**: o texto é atualizado pela regra
  da spec 001 (FR-011 a FR-018 de lá), inclusive em `![[...]]`.
- **Nota de destino excluída e restaurada pela lixeira do sistema**: o link volta a aparecer como
  válido e a incorporação volta a mostrar o conteúdo (ciclo de vida §7).
- **Nota excluída com o app fechado**: o app não tem como saber que ela existiu; o link aparece
  como pendente.
- **Nota renomeada ou movida por outra ferramenta**: conta como exclusão da original e criação da
  nova (spec 001); o link para o nome antigo passa a quebrado.
- **Registro de notas excluídas apagado ou corrompido**: o app continua funcionando; os links para
  notas excluídas passam a aparecer como pendentes.

## Requirements *(mandatory)*

### Functional Requirements

**Reconhecer e exibir links (RN-LINK-002, 003, 004)**

- **FR-001**: O app MUST reconhecer como link interno o texto `[[nome]]` ou `[[pasta/nome]]`,
  inclusive com trecho (`#Seção`), apelido (`|texto`) e incorporação (`!`), fora de blocos e de
  trechos de código.
- **FR-002**: O app MUST exibir cada link com aparência que indique o seu estado: **válido** (a
  nota existe), **pendente** (não existe nota com esse nome), **quebrado** (a nota foi excluída) e
  **ambíguo** (o nome é repetido e o link não diz a pasta). A diferença entre os estados MUST NOT
  depender só de cor.
- **FR-003**: O app MUST lembrar as notas excluídas, pelo app ou por outra ferramenta enquanto o
  app está aberto, para exibir como quebrado (e não como pendente) o link para elas, inclusive
  depois de fechar e reabrir o app. Esse registro fica nos dados do app dentro do vault; uma nota
  sai dele quando volta a existir uma nota com aquele caminho.
- **FR-004**: O estado exibido de cada link MUST se atualizar quando notas são criadas, excluídas,
  renomeadas ou movidas, pelo app ou por outra ferramenta, sem o usuário reabrir a nota.

**Seguir links (RN-LINK-001, 003, 004)**

- **FR-005**: O usuário MUST poder seguir um link com `Ctrl`+clique (`Cmd`+clique no macOS) e,
  só pelo teclado, com um atalho sobre o link onde está o cursor. O clique simples MUST apenas
  posicionar o cursor, para o texto do link continuar editável.
- **FR-006**: Seguir um link válido MUST abrir a nota de destino; se o link tiver seção e ela
  existir, a nota MUST abrir posicionada nela.
- **FR-007**: Seguir um link pendente MUST criar a nota com o nome do link e abri-la (RN-LINK-001).
  Se o link incluir pasta, a nota nasce nela, criando as pastas que faltarem; se não incluir, a
  nota nasce na mesma pasta da nota que contém o link.
- **FR-008**: Seguir um link quebrado MUST avisar que a nota foi excluída e pode ser restaurada
  pela lixeira do sistema, e MUST oferecer recriá-la vazia no caminho original; nada é criado sem a
  escolha do usuário.
- **FR-009**: Nome de link pendente que viola as regras de nome da spec 001 (FR-005 de lá) MUST
  NOT criar nota; o app MUST avisar o motivo.
- **FR-010**: Seguir um link ambíguo MUST pedir ao usuário que escolha entre as notas candidatas;
  o app MUST NOT abrir nem criar nota sem a escolha.
- **FR-011**: Seguir um link para arquivo que não é nota MUST NOT criar nota; o app MUST informar
  o que acontece com aquele tipo de arquivo.
- **FR-012**: Antes de abrir a nota de destino, a edição pendente da nota atual MUST ser gravada.

**Autocomplete (RN-LINK-004, 005)**

- **FR-013**: Ao digitar `[[` ou `![[`, o app MUST sugerir as notas do vault que correspondem ao
  que foi digitado, pelo nome e pela pasta, sem diferenciar maiúsculas nem acentos, nesta ordem:
  nome que começa com o texto; nome que contém o texto; só a pasta contém o texto. Dentro de cada
  grupo, a nota editada mais recentemente vem antes.
- **FR-014**: Cada sugestão MUST mostrar o nome e a pasta da nota.
- **FR-015**: Ao escolher uma sugestão, o app MUST inserir só o nome quando ele for único no vault
  e `pasta/nome` quando for repetido (RN-LINK-004, RN-LINK-005). Um link inserido pelo autocomplete
  MUST NOT ficar ambíguo.
- **FR-016**: O usuário MUST poder ignorar as sugestões e terminar de escrever um link para um nome
  que não existe.
- **FR-017**: A lista de sugestões MUST ser operável só pelo teclado (navegar, escolher e fechar).

**Incorporação (RN-EMBED-001, 002, 003)**

- **FR-018**: `![[nota]]` MUST exibir o conteúdo da nota incorporada num bloco somente leitura
  logo abaixo da linha da incorporação, com o nome da nota e uma ação para abrir a original. A
  linha `![[nota]]` MUST continuar visível e editável. Links dentro do bloco MUST exibir o estado
  e seguir com `Ctrl`+clique como no texto normal; o restante do bloco não é editável.
- **FR-019**: A incorporação MUST refletir as alterações da nota original, feitas pelo app ou por
  outra ferramenta, sem o usuário reabrir a nota que incorpora (RN-EMBED-001).
- **FR-020**: `![[nota#Seção]]` MUST exibir só a seção indicada; se a seção não existir, a
  incorporação MUST avisar isso.
- **FR-021**: Incorporação de nota excluída ou inexistente MUST ser exibida como "nota não
  encontrada" (RN-EMBED-002) e MUST voltar a mostrar o conteúdo se a nota passar a existir.
- **FR-022**: Incorporação circular, direta ou indireta, MUST ser interrompida com aviso no ponto
  em que o ciclo se repete, sem travar o app (RN-EMBED-003).
- **FR-023**: Incorporação de arquivo que não é nota MUST ser exibida como tipo não suportado nesta
  versão.

**Integridade dos arquivos**

- **FR-024**: Exibir links e incorporações MUST NOT alterar nenhum arquivo: a nota que incorpora
  continua contendo só o texto `![[...]]`, e abrir ou rolar notas nunca grava nada.
- **FR-025**: As regras de reescrita da spec 001 (renomear e mover, inclusive RN-LINK-006) MUST
  continuar valendo para links e incorporações, preservando trecho, apelido e `!`.
- **FR-026**: Todas as funções desta spec MUST funcionar sem internet.

### Key Entities *(include if feature involves data)*

- **Link interno**: referência `[[...]]` de uma nota para outra, com destino, trecho e apelido
  opcionais. Tem um estado derivado: válido, pendente, quebrado ou ambíguo.
- **Link pendente**: link para um nome que ainda não existe no vault; seguir cria a nota.
- **Link quebrado**: link para uma nota que existia e foi excluída; o texto permanece.
- **Registro de notas excluídas**: lista dos caminhos de notas excluídas, guardada nos dados do app
  dentro do vault, que diferencia link quebrado de link pendente.
- **Link ambíguo**: link só com o nome quando há mais de uma nota com esse nome.
- **Incorporação**: referência `![[...]]` que exibe, sem copiar, o conteúdo de outra nota (ou de uma
  seção dela).
- **Sugestão de link**: nota oferecida pelo autocomplete, com nome, pasta e o texto que será
  inserido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: As sugestões do autocomplete aparecem em até 0,3 s depois de cada tecla, num vault de
  5.000 notas.
- **SC-002**: 100% dos links inseridos pelo autocomplete apontam para a nota escolhida e nenhum
  fica ambíguo.
- **SC-003**: Seguir um link pendente cria e abre a nota em até 1 s.
- **SC-004**: Uma alteração na nota original aparece em todas as incorporações visíveis em até 2 s.
- **SC-005**: Nenhum cenário de incorporação (circular, encadeada, de nota inexistente ou de nota
  grande) deixa o app sem resposta; a nota que incorpora abre em até 1 s num vault de 5.000 notas.
- **SC-006**: O estado exibido de um link muda em até 2 s depois de a nota de destino ser criada,
  excluída, renomeada ou movida.
- **SC-007**: Abrir, rolar e fechar notas com links e incorporações não altera nenhum arquivo do
  vault.

## Assumptions

- **Editor**: o editor da spec 001 continua mostrando o texto Markdown; links recebem destaque
  visual no próprio texto. Modo de leitura separado fica para a spec do editor.
- **Atalho de teclado para seguir link**: a tecla exata fica no plano, com `Kbd` visível onde o
  comando aparecer (LAY-06).
- **Seções**: seção é um título Markdown (`#`, `##`…). Referência a bloco (`#^id`) abre ou
  incorpora a nota inteira nesta spec.
- **Profundidade das incorporações**: incorporações encadeadas sem ciclo são exibidas até 5 níveis;
  a partir daí, o nível mais fundo mostra só o link.
- **Autocomplete**: sugere notas; sugerir seções depois de `#` e o apelido depois de `|` fica fora
  desta spec. As sugestões mostram no máximo 50 itens por vez, na ordem da FR-013. "Editada mais
  recentemente" é a data de modificação do arquivo.
- **Nota criada por link pendente**: nasce vazia; criar a partir de template fica na spec de
  templates.
- **Registro de notas excluídas**: é o primeiro dado que o app grava em `.devnotes/` (constituição,
  princípio II). Ele não é índice nem cópia de conteúdo: guarda só caminhos, e pode ser apagado sem
  perda de nota.
- **Nomes repetidos (RN-LINK-003)**: já permitidos pela spec 001; esta spec cuida de exibir e
  seguir links ambíguos, sem reescrevê-los sozinha.
- **Dependências**: backlinks e menções sem link (RN-BACK-*) ficam na spec de backlinks;
  incorporação em canvas e cartões (RN-CANVAS-*) fica na spec de canvas; abas e voltar/avançar na
  navegação ficam na spec de abas e paleta (RN-UI-*). Seguir um link abre a nota no lugar da nota
  atual.
- **Fora do escopo**: links para URLs web, links para issues/PRs (evolução futura), grafo de notas.
