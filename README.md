<h1 align="center">Dev Notes</h1>

<p align="center"><em>Markdown workspace for developers</em></p>

Dev Notes é um app desktop, open source e local-first, para guardar anotações
técnicas em Markdown: runbooks, decisões de arquitetura, investigações de bug,
trechos de código. Uma pasta do seu computador vira o **vault**, e as notas
continuam sendo arquivos `.md` comuns, que qualquer outro editor abre.

- **Seus arquivos, no seu computador.** Nada é enviado a servidor nenhum e tudo
  funciona sem internet.
- **Formatos abertos.** Markdown puro e canvas em JSON Canvas, compatíveis com
  Obsidian. Dá para parar de usar o app a qualquer momento sem perder nada.
- **Links que não quebram.** Renomear ou mover uma nota atualiza os `[[links]]`
  e os cartões de canvas que apontam para ela.
- **Nada some de vez.** Excluir manda para a lixeira do sistema, sempre com
  confirmação.

> Em desenvolvimento. Esta versão entrega as features 001, **Vault e Notas**,
> e 002, **Links e Incorporação**. Backlinks, busca, canvas, abas e histórico
> vêm nas próximas specs (`docs/regras-de-negocio.md`).

## O que já funciona

- Escolher uma pasta como vault; o último vault abre sozinho na próxima vez.
- Árvore de pastas, notas e canvas, navegável por teclado.
- Criar notas e pastas; editar com gravação automática (1 s depois da última
  tecla, ao trocar de nota, ao sair da janela e ao fechar o app). Quebras de
  linha (LF ou CRLF) e BOM do arquivo original são preservados.
- Renomear e mover notas e pastas atualizando links e cartões de canvas, com
  nomes repetidos detectados antes de gravar qualquer arquivo.
- Excluir notas e pastas para a lixeira do sistema, com confirmação. Se a
  lixeira não estiver disponível, nada é excluído.
- Conviver com outros editores: alteração feita fora do app aparece sozinha;
  se você tinha algo não gravado, o app pergunta qual versão manter.
- Links `[[nota]]` com a aparência do estado: válido, ainda não criado,
  excluído, nome repetido ou arquivo que não é nota. `Ctrl`+clique segue o
  link; um link para uma nota que ainda não existe cria a nota.
- Autocomplete ao digitar `[[`, que inclui a pasta quando o nome é repetido.
- Incorporação `![[nota]]` e `![[nota#Seção]]`: o conteúdo aparece abaixo da
  linha e acompanha a nota original.
- Tema claro e escuro, seguindo o sistema.

| Atalho no explorador | Ação |
| --- | --- |
| `Ctrl+N` | Nova nota na pasta selecionada |
| `Ctrl+Shift+N` | Nova pasta |
| `F2` | Renomear |
| `Ctrl+Shift+M` | Mover para… |
| `Delete` | Excluir |

| Atalho no editor | Ação |
| --- | --- |
| `Ctrl`+clique ou `Ctrl+Enter` no link | Seguir o link (`Cmd` no macOS) |
| `[[` | Sugerir notas para o link |

## Rodar a partir do código

Requisitos: Node 24, pnpm 10.33.0, Rust stable ≥ 1.90 e as
[dependências do Tauri 2](https://v2.tauri.app/start/prerequisites/) do seu
sistema (no Windows: Visual Studio com "Desenvolvimento para desktop com C++" e
WebView2).

```bash
pnpm install
pnpm tauri dev      # o app desktop
pnpm dev:mock       # só a interface no navegador, com um vault de demonstração em memória
```

Antes de enviar uma mudança:

```bash
pnpm verify         # Biome, TypeScript, testes, cargo test e build
pnpm test:e2e       # jornadas no navegador (porta 4300 livre)
```

Numa rede que intercepta TLS e bloqueia o download do Chromium do Playwright,
use um navegador instalado: `PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e`.

## Como o projeto é organizado

| Onde | O quê |
| --- | --- |
| `.specify/memory/constitution.md` | os princípios que nenhuma mudança pode ferir |
| `docs/regras-de-negocio.md` | regras de negócio e critérios de aceite |
| `docs/arquitetura.md` | stack, pastas, `shared/vault`, padrões de interface |
| `docs/brand.md` | cores, fontes e medidas |
| `docs/standards.md` | regras de escrita de código |
| `specs/` | spec, plano, tarefas e contratos de cada feature |
| `src-tauri/` | núcleo Rust (lista do vault, leitura em lote, lixeira) |
| `src/` | app React: `app/`, `features/`, `shared/` |

Veja também [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) e
[`SECURITY.md`](SECURITY.md).

## Stack

Tauri 2, React 19, TypeScript, Vite, shadcn/ui sobre Base UI, Tailwind 4,
CodeMirror 6, Zustand, Zod. Testes com Vitest, Testing Library, Playwright e
`cargo test`.
