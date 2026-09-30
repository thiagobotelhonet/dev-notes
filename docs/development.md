# Desenvolver o Dev Notes

## Nova funcionalidade

1. Escreva a spec com o Spec Kit (`/speckit-specify` → `/speckit-plan` →
   `/speckit-tasks`). As regras vêm de `regras-de-negocio.md`.
2. Regra pura em `features/<assunto>/model/`, esquemas Zod em `types/`.
3. Acesso ao disco, à lixeira, ao observador ou à janela só por
   `@/shared/vault`. Precisa de capacidade nova? Ela entra no contrato e nos
   dois adapters (Tauri e memória), com caso novo na suíte de contrato.
4. Estado global só se couber na exceção do ADR-006 (store Zustand da feature).
5. Componentes montados com shadcn e com as composições `app-*`
   (`arquitetura.md` §6). Exporte no `index.ts` só o que outro módulo usa.
6. Cada `CA-*` vira teste Vitest com o ID no nome; jornadas principais viram
   Playwright em `e2e/`.

Evite duplicar um módulo inteiro para depois manter abstrações vazias. Preserve
apenas arquivos que tenham consumidores. Compartilhe componentes quando o mesmo
comportamento aparecer em módulos distintos.

## Temas e componentes

Altere tokens semânticos em `:root`, `.dark` e `@theme inline`, sempre a partir
de `brand.md`. A cor não deve ser a única indicação de estado. Nomeie botões
de ícone, conecte rótulos aos campos e mantenha acesso por teclado.

Para instalar uma primitiva, consulte o MCP do shadcn, use
`pnpm exec shadcn add <componente>`, confira o diff e mantenha Base UI e o
preset em `components.json`.

## Qualidade

- Unitários para regras puras (`model/`) e para a suíte de contrato de
  `shared/vault`.
- Componentes com Testing Library, testando o que a pessoa vê e faz, sobre o
  adapter em memória.
- `cargo test` para os comandos Rust (`pnpm test:rust`).
- Playwright para as jornadas críticas, sobre o `pnpm dev:mock`.
- `pnpm verify` em cada entrega; teste de navegador nas mudanças de fluxo.
- Antes de uma versão: o roteiro manual do `quickstart.md` da spec no app
  desktop, em Windows, macOS e Linux.

Os testes de navegador usam a porta 4300 e exigem que esteja livre. O comando
inicia e encerra seu próprio servidor. Não reutiliza uma aplicação existente
nessa porta.

## Atualizar dependências

O lockfile e o `Cargo.lock` são versionados. Atualize famílias relacionadas
juntas (Tauri e seus plugins no npm e no Cargo, CodeMirror), consulte os guias
de migração, execute os checks e registre a mudança no changelog.
