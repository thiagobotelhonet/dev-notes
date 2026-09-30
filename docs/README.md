# Documentação do Dev Notes

| Documento | O que cobre | Quando ler |
|---|---|---|
| [`../.specify/memory/constitution.md`](../.specify/memory/constitution.md) | princípios I–V, inegociáveis, e portões de qualidade | antes de qualquer mudança |
| [`arquitetura.md`](arquitetura.md) | stack, pastas, forma do módulo, `shared/vault`, composições `app-*`, regras `LAY-*`, decisões | antes de criar, mover ou apagar arquivo |
| [`regras-de-negocio.md`](regras-de-negocio.md) | regras `RN-*`, decisões `DEC-PROD-*` e critérios `CA-*` | antes de implementar ou mudar comportamento |
| [`brand.md`](brand.md) | cores, fontes, medidas e tokens | antes de usar cor, fonte ou medida |
| [`standards.md`](standards.md) | regras de escrita, com código, nível e motivo | antes de escrever ou revisar código |
| [`development.md`](development.md) | criar funcionalidade, testar, atualizar dependências | ao começar ou apagar um módulo |
| [`decisions/`](decisions/) | uma decisão grande por arquivo: contexto, decisão, consequências | quando uma regra parecer estranha; antes de mudar uma decisão |

As specs de cada funcionalidade (spec, plano, tarefas e contratos) ficam em
[`../specs/`](../specs/).

## Como manter

- Documentação muda no mesmo commit do código.
- Uma informação, um lugar; os outros documentos apontam para ele.
- Texto curto, em tópicos, linguagem direta.
- Regra nova: próximo código livre da seção em `standards.md`. Regra que deixa
  de valer é apagada; o código não é reaproveitado.
- Decisão nova: `decisions/NNNN-nome-em-ingles.md`, no formato das existentes,
  com o ID da `arquitetura.md` §11 no título quando houver. Decisão revertida
  é marcada substituída, nunca apagada.
- Nome de arquivo em inglês; conteúdo em português (exceto os documentos de
  produto já em português: `arquitetura.md`, `regras-de-negocio.md`).
- Dependência nova ou mudança de comportamento entra no `CHANGELOG.md`.

Fora desta pasta: `CLAUDE.md` (o que ler antes de agir e as regras que quebram
em silêncio), `README.md` (o produto e como rodar),
`src/features/README.md` (o que é um módulo) e
`src/features/<módulo>/README.md` (regras de negócio do módulo).
