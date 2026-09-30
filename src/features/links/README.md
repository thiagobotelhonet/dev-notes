# links

Lê links internos (`[[nome]]`, `[[pasta/nome]]`, com `#trecho`, `|apelido` e
`!` de incorporação) e cartões de canvas, calcula como reescrevê-los quando
uma nota muda de nome ou de pasta (spec 001) e diz para onde cada link aponta
e em que estado ele está (spec 002). Só regra pura: não conhece o vault, o
editor nem o CodeMirror.

## Contrato (`index.ts`)

| Export | Para quê |
|---|---|
| `createLinkIndex(files)` | índice em memória de links e cartões de canvas, montado a partir do conteúdo das notas e dos `.canvas`; guarda o texto de cada arquivo (`textOf`) para as menções |
| `LinkIndex` | tipo do índice |
| `affectedByMoves` | arquivos que uma renomeação ou movimentação reescreve (o editor grava antes) |
| `planChange`, `ChangePlan`, `EntryMove`, `fileMoves` | plano completo de uma renomeação ou movimentação, calculado antes de gravar (FR-019) |
| `parseLinks`, `LinkOccurrence` | links de um texto, com posição (o editor destaca e segue) |
| `resolveLinkTarget`, `LinkTarget`, `LinkState` | destino e estado de um link; a única regra usada por destaque, seguir link e incorporação |
| `findSection`, `Section` | trecho de uma nota sob um título (`[[nota#Seção]]`) |
| `suggestLinks` | sugestões do autocomplete, já ordenadas e com o texto a inserir |
| `embedState`, `EmbedState` | o que um bloco de incorporação mostra |
| `findMentions`, `Mention`, `mentionLink`, `mentionsSearched` | menções sem link de uma nota, o texto do link que substitui uma menção e se o nome é procurado (spec 003) |
| `LinkChoiceDialog` | diálogo "Qual nota abrir?" do link ambíguo (`Dialog` + `Command`, no padrão do "Mover para…") |
| `parseDeletedNotes`, `serializeDeletedNotes`, `withDeleted`, `withoutExisting`, `DeletedNotes` | registro de notas excluídas (`.devnotes/deleted-notes.json`, ADR-009) |

O índice fica só em memória e é reconstruído ao abrir o vault (constituição,
princípio II).

## Regras aplicadas

- **RN-LINK-004** — Um link com `/` aponta para o caminho exato da nota; sem
  `/`, para a única nota com esse nome no vault (maiúsculas e forma Unicode
  não contam). Nome repetido deixa o link ambíguo; nome que não existe deixa
  o link sem destino.
- **RN-NOTA-003** — Link para nota excluída continua no texto e passa a ficar
  sem destino; o índice não reescreve nada ao excluir.
- Destino vazio (`[[]]`, `[[#Seção]]`, `[[|texto]]`) não é link.
- Links dentro de cercas de código (```` ``` ````, `~~~`) e de código inline
  não contam.
- O `.md` escrito no destino (`[[api.md]]`) é ignorado na resolução.
- Canvas (JSON Canvas 1.0): só os nós `type: "file"` contam como cartão de uma
  nota; o campo `file` é o caminho a partir da raiz do vault, com extensão.
  JSON inválido não gera cartão.

## Estado do link (RN-LINK-002, spec 002)

`resolveLinkTarget` decide, nesta ordem:

| Estado | Quando |
| --- | --- |
| válido | a nota existe (caminho exato com `/`, ou nome único sem `/`) |
| ambíguo | o nome sem `/` é de mais de uma nota |
| arquivo | existe um canvas ou outro arquivo com esse nome ou caminho; nunca vira nota |
| quebrado | a nota não existe e está no registro de notas excluídas |
| pendente | nenhum dos anteriores; o destino é onde a nota será criada (a pasta do link, ou a pasta da nota que contém o link) |

- `#Seção` vira o título a abrir; `#^bloco` abre a nota inteira.
- A validação do nome da nota a criar não fica aqui: é do `vault`, que cria.
- Seção: título ATX fora de cerca de código, até o próximo título de nível
  igual ou maior; a busca ignora maiúsculas, acentos e espaços nas pontas
  (research R7).

## Link ambíguo (RN-LINK-003)

- Notas com o mesmo nome em pastas diferentes são permitidas. Um link só com o
  nome, escrito à mão ou por outra ferramenta, fica ambíguo: aparece com traço
  próprio e, ao ser seguido, pede a escolha entre as candidatas.
- Nada abre nem é criado sem a escolha, e o link nunca é reescrito sozinho.
  O autocomplete e o renomear já evitam criar links ambíguos (RN-LINK-004,
  005, 006).
- A seção do link (`[[util#Uso]]`) vale para a nota escolhida.

## Incorporação (RN-EMBED-001..003)

`embedState` decide o que um bloco `![[...]]` mostra:

| Situação | Estado |
| --- | --- |
| mais de 5 níveis de incorporação | profunda demais: fica só o texto `![[...]]` |
| destino pendente ou quebrado | nota não encontrada (RN-EMBED-002) |
| canvas ou outro arquivo | tipo não suportado |
| nome repetido sem pasta | ambígua, com as candidatas |
| a nota já aparece acima, inclusive a própria | circular (RN-EMBED-003) |
| `#Seção` que não existe | seção não encontrada |
| só espaços | vazia |
| senão | o conteúdo, ou só a seção pedida |

## Sugestões do autocomplete (RN-LINK-004, 005)

`suggestLinks(texto, entradas)` devolve no máximo 50 notas, nesta ordem
(FR-013):

1. nome que começa com o texto;
2. nome que contém o texto;
3. só a pasta contém o texto.

No mesmo grupo, a editada mais recentemente vem antes (`modifiedAt`). A
comparação ignora maiúsculas e acentos (`configuracao` acha `configuração`).
O texto inserido é só o nome quando ele é único entre as notas e
`pasta/nome` quando é repetido, para nenhum link sair ambíguo (SC-002).

## Menções sem link (RN-BACK-003, spec 003)

`findMentions(texto, nome)` devolve onde o nome aparece como palavra inteira,
sem diferenciar maiúsculas, com os mesmos acentos, fora de código e de
`[[...]]`; nome com menos de 3 caracteres não gera menção (`mentionsSearched`
diz se o nome é procurado). As posições são do
texto cru (com BOM e quebras originais). `mentionLink` monta o link que
substitui a menção: `[[texto]]` se o nome é único, `[[pasta/nome|texto]]` se é
repetido (RN-LINK-004), sempre preservando o texto lido.

## Registro de notas excluídas (FR-003, ADR-009)

- Lista de `{ path, deletedAt }`, a mais antiga primeiro, com no máximo 5.000
  entradas.
- Arquivo ausente, JSON inválido ou versão desconhecida viram registro vazio,
  sem erro: o registro é só um auxílio, nunca verdade sobre as notas.
- Uma nota sai do registro quando volta a existir uma nota com o mesmo caminho
  (sem diferença de maiúsculas).

## Reescrita ao renomear ou mover (RN-NOTA-004, 005, 010; RN-LINK-006)

- Link para a nota renomeada ou movida: passa a usar só o nome se o nome
  continuar único no vault, ou `pasta/nome` se ficar repetido (RN-LINK-004).
  Se o texto não muda (ex.: mover uma nota de nome único), o link fica como
  estava, inclusive nas maiúsculas.
- Nome que passa a ser repetido: links que usavam só o nome e apontavam para a
  **outra** nota ganham a pasta dela, preservando o destino (RN-LINK-006).
- Trecho (`#...`), apelido (`|...`) e incorporação (`!`) são preservados.
- Cartão de canvas: só o campo `file` muda; ids, posições, outros nós,
  arestas, campos desconhecidos, ordem e indentação do arquivo ficam como
  estavam. Canvas que ficou inválido depois de indexado é pulado e entra no
  aviso de atualização parcial.
- Os links são relidos do conteúdo atual de cada arquivo na hora do plano, não
  do índice, para o plano nunca trabalhar sobre um texto velho.
