# Instruções do projeto

Dev Notes: app desktop local-first de notas em Markdown para devs. Tauri 2 com
React 19, Vite, shadcn/ui sobre Base UI, Tailwind v4, Zod, Zustand e
CodeMirror 6. Nada sai da máquina do usuário; os arquivos do vault são a fonte
da verdade.

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | só o front na porta 5000; fora do Tauri mostra "precisa rodar como app desktop" |
| `pnpm dev:mock` | o front com um vault de demonstração em memória (`src/mocks/`) |
| `pnpm tauri dev` | o app desktop de verdade, contra uma pasta do disco |
| `pnpm build` | gera `dist/` e confere que a simulação e recursos de rede ficaram de fora |
| `pnpm test` | testes de unidade, componente e contrato (adapter em memória) |
| `pnpm test:rust` | `cargo test` dos comandos Rust de `src-tauri/` |
| `pnpm test:e2e` | jornadas no navegador sobre o `dev:mock`; exige a porta 4300 livre |
| `pnpm typecheck` | tipos |
| `pnpm check` | Biome; `pnpm format` corrige o que der |
| `pnpm verify` | `check`, `typecheck`, `test`, `test:rust` e `build` |

- Rode `pnpm verify` antes de dar um trabalho por concluído. Mexeu em gravação,
  renomear, mover, excluir ou alteração externa? Rode também `pnpm test:e2e`.
- Só pnpm, nunca npm ou yarn. Node 24. Rust stable ≥ 1.90.

## Leia antes de agir

| Antes de… | Leia |
|---|---|
| qualquer mudança | `.specify/memory/constitution.md` (princípios I–V, inegociáveis) |
| criar, mover ou apagar arquivo; começar módulo | `docs/arquitetura.md` |
| escrever componente, estilo, estado, formulário ou teste | `docs/standards.md`, seção do assunto |
| usar cor, fonte ou medida | `docs/brand.md` |
| implementar ou mudar uma regra de negócio | `docs/regras-de-negocio.md` e a spec em `specs/` |
| mexer em arquivo, lixeira, observador ou janela | `src/shared/vault/` e `specs/001-vault-notas/contracts/shared-vault.md` |
| criar ou remover uma funcionalidade | `docs/development.md` |
| mudar uma regra ou decisão | `docs/decisions/` |
| mexer num módulo | `README.md` do módulo |

- Cite regra com código e título: "CMP-02 — Toda peça visual sai do shadcn".
- Mudou algo que a documentação descreve? Atualize no mesmo trabalho
  (`docs/README.md`, "Como manter").

## Regras que quebram em silêncio

Não dão erro quando descumpridas. Quebrar qualquer uma bloqueia a revisão.

- **Princípio III** — Nenhuma feature, componente ou store importa
  `@tauri-apps/*` nem chama `invoke`. Tudo passa por `@/shared/vault`, e toda
  capacidade nova entra nos dois adapters (Tauri e memória).
- **Princípio II** — Escrita do app registra no ledger antes de gravar. Nada é
  excluído de vez: exclusão vai para a lixeira do sistema.
- **NOM-03** — Outro módulo só pelo `index.ts`: `@/features/links`, nunca um
  caminho para dentro dele. Vale para os testes.
- **CMP-01** — `src/shared/components/ui/` não se edita à mão; use
  `pnpm exec shadcn add <componente>`.
- **CMP-02** — Elemento nativo que tem primitiva em `ui/` é proibido:
  `<select>`, `<input>`, `<button>`, `<label>`, `<table>`, `<hr>`. Toda peça
  visual sai do shadcn; só o editor (CodeMirror) é exceção (LAY-07).
- **CMP-03** — Composição por `render`, nunca `asChild` (Base UI).
- **CMP-09** — Um `<Toaster>` só, em `src/app/root.tsx`.
- **COR-01** — Nenhuma cor pronta (`text-green-700`, hexadecimal); só token.
- **COR-02** — Token de cor novo vai em `:root`, `.dark` e `@theme inline`, e
  só entra pelo `docs/brand.md` (LAY-09).
- **AMB-03** — O adapter de memória e `src/mocks/` só no modo `mock`; nunca no
  build.

## Antes de afirmar que algo está certo

- Varra o projeto inteiro antes de dizer "nada usa isto".
- Confira o resultado de cada comando na hora.
- Nunca responda prompt interativo no automático.

## Tauri, shadcn, CodeMirror e Zod mudam rápido

- Consulte a documentação antes de escrever o código, na versão instalada
  (`node_modules/<pacote>/package.json` e `src-tauri/Cargo.toml` dizem qual é).
  O `plugin-fs` fica na v2: a v3 muda o evento de watch (research R2).
- **Antes de escrever qualquer interface, consulte o MCP do shadcn** — ele
  está em `.mcp.json` e roda a versão do lockfile. Veja o que já existe e o que
  dá para instalar antes de compor peça nova (CMP-02, LAY-08).
- Fora disso: Context7 ou documentação oficial da versão certa.
