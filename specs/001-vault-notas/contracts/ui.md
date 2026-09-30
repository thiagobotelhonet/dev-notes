# Contrato: interface do usuário

**Feature**: [../spec.md](../spec.md) · Regras: constituição IV e V, `docs/arquitetura.md` §6

Toda peça sai do shadcn (preset `base-nova`) ou de uma composição `app-*`. O único componente
fora do shadcn é o editor, dentro de `app-editor-frame` (LAY-07). Textos para o usuário em
português (IDI-01).

## Composições `app-*` desta feature

Só nascem as composições usadas agora (NOM-05, COD-04). As demais de `arquitetura.md` §6.2
(`app-tabs`, `app-panel`, `app-note-list`, `app-command`, `app-canvas-frame`) chegam com as specs
que as usam.

| Composição | Monta (shadcn) | Usada em | Regra |
| --- | --- | --- | --- |
| `app-shell` | `Sidebar` esquerda (logo + explorador) + área central, dentro de `Resizable`. A `Sidebar` direita nasce com o primeiro painel lateral | Toda a aplicação | LAY-01, LAY-05 |
| `app-empty` | `Empty` com ícone, título, descrição e ação (`Button`) | Sem vault, vault vazio, nenhuma nota aberta, nota não encontrada | — |
| `app-confirm` | `Alert Dialog` com título, descrição, Cancelar e ação destrutiva (`variant="destructive"`) | Excluir nota e pasta | LAY-04 |
| `app-choice-dialog` | `Alert Dialog` com duas ações nomeadas + descrição | Conflito de alteração externa | — |
| `app-editor-frame` | Moldura com tokens do tema em volta do editor; cabeçalho com nome da nota e indicador de edição pendente (`Badge` + texto) | Nota aberta | LAY-07, CMP-08 |

`shared/components/` nunca importa `features/` (CMP-04). As composições recebem dados e callbacks
por props; a lógica fica nas features.

## Telas e estados

| Estado | O que aparece | Peças |
| --- | --- | --- |
| Primeira execução, sem vault | "Escolha uma pasta para começar" + botão "Abrir pasta" | `app-empty` |
| Vault inacessível ao abrir | "Não foi possível abrir o vault" + "Escolher outra pasta" | `app-empty` + `sonner` |
| Vault removido ou inacessível com o app aberto | "A pasta do vault não está mais acessível" + "Escolher outra pasta" | `app-empty` + `sonner` |
| App aberto fora do app desktop (sem Tauri, fora do `dev:mock`) | "O Dev Notes precisa rodar como app desktop" | `app-empty` |
| Carregando o vault | Esqueleto da árvore | `Skeleton` (CMP-07), `aria-busy` |
| Vault aberto | Árvore à esquerda, nota ativa ao centro | `app-shell` |
| Vault vazio | "Nenhuma nota ainda" + "Nova nota" | `app-empty` |
| Nenhuma nota aberta | "Selecione ou crie uma nota" | `app-empty` |
| Nota aberta | Editor + indicador de edição pendente | `app-editor-frame` |
| Nota excluída fora do app | "Esta nota foi excluída fora do Dev Notes" + "Recriar com este conteúdo" (só se houver edição pendente) | `app-empty` |

## Explorador (feature `vault`)

- Árvore com `Sidebar` (menu) + `Collapsible` por pasta; ícones lucide `Folder`, `FileText`,
  `LayoutDashboard` (canvas).
- Item de canvas: aparece com aparência de desabilitado (`aria-disabled`, texto
  `muted-foreground`) e `Tooltip` "Abrir canvas ainda não está disponível". Clicar não faz nada.
  Renomear, mover e excluir funcionam normalmente.
- Ações por `Context Menu` e por `Dropdown Menu` no botão de ações do item (acessível por teclado):

| Ação | Onde | Atalho visível (`Kbd`, LAY-06) |
| --- | --- | --- |
| Nova nota | Pasta, raiz | `Ctrl+N` (na pasta selecionada) |
| Nova pasta | Pasta, raiz | `Ctrl+Shift+N` |
| Renomear | Nota, pasta | `F2` |
| Mover para… | Nota, pasta | `Ctrl+Shift+M` |
| Excluir | Nota, pasta | `Delete` |

- **Renomear**: edição inline com `Input` no próprio item; `Enter` confirma, `Esc` cancela.
  Erro de validação aparece abaixo do campo com ícone + texto (`Field` em estado de erro, CMP-08).
- **Mover para…**: `Dialog` com `Command` listando as pastas do vault (busca por nome).
- **Arrastar e soltar** fica fora desta spec.

## Mensagens

| Situação | Tipo | Texto |
| --- | --- | --- |
| Nome já existe na pasta (FR-013, FR-016) | Erro no campo / `toast.error` | "Já existe uma nota chamada “{nome}” em {pasta}." |
| Pasta com nome que já existe (criar, renomear ou mover pasta) | Erro no campo / `toast.error` | "Já existe uma pasta chamada “{nome}” em {pasta}." |
| Nome inválido (FR-005) | Erro no campo | "Nome inválido: {motivo}." |
| Confirmar excluir nota (FR-008) | `app-confirm` | Título "Excluir “{nome}”?" · Descrição "A nota vai para a lixeira do sistema. Links para ela continuarão no texto das outras notas." · Ação "Excluir" |
| Confirmar excluir pasta (FR-010) | `app-confirm` | Título "Excluir a pasta “{nome}”?" · Descrição "{n} notas {e m outros arquivos} irão para a lixeira do sistema." (pasta sem notas: "A pasta não contém notas.") |
| Lixeira indisponível (FR-024) | `toast.error` | "A lixeira do sistema não está disponível. Nada foi excluído; você pode excluir pelo gerenciador de arquivos." |
| Links atualizados (FR-011) | `toast.success` | "“{antigo}” agora é “{novo}”. {n} links atualizados." |
| Atualização parcial (FR-020) | `toast.error` com lista | "{n} arquivos não foram atualizados: {lista}." |
| Conflito externo (FR-022) | `app-choice-dialog` | Título "“{nome}” foi alterada fora do Dev Notes" · Descrição "Você tem alterações que ainda não foram gravadas." · Ações "Manter minha versão" / "Usar versão do arquivo" |

Um único `<Toaster>` na raiz do app (CMP-09), importado de `sonner` como no template, com o tema
vindo dos tokens do bloco `[data-sonner-toaster]` do `styles.css`.

## Acessibilidade

- Todo botão só com ícone tem nome acessível (CMP-10).
- Indicador de edição pendente: ícone + texto "Não gravado" (sr-only quando compacto), não só cor
  (CMP-08).
- A árvore é navegável por teclado (setas, `Enter` abre, `Ctrl+N`, `Ctrl+Shift+N`, `F2`,
  `Ctrl+Shift+M`, `Delete`).
