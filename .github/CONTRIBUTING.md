# Contribuir

## Rodar

Requisitos: Node 24, pnpm 10.33.0, Rust stable ≥ 1.90 e as dependências do
Tauri 2 para o seu sistema (<https://v2.tauri.app/start/prerequisites/>).

```bash
pnpm install --frozen-lockfile
pnpm dev:mock      # só o front, com vault de demonstração em memória
pnpm tauri dev     # o app desktop
```

Antes de abrir a PR:

```bash
pnpm verify
```

`verify` roda Biome, TypeScript, os testes, o `cargo test` e o build. Mexeu em
gravação, renomear, mover, excluir ou alteração externa? Rode também
`pnpm test:e2e`, que precisa da porta 4300 livre.

## Mudar código

Leia a constituição (`.specify/memory/constitution.md`) e a seção
correspondente de `docs/standards.md` antes de escrever. As regras que quebram
em silêncio estão listadas no `CLAUDE.md`: são as que não dão erro quando
descumpridas, e quebrar qualquer uma bloqueia a revisão.

Regra tem código para ser citada. Na revisão, "CMP-02 — Toda peça visual sai do
shadcn" localiza a regra, o motivo e a consequência sem depender da memória de
quem revisa.

Mudou algo que a documentação descreve? Atualize no mesmo trabalho.

## Mudar uma regra

Regra nova entra em `docs/standards.md` com código, nível e motivo. Regra
grande ganha um arquivo em `docs/decisions/`. Os princípios da constituição só
mudam com decisão explícita do responsável pelo produto, registrada em ADR.

## O que o CI cobra

| Workflow | Quando | O que responde |
|---|---|---|
| `Quality` | toda PR e todo push em `main` | Biome, tipos, testes, `cargo test`, build, auditoria das dependências e a jornada no navegador. `verify` é o check que resume os outros |
| `CodeQL` | toda PR e todo push em `main` | análise estática de segurança; só roda onde o repositório é público |
| `Node next compatibility` | segunda de manhã | a próxima versão do Node quebra o projeto |

PR que só mexe em texto pula os jobs de código; o `verify` continua rodando e
é ele que a proteção de branch deve exigir.

## Segurança

Falha de segurança não vai em issue pública: use **Security → Report a
vulnerability**, que abre uma conversa privada. O `SECURITY.md` da raiz diz o
que está no escopo.

Cada action nos workflows está presa por SHA de commit, não por tag.

## Commits

Assunto no imperativo, em português, dizendo o efeito. O corpo explica o
porquê quando o diff não explica sozinho.
