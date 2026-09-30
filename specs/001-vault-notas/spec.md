# Feature Specification: Vault e Notas

**Feature Branch**: `001-vault-notas`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "docs/regras-de-negocio.md — Uma spec por feature, com os RN-* e os CA-* como
cenários de aceite". Esta é a spec 001, cobrindo o grupo RN-NOTA-001..012 (feature `vault`).

**Fontes**: `docs/regras-de-negocio.md` v1.1 (§6.1, §7, §8 FL-NOTA-001..003, §9) ·
`.specify/memory/constitution.md` v1.0.1

## User Scenarios & Testing *(mandatory)*

Convenção: cenários com ID `CA-*` vêm literalmente de `regras-de-negocio.md` §9. Cenários marcados
**[novo]** cobrem regras que ainda não tinham critério de aceite; devem ser incorporados ao
documento de regras.

### User Story 1 - Abrir o vault e trabalhar com notas (Priority: P1)

O dev escolhe uma pasta do computador como vault, vê suas pastas e notas numa árvore, cria notas e
pastas, abre uma nota e edita o texto. O conteúdo é gravado no arquivo `.md` sem que ele precise
se preocupar em salvar.

**Why this priority**: sem abrir o vault e editar notas não existe produto; todas as outras specs
dependem desta.

**Independent Test**: abrir uma pasta com algumas notas, criar uma nota nova, escrever nela, fechar
o app e conferir no disco (com outro editor) que o arquivo `.md` tem o texto escrito.

**Acceptance Scenarios**:

1. **[novo]** **Dado** que o app é aberto pela primeira vez, **Quando** o usuário escolhe uma pasta,
   **Então** a pasta passa a ser o vault e suas pastas, notas e canvas aparecem na árvore.
2. **[novo]** **Dado** que um vault já foi aberto antes, **Quando** o usuário reabre o app,
   **Então** o mesmo vault é aberto automaticamente.
3. **[novo]** **Dado** um vault aberto, **Quando** o usuário cria uma nota em uma pasta,
   **Então** um arquivo `.md` é criado nessa pasta e aberto para edição.
4. **[novo]** **Dado** uma nota aberta, **Quando** o usuário edita o texto e para de digitar,
   **Então** o conteúdo é gravado no arquivo e o indicador de edição pendente some.
5. **[novo]** **Dado** um vault aberto, **Quando** o usuário cria uma pasta, **Então** a pasta é
   criada no disco e aparece na árvore.

---

### User Story 2 - Renomear nota sem quebrar links (Priority: P2)

O dev renomeia uma nota e todos os links e cartões de canvas que apontavam para ela continuam
apontando para a mesma nota, sem trabalho manual.

**Why this priority**: renomear é frequente e, sem atualização automática, a rede de links do vault
se degrada. É a principal garantia de integridade do produto.

**Independent Test**: num vault com notas que se referenciam, renomear uma nota e verificar que
nenhum link ficou apontando para o nome antigo.

**Acceptance Scenarios** (RN-NOTA-004, 005, 006; RN-LINK-006; fluxo FL-NOTA-001):

1. **CA-NOTA-004-01 — Renomear atualiza links**: **Dado** que `infra` contém `[[deploy]]` e um canvas
   tem cartão de `deploy`, **Quando** `deploy` é renomeada para `release`, **Então** `infra` passa a
   conter `[[release]]` **E** o cartão do canvas aponta para `release`.
2. **CA-NOTA-006-01 — Nome repetido na mesma pasta**: **Dado** que a pasta `backend/` contém `api` e
   `util`, **Quando** o usuário renomeia `util` para `api`, **Então** a renomeação é bloqueada com
   aviso.
3. **CA-LINK-006-01 — Renomear gera nome repetido**: **Dado** que existe `backend/api` e notas com
   `[[api]]`, **Quando** `frontend/util` é renomeada para `api`, **Então** os links antigos passam a
   `[[backend/api]]` e continuam apontando para a mesma nota.

---

### User Story 3 - Excluir nota ou pasta com segurança (Priority: P2)

O dev exclui notas ou pastas inteiras sabendo que sempre haverá confirmação e que tudo pode ser
recuperado pela lixeira do sistema operacional.

**Why this priority**: exclusão sem proteção causa perda de dados, o que viola a promessa central do
produto (os arquivos são do usuário).

**Independent Test**: excluir uma nota e uma pasta, confirmar que ambas estão na lixeira do sistema
e que os links para elas continuam no texto das outras notas.

**Acceptance Scenarios** (RN-NOTA-001, 002, 003, 009; fluxo FL-NOTA-002):

1. **CA-NOTA-001-01 — Exclusão com confirmação**: **Dado** que existe a nota `deploy`, **Quando** o
   usuário pede para excluí-la e confirma, **Então** a nota vai para a lixeira do sistema **E**
   deixa de aparecer no vault.
2. **CA-NOTA-001-02 — Exclusão cancelada**: **Dado** que existe a nota `deploy`, **Quando** o usuário
   pede para excluí-la e não confirma, **Então** nada é alterado.
3. **CA-NOTA-003-01 — Link quebrado**: **Dado** que a nota `infra` contém `[[deploy]]`, **Quando**
   `deploy` é excluída, **Então** o texto `[[deploy]]` permanece em `infra`, exibido como link
   quebrado. *(Nesta spec, verifica-se o texto intacto e o link sem destino; a aparência visual
   chega com a spec 002, ver FR-009.)*
4. **[novo] CA-NOTA-009-01 — Excluir pasta**: **Dado** que a pasta `rascunhos/` contém 3 notas,
   **Quando** o usuário pede para excluí-la, **Então** a confirmação informa que 3 notas serão
   excluídas **E**, ao confirmar, a pasta inteira vai para a lixeira do sistema.
5. **[novo] CA-NOTA-009-02 — Excluir pasta cancelado**: **Dado** que a pasta `rascunhos/` contém 3
   notas, **Quando** o usuário pede para excluí-la e não confirma, **Então** nada é alterado.
6. **[novo] CA-NOTA-001-03 — Lixeira indisponível**: **Dado** que a lixeira do sistema não está
   disponível, **Quando** o usuário pede para excluir a nota `deploy`, **Então** a exclusão é
   bloqueada **E** o app avisa que a lixeira não está disponível e que a nota pode ser excluída
   pelo gerenciador de arquivos **E** a nota continua no vault.

---

### User Story 4 - Conviver com outras ferramentas editando o vault (Priority: P2)

O dev altera arquivos do vault com outro editor (ou ferramenta de linha de comando) enquanto o app
está aberto. O app mostra o conteúdo novo sem perder nada que o dev estava escrevendo.

**Why this priority**: os arquivos são a fonte da verdade e podem ser lidos e editados fora do app;
sem este comportamento haveria perda silenciosa de conteúdo.

**Independent Test**: com uma nota aberta no app, alterar o arquivo em outro editor e verificar o
comportamento com e sem edição pendente.

**Acceptance Scenarios** (RN-NOTA-007, 008; fluxo FL-NOTA-003):

1. **CA-NOTA-007-01 — Alteração externa sem edição pendente**: **Dado** que a nota `deploy` está
   aberta no app sem alterações pendentes, **Quando** outra ferramenta altera o arquivo, **Então** o
   app exibe o novo conteúdo automaticamente.
2. **CA-NOTA-008-01 — Alteração externa com edição pendente**: **Dado** que a nota `deploy` tem
   alterações não salvas no app, **Quando** outra ferramenta altera o arquivo, **Então** o app avisa
   o usuário **E** o usuário escolhe manter a versão do app ou a versão externa.
3. **[novo]** **Dado** que o usuário escolheu manter a versão do app, **Quando** a escolha é
   confirmada, **Então** o arquivo passa a ter o conteúdo do app; **E** se escolheu a versão
   externa, o conteúdo pendente é descartado e o app exibe o conteúdo do arquivo.
4. **[novo]** **Dado** uma nota aberta, **Quando** o próprio app grava o arquivo, **Então** nenhum
   aviso de alteração externa é exibido.

---

### User Story 5 - Mover nota entre pastas (Priority: P3)

O dev reorganiza o vault movendo notas entre pastas, com o mesmo cuidado com links que existe ao
renomear.

**Why this priority**: reorganizar é menos frequente que renomear, e reaproveita a mesma lógica de
integridade da User Story 2.

**Independent Test**: mover uma nota referenciada para outra pasta e verificar que os links e
cartões continuam apontando para ela.

**Acceptance Scenarios** (RN-NOTA-010, 011, 012):

1. **CA-NOTA-010-01 — Mover atualiza links**: **Dado** que `infra` contém `[[backend/api]]`,
   **Quando** `backend/api` é movida para `servicos/`, **Então** o link em `infra` passa a apontar
   para a nota em `servicos/`.
2. **CA-NOTA-011-01 — Mover para pasta com mesmo nome**: **Dado** que `servicos/` já contém `api`,
   **Quando** o usuário move `backend/api` para `servicos/`, **Então** a operação é bloqueada com
   aviso.
3. **[novo] CA-NOTA-010-02 — Mover atualiza cartões do canvas**: **Dado** que um canvas tem cartão
   da nota `backend/api`, **Quando** a nota é movida para `servicos/`, **Então** o cartão aponta
   para `servicos/api`.
4. **[novo] CA-NOTA-010-03 — Mover nota de nome único**: **Dado** que `deploy` é a única nota com
   esse nome e `infra` contém `[[deploy]]`, **Quando** `deploy` é movida para `runbooks/`,
   **Então** `infra` continua contendo `[[deploy]]` e o link aponta para `runbooks/deploy`.

**Nota sobre RN-NOTA-012**: mover não altera o nome da nota, então mover sozinho não consegue
tornar um nome repetido no vault. A regra só se aplica quando mover e renomear acontecem na mesma
operação, caso coberto por FR-014. Sem requisito nem cenário próprio até o documento de regras ser
revisto.

---

### Edge Cases

- **Nome inválido**: renomear ou criar com nome vazio, com caracteres proibidos pelo sistema
  operacional ou iniciado por ponto é bloqueado com aviso, sem alterar nada. Nomes iniciados por
  ponto ficariam ocultos na árvore (FR-002).
- **Diferença só de maiúsculas**: `API` e `api` na mesma pasta contam como o mesmo nome (evita
  conflito em sistemas que não diferenciam maiúsculas).
- **Renomear para o mesmo nome**: nenhuma alteração é feita e nenhum aviso é exibido.
- **Falha no meio de uma atualização de links**: o app informa quais notas ou canvas não puderam
  ser atualizados, sem desfazer silenciosamente o que já foi aplicado.
- **Nota aberta excluída por outra ferramenta**: o editor avisa que a nota não existe mais; se houver
  edição pendente, o usuário pode recriar a nota com o conteúdo do app.
- **Nota aberta renomeada ou movida por outra ferramenta**: tratada como exclusão da original e
  criação de outra; links não são atualizados automaticamente (só o app atualiza links nas
  operações que ele mesmo faz).
- **Excluir pasta vazia**: confirmação informa que a pasta não contém notas.
- **Excluir pasta com arquivos que não são notas** (canvas, imagens): a pasta inteira vai para a
  lixeira; a confirmação informa a quantidade de notas e de outros arquivos (tudo o que não é
  nota, inclusive canvas).
- **Renomear ou mover pasta**: cada nota dentro dela segue as mesmas regras de renomear/mover nota
  (links atualizados, conflito bloqueado).
- **Vault apagado ou inacessível enquanto aberto**: o app avisa e oferece escolher outra pasta.
- **Links simbólicos dentro do vault**: não são seguidos; o app nunca lê nem grava fora da pasta
  do vault.
- **Canvas na árvore**: aparece na árvore, mas não abre nesta spec (o editor de canvas é de spec
  própria); o item indica que ainda não está disponível.
- **Arquivo com quebras de linha CRLF ou BOM**: continua com o mesmo formato depois de editado
  (FR-004).
- **Lixeira do sistema indisponível**: exclusão bloqueada com aviso (FR-024, CA-NOTA-001-03).

## Requirements *(mandatory)*

### Functional Requirements

**Vault e arquivos**

- **FR-001**: O usuário MUST poder escolher uma pasta local como vault; o app MUST reabrir o último
  vault usado.
- **FR-002**: O app MUST exibir em árvore as pastas, notas (`.md`) e canvas (`.canvas`) do vault,
  ocultando a pasta de dados do app e pastas ocultas.
- **FR-003**: O usuário MUST poder criar notas e pastas em qualquer pasta do vault.
- **FR-004**: O usuário MUST poder abrir uma nota e editar seu texto; o conteúdo MUST ser gravado
  no arquivo automaticamente, e o app MUST indicar quando há edição pendente (ainda não gravada).
  Ao gravar, o app MUST preservar o tipo de quebra de linha (LF ou CRLF) e a presença de BOM do
  arquivo original; só o texto editado pelo usuário muda.
- **FR-005**: Nomes vazios, com caracteres proibidos pelo sistema operacional ou iniciados por
  ponto MUST ser bloqueados com aviso. Um nome iniciado por ponto deixaria a nota ou a pasta
  oculta (FR-002).
- **FR-006**: Todas as operações desta spec MUST funcionar sem internet, e as notas MUST
  permanecer legíveis por qualquer outra ferramenta.

**Excluir (RN-NOTA-001, 002, 003, 009)**

- **FR-007**: Excluir uma nota MUST enviá-la para a lixeira do sistema operacional (RN-NOTA-001).
- **FR-008**: Antes de excluir uma nota, o app MUST pedir confirmação; cancelar não altera nada
  (RN-NOTA-002).
- **FR-009**: Links para uma nota excluída MUST permanecer inalterados no texto das outras notas e
  passar a ser tratados como link sem destino (quebrado) (RN-NOTA-003). A aparência visual de
  link quebrado no editor é entregue pela spec de links (002); nesta spec, verifica-se o texto
  intacto e o link sem destino.
- **FR-010**: Excluir uma pasta MUST pedir confirmação informando a quantidade de notas e de
  outros arquivos (tudo o que não é nota, inclusive canvas) e, se confirmado, enviar a pasta
  inteira para a lixeira (RN-NOTA-009).

**Renomear (RN-NOTA-004, 005, 006; RN-LINK-006)**

- **FR-011**: Renomear uma nota MUST atualizar todos os links que apontam para ela (RN-NOTA-004).
- **FR-012**: Renomear uma nota MUST atualizar os cartões de canvas que a referenciam
  (RN-NOTA-005).
- **FR-013**: Renomear para um nome que já existe na mesma pasta MUST ser bloqueado com aviso
  (RN-NOTA-006).
- **FR-014**: Quando a renomeação torna um nome repetido no vault, os links existentes que usavam
  só o nome MUST passar a incluir a pasta, preservando o destino original (RN-LINK-006).

**Mover (RN-NOTA-010, 011, 012)**

- **FR-015**: Mover uma nota MUST atualizar todos os links e cartões de canvas que apontam para ela
  (RN-NOTA-010).
- **FR-016**: Mover para uma pasta que já contém nota com o mesmo nome MUST ser bloqueado com aviso
  (RN-NOTA-011).
- **FR-017**: *Removida* — duplicava a FR-014 e não havia operação que chegasse nela (ver a nota
  sobre RN-NOTA-012 na User Story 5). ID mantido para não renumerar.
- **FR-018**: Renomear ou mover uma pasta MUST aplicar FR-011 a FR-016 a cada nota contida nela.

**Integridade das operações em lote**

- **FR-019**: Antes de gravar qualquer arquivo numa renomeação ou movimentação, o app MUST
  determinar o conjunto completo de alterações; se houver conflito, nada é gravado.
- **FR-020**: Se alguma gravação falhar durante a aplicação, o app MUST informar ao usuário quais
  notas e canvas ficaram sem atualização.

**Alteração externa (RN-NOTA-007, 008)**

- **FR-021**: Se uma nota aberta for alterada por outra ferramenta e não houver edição pendente, o
  app MUST exibir o novo conteúdo automaticamente (RN-NOTA-007).
- **FR-022**: Se houver edição pendente, o app MUST avisar e deixar o usuário escolher entre a
  versão do app e a versão externa; nenhuma das duas é descartada antes da escolha (RN-NOTA-008).
- **FR-023**: Gravações feitas pelo próprio app MUST NOT ser tratadas como alteração externa.

**Lixeira indisponível**

- **FR-024**: Quando a lixeira do sistema não estiver disponível, o app MUST bloquear a exclusão,
  sem alterar nenhum arquivo, e avisar o usuário que a lixeira não está disponível e que ele pode
  excluir pelo gerenciador de arquivos do sistema.

### Key Entities *(include if feature involves data)*

- **Vault**: pasta local escolhida pelo usuário; contém pastas, notas, canvas e a pasta de dados do
  app. Um vault aberto por vez.
- **Pasta**: agrupamento dentro do vault; o nome de uma nota é único dentro da mesma pasta.
- **Nota**: arquivo `.md` identificado por pasta + nome; pode ter o mesmo nome que notas de outras
  pastas.
- **Link interno**: referência `[[nome]]` ou `[[pasta/nome]]` de uma nota para outra; inclui a pasta
  só quando o nome é repetido no vault (detalhado na spec de links).
- **Cartão de canvas**: elemento de um canvas que referencia uma nota (detalhado na spec de canvas).
- **Edição pendente**: alteração feita no app que ainda não foi gravada no arquivo.
- **Lixeira do sistema**: destino das notas e pastas excluídas, gerenciado pelo sistema
  operacional.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Após renomear ou mover uma nota, 0 links e 0 cartões de canvas do vault apontam para
  o nome ou local antigo.
- **SC-002**: Renomear uma nota referenciada por 200 outras notas, num vault de 5.000 notas,
  termina em menos de 5 segundos.
- **SC-003**: 100% das notas e pastas excluídas pelo app podem ser recuperadas pela lixeira do
  sistema; nenhuma exclusão acontece sem confirmação.
- **SC-004**: Uma alteração externa numa nota aberta sem edição pendente aparece no app em até 2
  segundos.
- **SC-005**: Em nenhum cenário de alteração externa o texto que o usuário estava escrevendo é
  perdido sem uma escolha explícita dele.
- **SC-006**: Um vault de 5.000 notas abre e mostra a árvore em até 3 segundos.
- **SC-007**: Todas as notas criadas ou editadas pelo app abrem corretamente em outro editor de
  texto, sem conteúdo extra adicionado pelo app.

## Assumptions

- **Gravação automática**: o conteúdo é gravado logo após o usuário parar de digitar (cerca de 1
  segundo) e ao trocar de nota ou fechar o app; "edição pendente" é o intervalo até essa gravação.
- **Editor básico**: esta spec cobre só abrir, editar e gravar texto. Destaque de código,
  autocomplete de links e demais recursos do editor ficam em specs próprias.
- **Medição de desempenho**: as metas SC-002, SC-004 e SC-006 são medidas num computador de
  desenvolvimento comum (SSD e pelo menos 8 GB de memória), registrado junto com os números. A
  SC-006 conta do início do `open` do vault até a árvore aparecer, sem incluir o índice de links,
  que é montado depois. A SC-002 conta da confirmação do novo nome até o aviso de conclusão, com
  o índice já pronto. A SC-004 conta da gravação feita pela outra ferramenta até o conteúdo novo
  aparecer no editor.
- **Nome padrão**: nota nova recebe um nome padrão ("Sem título", com número se já existir) e pode
  ser renomeada em seguida.
- **Comparação de nomes**: maiúsculas e minúsculas são tratadas como iguais para detectar conflito.
- **Pastas especiais**: `diario/`, `templates/` e `snippets/` são pastas comuns para esta spec;
  seu comportamento especial fica nas specs de notas diárias, templates e snippets.
- **Dependências entre specs**: a sintaxe completa dos links, o autocomplete e a aparência de link
  quebrado são definidos na spec de links (002); esta spec usa só o necessário para reescrever
  links (inclusive a regra de incluir a pasta, RN-LINK-004). FR-012 e o cartão de CA-NOTA-004-01
  já são verificáveis no arquivo `.canvas`; só a exibição do canvas depende da spec de canvas. Os
  efeitos da exclusão em incorporações (RN-EMBED-002) e cartões (RN-CANVAS-002) ficam nas
  respectivas specs.
- **Acesso por teclado**: executar estas operações pela paleta de comandos (RN-UI-003, RN-UI-004)
  fica na spec de abas e paleta.
- **Histórico**: guardar versões ao editar (RN-HIST-*) fica na spec de histórico.
- **Fora do escopo**: múltiplos vaults abertos ao mesmo tempo, Git, sync e restauração pela
  lixeira dentro do app (a restauração é feita pela lixeira do sistema).
