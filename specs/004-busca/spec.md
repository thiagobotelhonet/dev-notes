# Feature Specification: Busca

**Feature Branch**: `main` (trabalho direto na main)

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "docs/regras-de-negocio.md — spec 004, feature `search`: cobre o grupo
RN-BUSCA-001..006 (DEC-PROD-015), com CA-BUSCA-002-01, CA-BUSCA-003-01 e CA-BUSCA-004-01 como
cenários de aceite. Duas buscas (RN-BUSCA-005): a rápida por nome, para abrir nota, em diálogo com
teclado (`app-command`, LAY-*), e a completa, por nome, conteúdo (inclusive blocos de código), tags e
propriedades, com filtros combinados no mesmo termo (`deploy tag:#backend linguagem:csharp
pasta:snippets`), sem diferenciar maiúsculas nem acentos, nome antes de conteúdo (RN-BUSCA-004), e
sugestão dos valores existentes ao digitar um filtro (RN-BUSCA-006). Os resultados usam a lista de
notas da spec 003 (`app-note-list`, trechos com a ocorrência destacada; abrir o resultado leva ao
ponto) e o texto que o índice de links já guarda (`textOf`), sem ler o disco a cada busca. As
features de tags e propriedades ainda não existem: a busca lê do próprio texto as tags (`#tag`,
hierárquicas, com a regra RN-TAG-002 de a tag mãe incluir as filhas) e as propriedades do topo da
nota (RN-PROP-001; `linguagem` de RN-SNIPPET-001 é uma propriedade), sem editar nada. Arquitetura
prevê MiniSearch e o módulo `features/search`. Mantém-se em dia com gravação, renomear, mover,
excluir e alteração externa como o painel de backlinks. Não grava arquivo. Decidir aqui o token de
cor do destaque de ocorrência (hoje `accent` no painel de backlinks) e registrá-lo no
`docs/brand.md`. Trabalho direto na branch main (sem branch nova)."

**Fontes**: `docs/regras-de-negocio.md` (§3 Glossário, §5 DEC-PROD-015, §6.5, §6.7, §6.9, §9) ·
`docs/brand.md` (§2, contraste) · `.specify/memory/constitution.md` · `specs/002-links-incorporacao/spec.md`
(ordem das sugestões de nota) · `specs/003-backlinks/spec.md` (lista de notas, trechos, abrir no
ponto, atualização)

## Clarifications

### Session 2026-09-30

- Q: Onde a busca completa aparece? → A: Num painel da barra lateral esquerda, alternando com a árvore (como no VS Code e no Obsidian); editor e backlinks continuam visíveis.

## User Scenarios & Testing *(mandatory)*

Convenção: cenários com ID `CA-*` sem marca vêm literalmente de `regras-de-negocio.md` §9. Cenários
marcados **[novo]** cobrem regras que ainda não tinham critério de aceite e devem ser incorporados
ao documento de regras.

### User Story 1 - Abrir uma nota pelo nome (Priority: P1)

O dev sabe que a nota se chama algo como "deploy". Aperta o atalho, digita "depl", vê a nota na
lista e aperta Enter: a nota abre, sem tocar no mouse e sem procurar na árvore.

**Why this priority**: é o gesto mais frequente num vault grande; a árvore deixa de ser o único
caminho para chegar a uma nota.

**Independent Test**: num vault com `deploy`, `infra`, `backend/api` e `frontend/api`, abrir a
busca rápida pelo atalho, digitar parte de cada nome e abrir cada nota só com o teclado.

**Acceptance Scenarios** (RN-BUSCA-003, 005):

1. **[novo] CA-BUSCA-005-01 — Abrir nota pelo nome**: **Dado** que existem as notas `deploy` e
   `infra`, **Quando** o usuário abre a busca rápida, digita `depl` e confirma, **Então** `deploy`
   abre.
2. **[novo] CA-BUSCA-005-02 — Nome repetido mostra a pasta**: **Dado** que existem `backend/api` e
   `frontend/api`, **Quando** o usuário digita `api` na busca rápida, **Então** as duas aparecem,
   cada uma com a pasta, e o usuário escolhe qual abrir.
3. **[novo] CA-BUSCA-005-03 — Nome sem acento**: **Dado** que existe a nota `Configuração`,
   **Quando** o usuário digita `configuracao` na busca rápida, **Então** a nota aparece.
4. **[novo] CA-BUSCA-005-04 — Só pelo teclado**: **Dado** que a busca rápida está aberta com
   resultados, **Quando** o usuário usa as setas e Enter, **Então** a nota escolhida abre; **e**
   Esc fecha a busca sem abrir nada.
5. **[novo] CA-BUSCA-005-05 — Nenhuma nota**: **Dado** que nenhuma nota tem "xyz" no nome,
   **Quando** o usuário digita `xyz`, **Então** a busca diz que nenhuma nota tem esse nome.

---

### User Story 2 - Encontrar notas pelo conteúdo (Priority: P1)

O dev lembra que escreveu sobre "rollout" em algum lugar, talvez num bloco de código. Abre a busca
completa, digita "rollout" e vê as notas que têm a palavra, com o trecho de cada ocorrência
destacado; escolhe um trecho e a nota abre no ponto.

**Why this priority**: é a razão de existir da busca; sem ela, conteúdo escrito há meses fica
perdido.

**Independent Test**: num vault com `deploy` (nome), `infra` (cita "deploy" no texto) e uma nota com
"Configuração" e um bloco de código com `kubectl rollout`, buscar `deploy`, `configuracao` e
`rollout` e conferir quem aparece, em que ordem e com que trechos.

**Acceptance Scenarios** (RN-BUSCA-001, 003, 004):

1. **CA-BUSCA-003-01 — Busca sem acento**: **Dado** que existe uma nota contendo "Configuração",
   **Quando** o usuário busca `configuracao`, **Então** a nota aparece no resultado.
2. **CA-BUSCA-004-01 — Prioridade do nome**: **Dado** que a nota `deploy` e a nota `infra` (que
   cita "deploy" no texto) existem, **Quando** o usuário busca `deploy`, **Então** `deploy` aparece
   antes de `infra`.
3. **[novo] CA-BUSCA-001-01 — Conteúdo de bloco de código**: **Dado** que `runbook` tem um bloco de
   código com `kubectl rollout restart`, **Quando** o usuário busca `rollout`, **Então** `runbook`
   aparece, com o trecho da linha do bloco.
4. **[novo] CA-BUSCA-001-02 — Várias palavras**: **Dado** que `infra` contém "deploy" e "falhou" em
   linhas diferentes e `runbook` contém só "deploy", **Quando** o usuário busca `deploy falhou`,
   **Então** só `infra` aparece.
5. **[novo] CA-BUSCA-001-03 — Frase exata**: **Dado** que `infra` contém "o deploy falhou" e
   `runbook` contém "falhou o deploy", **Quando** o usuário busca `"deploy falhou"`, **Então** só
   `infra` aparece.
6. **[novo] CA-BUSCA-001-04 — Abrir no ponto**: **Dado** que a busca mostra um trecho de `infra`,
   **Quando** o usuário escolhe o trecho, **Então** `infra` abre com o cursor na ocorrência.
7. **[novo] CA-BUSCA-001-05 — Palavra parcial não conta**: **Dado** que uma nota contém só
   "rapidamente", **Quando** o usuário busca `api`, **Então** essa nota não aparece.
8. **[novo] CA-BUSCA-001-06 — Resultado acompanha mudanças**: **Dado** que a busca por `rollout`
   está aberta, **Quando** outra nota passa a conter "rollout" (pelo app ou por outra ferramenta),
   **Então** ela entra no resultado sem o usuário buscar de novo.

---

### User Story 3 - Filtrar por tag, pasta e propriedade (Priority: P2)

O dev quer o snippet de deploy em C# que está em `snippets/` e tem `#backend`. Digita `deploy
tag:#backend linguagem:csharp pasta:snippets` e o resultado mostra só o que atende a tudo.

**Why this priority**: refina a busca completa num vault grande e é a base da biblioteca de snippets
(RN-SNIPPET-002); a busca por texto (US2) já é útil sem filtros.

**Independent Test**: num vault com notas em `snippets/` e fora dela, com e sem `#backend` e
`#backend/api`, e com `linguagem: csharp` e `linguagem: python` no topo, combinar filtros e conferir
quem aparece.

**Acceptance Scenarios** (RN-BUSCA-001, 002; RN-TAG-001, 002):

1. **CA-BUSCA-002-01 — Busca com filtros combinados**: **Dado** que a nota `deploy-api` está em
   `snippets/`, tem `#backend` e contém "deploy", **Quando** o usuário busca `deploy tag:#backend
   pasta:snippets`, **Então** `deploy-api` aparece no resultado **e** notas fora de `snippets/` não
   aparecem.
2. **[novo] CA-BUSCA-002-02 — Tag mãe inclui as filhas**: **Dado** que a nota A tem `#backend` e a
   nota B tem `#backend/api`, **Quando** o usuário busca `tag:#backend`, **Então** A e B aparecem;
   **e** buscando `tag:#backend/api`, só B aparece (CA-TAG-002-01 e 02 na busca).
3. **[novo] CA-BUSCA-002-03 — Filtro por propriedade**: **Dado** que `hello-cs` tem `linguagem:
   csharp` e `hello-py` tem `linguagem: python` no topo, **Quando** o usuário busca
   `linguagem:csharp`, **Então** só `hello-cs` aparece.
4. **[novo] CA-BUSCA-002-04 — Só filtros, sem texto**: **Dado** que três notas têm `#backend`,
   **Quando** o usuário busca `tag:#backend`, **Então** as três aparecem.
5. **[novo] CA-BUSCA-002-05 — Tag em código não conta**: **Dado** que `infra` só tem `#backend`
   dentro de um bloco de código, **Quando** o usuário busca `tag:#backend`, **Então** `infra` não
   aparece (mas aparece buscando o texto `backend`).
6. **[novo] CA-BUSCA-002-06 — Pasta inclui subpastas**: **Dado** que existe
   `snippets/dotnet/deploy-api`, **Quando** o usuário busca `deploy pasta:snippets`, **Então** a
   nota aparece.
7. **[novo] CA-BUSCA-002-07 — Texto com dois-pontos que não é filtro**: **Dado** que nenhuma nota
   tem a propriedade `http` e `infra` contém "http://intranet", **Quando** o usuário busca
   `http://intranet`, **Então** `infra` aparece: o termo é tratado como texto.

---

### User Story 4 - Receber sugestões ao digitar um filtro (Priority: P3)

Ao digitar `tag:#ba`, a busca sugere `#backend` e `#backend/api`; ao digitar `linguagem:`, sugere
`csharp` e `python`. O dev escolhe com o teclado, sem lembrar a grafia exata.

**Why this priority**: evita filtros digitados errado e ensina o que existe no vault; os filtros
(US3) funcionam sem ela.

**Independent Test**: no vault da US3, digitar o começo de cada tipo de filtro e escolher uma
sugestão só com o teclado.

**Acceptance Scenarios** (RN-BUSCA-006):

1. **[novo] CA-BUSCA-006-01 — Sugestão de tags**: **Dado** que existem `#backend` e `#backend/api`,
   **Quando** o usuário digita `tag:#ba`, **Então** as duas tags são sugeridas.
2. **[novo] CA-BUSCA-006-02 — Sugestão de pastas**: **Dado** que existem as pastas `snippets` e
   `snippets/dotnet`, **Quando** o usuário digita `pasta:sn`, **Então** as duas são sugeridas.
3. **[novo] CA-BUSCA-006-03 — Sugestão de valores de propriedade**: **Dado** que há notas com
   `linguagem: csharp` e `linguagem: python`, **Quando** o usuário digita `linguagem:`, **Então**
   `csharp` e `python` são sugeridos.
4. **[novo] CA-BUSCA-006-04 — Escolher a sugestão**: **Dado** que `#backend` está sugerida,
   **Quando** o usuário a escolhe com o teclado, **Então** o termo vira `tag:#backend` e a busca é
   feita.

---

### Edge Cases

- **Termo vazio**: a busca completa sem texto nem filtro não mostra resultado, só uma dica dos
  filtros disponíveis; a busca rápida sem texto mostra uma dica.
- **Busca antes de o vault estar pronto**: enquanto as notas ainda estão sendo lidas, a busca mostra
  que está se preparando e responde assim que puder, sem travar a digitação.
- **Maiúsculas e acentos**: não contam em nome, conteúdo, tags, pastas nem valores de propriedade;
  o trecho mostra o texto como está escrito, com a ocorrência destacada.
- **Início de palavra**: cada palavra buscada casa com o início de uma palavra do texto ("depl"
  encontra "deploy"); "api" não encontra "rapidamente". Partes separadas por hífen, sublinhado ou
  ponto também são início de palavra, porque código e nomes técnicos usam esses separadores:
  "gateway" encontra "api-gateway" e "v2" encontra "api_v2" (diferente das menções da spec 003,
  que exigem o nome inteiro).
- **O que é tag**: `#` seguido de letras, números, `_`, `-` e `/`, com pelo menos uma letra, no
  começo da linha ou depois de espaço; não é tag dentro de código, de link nem título Markdown
  (`# Título`). Tags listadas na propriedade `tags` do topo da nota também contam.
- **Propriedades**: só o bloco de propriedades no topo da nota (RN-PROP-001). Bloco malformado é
  ignorado como propriedade e o texto dele continua pesquisável como conteúdo. Nada é corrigido nem
  gravado (validação de tipo fica para a spec de propriedades, RN-PROP-003).
- **Valor de filtro com espaço**: entre aspas (`pasta:"minhas notas"`).
- **Filtro repetido**: dois filtros do mesmo tipo valem juntos (`tag:#backend tag:#urgente` exige as
  duas tags).
- **Filtro sem valor** (`tag:` sozinho, sem escolher sugestão): ignorado até ter valor.
- **Nota renomeada, movida ou excluída com a busca aberta**: o resultado se atualiza (nome e pasta
  novos; excluída sai).
- **Edição não gravada da nota aberta**: a busca reflete o que está gravado; o salvamento
  automático (1 s) põe a busca em dia.
- **Arquivos fora da busca**: canvas, imagens, outros arquivos e pastas ocultas (como `.devnotes/`)
  não são pesquisados; canvas entra na spec de canvas.
- **Muitas ocorrências numa nota**: a nota aparece uma vez, com a quantidade de ocorrências e os
  primeiros trechos.
- **Muitos resultados**: a busca mostra a quantidade total e a lista rola sem travar.
- **Nota aberta pela busca com edição pendente em outra**: a edição pendente é gravada antes (spec
  001).

## Requirements *(mandatory)*

### Functional Requirements

**Busca rápida por nome (RN-BUSCA-003, 005)**

- **FR-001**: O usuário MUST poder abrir a busca rápida por atalho de teclado visível (LAY-06) e por
  um botão na interface.
- **FR-002**: A busca rápida MUST listar, a cada tecla, as notas cujo nome ou pasta combina com o
  texto, sem diferenciar maiúsculas nem acentos, na mesma ordem das sugestões de link da spec 002
  (nome que começa com o texto, depois nome que contém, depois só a pasta que contém), mostrando a
  pasta de cada nota.
- **FR-003**: Confirmar um resultado MUST abrir a nota (gravando antes a edição pendente da nota
  atual); Esc MUST fechar a busca sem abrir nada.
- **FR-004**: A busca rápida MUST funcionar inteira pelo teclado.

**Busca completa (RN-BUSCA-001, 003, 004, 005)**

- **FR-005**: O usuário MUST poder abrir a busca completa por atalho de teclado visível e por um
  botão na interface. Ela aparece num painel da barra lateral esquerda, no lugar da árvore, e o
  usuário MUST poder voltar à árvore pelo mesmo caminho; o editor e o painel de backlinks continuam
  visíveis enquanto ele percorre os resultados.
- **FR-006**: A busca completa MUST procurar no nome da nota, no conteúdo (inclusive blocos de
  código), nas tags e nas propriedades (nome e valor).
- **FR-007**: A busca MUST NOT diferenciar maiúsculas nem acentos em nenhuma dessas partes.
- **FR-008**: Várias palavras MUST exigir todas na mesma nota, em qualquer ordem e lugar; texto
  entre aspas MUST exigir a frase exata. Cada palavra casa com o início de uma palavra do texto,
  inclusive das partes separadas por hífen, sublinhado ou ponto.
- **FR-009**: Notas com o termo no nome MUST aparecer antes das que o têm só no conteúdo, tags ou
  propriedades (RN-BUSCA-004); dentro de cada grupo, as mais relevantes primeiro e, empatadas, por
  caminho.
- **FR-010**: Cada resultado MUST mostrar o nome, a pasta, a quantidade de ocorrências e até 3
  trechos, cada um com a ocorrência destacada; a quantidade total de notas encontradas MUST ficar
  visível.
- **FR-011**: Escolher um trecho MUST abrir a nota com o cursor na ocorrência; escolher a nota MUST
  abri-la na primeira ocorrência do conteúdo, ou no começo se o termo só está no nome.
- **FR-012**: O resultado MUST se atualizar enquanto o usuário digita e quando notas são criadas,
  alteradas, renomeadas, movidas ou excluídas, pelo app ou por outra ferramenta, sem buscar de
  novo.
- **FR-013**: Sem resultado, a busca MUST dizer que nenhuma nota corresponde.

**Filtros (RN-BUSCA-002; RN-TAG-001, 002)**

- **FR-014**: A busca completa MUST aceitar, no mesmo termo e combinados com o texto, os filtros
  `tag:` (com ou sem `#`), `pasta:` e `<propriedade>:` (qualquer propriedade existente no vault,
  como `linguagem:`). Todos os filtros e o texto MUST valer juntos.
- **FR-015**: `tag:#x` MUST incluir as notas com `#x` e com qualquer tag filha (`#x/...`), e MUST
  NOT incluir tag mãe nem irmã (RN-TAG-002).
- **FR-016**: `pasta:x` MUST incluir as notas da pasta `x` (caminho a partir da raiz do vault) e de
  todas as subpastas.
- **FR-017**: `<propriedade>:valor` MUST incluir as notas cuja propriedade tem esse valor, sem
  diferenciar maiúsculas nem acentos; em propriedade com lista, basta um dos itens.
- **FR-018**: `palavra:valor` em que `palavra` não é `tag`, `pasta` nem o nome de uma propriedade
  existente no vault MUST ser tratado como texto.
- **FR-019**: As tags de uma nota MUST ser lidas do próprio texto (fora de código, links e títulos)
  e da propriedade `tags`; as propriedades, do bloco no topo da nota. A busca MUST NOT alterar
  tags nem propriedades.

**Sugestões (RN-BUSCA-006)**

- **FR-020**: Ao digitar o valor de `tag:`, `pasta:` ou de uma propriedade, a busca MUST sugerir os
  valores existentes no vault que combinam com o que foi digitado, sem diferenciar maiúsculas nem
  acentos.
- **FR-021**: As sugestões MUST ser escolhidas pelo teclado; escolher MUST completar o filtro e
  refazer a busca.

**Gerais**

- **FR-022**: Buscar MUST NOT gravar nenhum arquivo do vault.
- **FR-023**: A busca MUST funcionar sem internet.
- **FR-024**: A busca MUST considerar só notas Markdown visíveis na árvore; canvas, outros arquivos
  e pastas ocultas ficam de fora.
- **FR-025**: O destaque da ocorrência MUST usar a mesma cor na busca e no painel de backlinks,
  legível nos temas claro e escuro (contraste mínimo 4,5:1), definida no guia de marca.

### Key Entities *(include if feature involves data)*

- **Consulta**: o que o usuário digitou, dividido em palavras, frases entre aspas e filtros.
- **Filtro**: tipo (`tag`, `pasta` ou nome de propriedade) e valor; restringe as notas do
  resultado.
- **Resultado**: nota encontrada, com onde casou (nome, conteúdo, tag, propriedade), quantidade de
  ocorrências e trechos.
- **Trecho**: a linha da ocorrência, cortada em volta dela quando longa, com a ocorrência destacada
  (como na spec 003).
- **Tag**: rótulo hierárquico lido do texto ou da propriedade `tags`; `#backend/api` é filha de
  `#backend`.
- **Propriedade**: par nome e valor (ou lista de valores) do bloco no topo da nota.
- **Índice de busca**: derivado das notas do vault aberto, reconstruído ao abrir o vault e mantido
  em dia com as mudanças; nunca gravado nesta spec.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Num vault de 5.000 notas, a busca rápida mostra os resultados de cada tecla em até
  0,3 s.
- **SC-002**: Num vault de 5.000 notas, a busca completa (texto e filtros) mostra o resultado em até
  0,5 s depois de o usuário parar de digitar.
- **SC-003**: Uma mudança numa nota aparece no resultado aberto em até 2 s.
- **SC-004**: A busca fica pronta em até 5 s depois de o vault de 5.000 notas abrir (após a
  primeira leitura dos arquivos), sem atrasar a árvore, a abertura de notas nem a digitação no
  editor além das metas das specs 001 a 003.
- **SC-005**: O usuário abre uma nota cujo nome conhece só pelo teclado: atalho, parte do nome e
  Enter.
- **SC-006**: 100% dos cenários de aceite passam, e nenhuma palavra parcial (termo no meio de outra
  palavra) aparece como ocorrência.

## Assumptions

- **Atalhos padrão**: busca rápida `Ctrl+P` (`Cmd+P` no macOS) e busca completa `Ctrl+Shift+F`
  (`Cmd+Shift+F`), como no VS Code; a paleta de comandos (`Ctrl+Shift+P`, RN-UI-002) é de outra
  spec e, quando existir, oferece as duas buscas (RN-UI-003).
- **Busca rápida só abre**: não cria nota quando nada combina; criar nota continua pela árvore e
  pelos links.
- **Notas recentes**: a busca rápida sem texto não lista notas recentes; isso depende da spec de
  abas (RN-UI-001).
- **Sintaxe**: sem operadores OU, negação, curinga nem expressão regular; podem vir depois.
- **Substituir**: buscar e substituir fica fora desta spec (a busca não grava).
- **Tags e propriedades**: lidas do texto, só para busca; as specs de tags e de propriedades vão
  reaproveitar a mesma leitura e trazer painel, edição e validação de tipos.
- **Destaque**: fica decidido que a cor do destaque é o azul da marca em fundo translúcido (20%)
  com o texto normal, como pede a constituição para destaques (princípio V); passa no contraste nos
  dois temas. O painel de backlinks, que usava a cor de item selecionado (`accent`), passa a usar o
  mesmo destaque. A decisão é registrada no `docs/brand.md`.
- **Uma nota aberta por vez**: como nas specs anteriores.
- **Dependências**: texto das notas mantido pelo índice de links (spec 003), abrir nota no ponto
  (spec 003), ordem das sugestões de nota (spec 002), gravação e alteração externa (spec 001).
  Nenhum contrato dessas specs muda.
- **Fora do escopo**: busca em vários vaults, busca em canvas, histórico de buscas, buscas salvas.
