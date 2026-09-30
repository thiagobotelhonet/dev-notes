# backlinks

O painel à direita da nota aberta: quem aponta para ela. Dono das regras
`RN-BACK-*` (`docs/regras-de-negocio.md` §6.10) e da spec
`specs/003-backlinks/`.

## Contrato (`index.ts`)

| Export | Para quê |
|---|---|
| `BacklinksPanel` | painel da nota aberta; recebe `path`, `onOpen(path, offset)` e `onClose` |

O módulo não conhece o editor: quem abre a nota no ponto é o `app/`, pelo
`onOpen`. A única gravação é a do "Linkar", pelo `linkMention` do módulo
`vault`.

## Regras de negócio

| Regra | O que o módulo faz |
|---|---|
| RN-BACK-001 | Lista as notas com link para a aberta, uma entrada por nota, com um trecho por link |
| RN-BACK-002 | Mostra, numa seção recolhida por padrão (e recolhida de novo ao trocar de nota), as notas que citam o nome sem link, com a contagem visível |
| RN-BACK-003 | Só conta o nome como palavra inteira (regra `findMentions` do módulo `links`) |
| RN-BACK-004 | Cada menção tem o botão "Linkar", que a troca por um link para a nota aberta, uma por vez |

- Conta o link que resolve para a nota pela regra da spec 002 (RN-LINK-004):
  caminho exato com pasta, ou nome único. Link ambíguo, pendente ou quebrado
  não conta. `![[...]]` conta e aparece marcado como "incorporação".
- A própria nota não aparece.
- Notas em ordem alfabética pelo caminho; trechos na ordem do texto.
- Trecho: a linha do link, sem espaços nas pontas; mais de 120 caracteres é
  cortado em volta do link, com "…".
- Escolher um trecho abre a nota que aponta com o cursor no link.

## Menções sem link

- Palavra inteira: letras (com e sem acento), números, hífen e sublinhado fazem
  parte da palavra; "api" não é menção em "rapidamente", "api-gateway" nem
  "api_v2".
- Sem diferenciar maiúsculas, com os mesmos acentos (o link resultante tem de
  apontar para a nota).
- Fora de trechos de código e de qualquer `[[...]]`, inclusive apelido.
- Notas com nome de menos de 3 caracteres não geram menções; o painel avisa.

## Linkar

- "Linkar" (nome acessível "Linkar menção em {nota}") chama
  `linkMention` com a nota aberta como alvo. O texto escrito vira o link:
  `[[Deploy]]`, ou `[[pasta/nome|texto]]` quando o nome é repetido.
- Avisos por resultado: "Menção em “{nota}” virou link.";
  "“{nota}” mudou fora do Dev Notes. A lista foi atualizada." (nada é
  gravado); "Não foi possível gravar “{nota}”. Nada foi alterado.".
- O painel recalcula na hora depois de cada resultado.

## Atualização

- Calcula na hora ao abrir a nota e quando o índice de links fica pronto.
- Depois, recalcula 300 ms após cada mudança nas entradas do vault (gravar,
  reescrever, criar, excluir, alteração externa), sem ler o disco: o índice
  guarda o texto das notas (`textOf`).
- Mostrar o painel nunca grava arquivo.
