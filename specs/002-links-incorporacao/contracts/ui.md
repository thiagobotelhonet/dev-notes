# Contrato: interface do usuário

**Base**: [ui da 001](../../001-vault-notas/contracts/ui.md) · Regras: constituição IV e V, LAY-*,
COR-*, CMP-08, CMP-10. Textos em português (IDI-01).

## Links no texto do editor

O texto `[[...]]` continua visível e editável; o estado aparece no traço e no estilo (research R2).

| Estado | Aparência | Dica ao passar o mouse |
| --- | --- | --- |
| Válido | texto normal, sublinhado contínuo na cor da marca | "Ctrl+clique para abrir" |
| Pendente | texto secundário, sublinhado tracejado | "Nota ainda não existe · Ctrl+clique para criar" |
| Quebrado | texto em cor de erro, tachado | "Nota excluída · Ctrl+clique para ver opções" |
| Ambíguo | texto normal, sublinhado ondulado na cor da marca | "Mais de uma nota com esse nome · Ctrl+clique para escolher" |
| Arquivo | texto normal, sublinhado pontilhado | "Arquivo que não é nota" |

- `Ctrl`+clique (`Cmd` no macOS) segue o link; `Ctrl+Enter` (`Cmd+Enter`) segue o link onde está o
  cursor. O clique simples só posiciona o cursor.
- Links dentro de código não são destacados.
- `[[]]`, `[[#Seção]]` e `[[|texto]]` (destino vazio) não são destacados nem seguidos.

## Seguir link: respostas da interface

| Situação | Peça | Texto |
| --- | --- | --- |
| Link ambíguo | `Dialog` + `Command` (padrão do "Mover para…") | Título "Qual nota abrir?" · Descrição "Existe mais de uma nota chamada “{nome}”." · itens com a pasta de cada candidata |
| Link quebrado | `app-confirm` com ação não destrutiva | Título "“{nome}” foi excluída" · Descrição "A nota pode ser restaurada pela lixeira do sistema, ou recriada vazia." · Ação "Recriar nota" · "Cancelar" |
| Nome inválido no link pendente | `toast.error` | "Não foi possível criar a nota: {motivo}." |
| Link para canvas ou outro arquivo | `toast.info` | "Abrir canvas ainda não está disponível." / "Abrir este tipo de arquivo ainda não está disponível." |
| Nota criada pelo link pendente | `toast.success` | "Nota “{nome}” criada em {pasta}." |

`app-confirm` ganha a propriedade `tone` (`"destructive"`, padrão, ou `"default"`) para a ação que
não destrói nada. É o segundo uso da peça, o que justifica a variação (COD-04).

## Bloco de incorporação

Logo abaixo da linha com `![[...]]`, dentro do `app-editor-frame`.

| Parte | Peça |
| --- | --- |
| Moldura | borda e fundo por tokens (`border`, `muted`), recuo à esquerda |
| Cabeçalho | ícone lucide `FileText`, nome da nota (e "› {seção}"), `Button` `variant="ghost"` `size="sm"` "Abrir" com ícone e nome acessível "Abrir {nome}" |
| Corpo | o texto da nota, somente leitura, com links destacados e seguíveis |
| Carregando | `Skeleton` de três linhas, `aria-busy` |

| Estado | Mensagem no bloco (ícone + texto, CMP-08) |
| --- | --- |
| Nota não encontrada | ícone `FileX` · "Nota não encontrada: {nome}" |
| Seção não encontrada | ícone `FileSearch` · "Seção “{seção}” não encontrada em {nome}" |
| Circular | ícone `Repeat` · "Incorporação circular: {nome} já aparece acima" |
| Nota vazia | ícone `File` · "{nome} está vazia" |
| Tipo não suportado | ícone `FileQuestion` · "Incorporar este tipo de arquivo ainda não está disponível" |
| Nome repetido | ícone `Files` · "Mais de uma nota chamada “{nome}”; indique a pasta" |
| Profundidade máxima | só o link `![[...]]` destacado, sem bloco |

O bloco não recebe foco de edição; cliques dentro dele não movem o cursor da nota principal.

## Autocomplete

- Abre ao digitar `[[` ou `![[`, junto ao cursor, dentro do `app-editor-frame` (LAY-07); tema só com
  tokens.
- Cada item: nome em destaque e a pasta em texto secundário ("raiz" quando na raiz).
- Setas navegam, `Enter` ou `Tab` escolhe, `Esc` fecha sem inserir; continuar digitando filtra.
- Lista vazia: "Nenhuma nota encontrada. Continue digitando para criar um link novo."

## Acessibilidade

- O estado do link também vai na dica (`title`), não só no traço.
- O botão "Abrir" do bloco tem nome acessível com o nome da nota (CMP-10).
- A lista de sugestões usa o padrão de listbox do CodeMirror (`aria-activedescendant`).
