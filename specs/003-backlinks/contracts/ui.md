# Contrato: interface do usuário

**Base**: [ui da 001](../../001-vault-notas/contracts/ui.md), [ui da 002](../../002-links-incorporacao/contracts/ui.md)
· Regras: constituição IV e V, LAY-01..06, CMP-02, CMP-08, CMP-10. Textos em português (IDI-01).

## Onde fica

- Painel à direita da nota aberta, no `app-shell`, redimensionável (LAY-05). Só existe com uma nota
  aberta.
- Aberto por padrão. Mostrar e esconder:
  - botão no cabeçalho do editor, ícone `PanelRight`, nome acessível "Mostrar backlinks" /
    "Esconder backlinks", com `Tooltip` e `Kbd` `Ctrl+Shift+B` (`Cmd+Shift+B` no macOS) (LAY-06);
  - botão de fechar no cabeçalho do painel, nome acessível "Esconder backlinks";
  - atalho `Ctrl+Shift+B` em qualquer lugar do app.

## Painel (`app-panel`)

| Parte | Conteúdo |
| --- | --- |
| Título | "Backlinks" |
| Seção 1 | "Links para esta nota" com a contagem de notas; lista `app-note-list` |
| Seção 2 | `Collapsible` recolhido por padrão: "Menções sem link (N)"; lista `app-note-list` |
| Carregando | `Skeleton` de três itens com `aria-busy` enquanto o índice não está pronto |

| Estado | Texto (ícone + texto, CMP-08) |
| --- | --- |
| Nenhum backlink | `Empty` com ícone `Link2Off`: "Nenhuma nota aponta para esta." |
| Nenhuma menção | Dentro da seção 2: "Nenhuma menção sem link." |
| Nome curto | Dentro da seção 2: "Menções não são procuradas para nomes com menos de 3 caracteres." |

## Itens (`app-note-list`)

- Um item por nota: ícone `FileText`, nome e pasta ("raiz" na raiz).
- Abaixo, um trecho por ocorrência, clicável (abre a nota no ponto), com a ocorrência destacada
  (`mark` com fundo por token). Link de incorporação leva o `Badge` "incorporação".
- Nas menções, cada trecho tem o `Button` `variant="outline"` `size="sm"` "Linkar", com nome
  acessível "Linkar menção em {nota}" (CMP-10).
- Teclado: `Tab` percorre trechos e botões; `Enter` abre ou linka.

## Avisos (`toast`)

| Situação | Texto |
| --- | --- |
| Menção linkada | `success`: "Menção em “{nota}” virou link." |
| Arquivo mudou fora do app | `warning`: "“{nota}” mudou fora do Dev Notes. A lista foi atualizada." |
| Falha ao gravar | `error`: "Não foi possível gravar “{nota}”. Nada foi alterado." |
