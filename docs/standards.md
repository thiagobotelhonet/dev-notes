# Padrões de código

Como se escreve código aqui. Onde cada coisa mora: `arquitetura.md`. Motivo
das decisões grandes: `decisions/`. Princípios inegociáveis:
`.specify/memory/constitution.md`. Cores, fontes e medidas: `brand.md`.

Herdado do react-standards-template e adaptado a app desktop (Tauri, sem
camada HTTP nem rotas): saíram as regras `ROT-*`, `API-*`, `SEG-*`, `EST-01`,
`EST-04`, `CMP-05`, `CMP-06`, `IDI-03`, `TST-06`, `AMB-04` e `FER-03`, e
entraram as `LAY-*` de `arquitetura.md` §6.3. Código de regra removida não é
reaproveitado.

## Como ler

- Cada regra tem código (`CMP-02`), título e nível.
- **DEVE / NÃO DEVE:** obrigatório; descumprir é defeito.
- **DEVERIA / NÃO DEVERIA:** esperado; descumprir exige motivo dito na revisão.
- **PODE:** a critério de quem escreve.
- Quem cobra é a revisão, salvo quando a regra indica **Cobra:**.
- `src/shared/components/ui/` é gerado pelo shadcn e fica fora de quase todas
  as regras; veja CMP-01.

## Arquivos e nomes (NOM)

### NOM-01 — Nome de arquivo em minúsculas com hífen

**DEVE**

- Componentes inclusive: `vault-tree.tsx`, nunca `VaultTree.tsx`.
- Exceção: `src-tauri/` segue a convenção do Rust (`vault.rs`, `snake_case`).
- Por quê: padrão do shadcn; evita arquivo duplicado no histórico ao trocar de
  sistema operacional.

### NOM-02 — Exportação nomeada em todo arquivo de `src/`

**NÃO DEVE** usar `export default`.

- Por quê: o nome da coisa não muda de arquivo para arquivo, e a busca do
  editor encontra quem usa.
- Arquivo de configuração na raiz (`vite.config.ts`, `biome.json`) segue o
  formato que a ferramenta exige.

### NOM-03 — Atalho `@/` fora do módulo, caminho relativo dentro

**DEVE** · **Cobra:** Biome

- Dentro do módulo: `../types/links.schemas`. Fora: `@/shared/...`.
- Outro módulo só pelo `index.ts`: `@/features/links`. O Biome recusa
  `@/features/links/model/...`.
- Vale para os testes também: o teste de um módulo não importa arquivo interno
  de outro.
- Por quê: só assim o texto do import já diz quem é de dentro e quem é de fora.
  Detalhes em `arquitetura.md` §5.

### NOM-04 — Nome do arquivo começa com o assunto

**DEVE**

- `vault.names.ts`, `links.parser.ts`, `links.schemas.ts`, `vault-tree.tsx`,
  nunca `names.ts` ou `tree.tsx`.
- Em `model/`: um arquivo por assunto da regra (`<assunto>.<tipo>.ts`),
  nunca um arquivo por função. O assunto costuma ser o nome do módulo; no
  `editor`, que cuida da nota aberta, é `note` (`note.machine.ts`,
  `note.store.ts`).
- Por quê: o buscador do editor distingue os arquivos de quinze módulos; a
  lista de `model/` vira também a lista das regras do módulo.

### NOM-05 — Só existe o arquivo que o módulo usa

**NÃO DEVE** criar arquivo antecipado.

- `mutations.ts` nasce com a primeira gravação; `components/` nasce com o
  primeiro componente; `tests/` com o primeiro teste.
- Por quê: pasta vazia e arquivo de esqueleto viram manutenção sem consumidor.

### NOM-06 — O `index.ts` exporta só o que outro módulo usa

**DEVE**

- Componente interno, serviço e tipo auxiliar ficam de fora.
- Por quê: o `index.ts` é o contrato do módulo. Índice de tudo não é contrato;
  é permissão para qualquer um depender de qualquer coisa.

## Escrita de código (COD)

### COD-01 — O código se explica sozinho; comentário é evitado

**DEVERIA**

- Deu vontade de comentar? Renomeie a variável ou extraia uma função com o nome
  que você ia escrever no comentário.
- Comentário que sobrevive é o que explica *por quê*, não *o quê*.

### COD-02 — Comentário inevitável é em inglês

**DEVE**

- Uma linha, no formato `/* Storage can be unavailable in private browsing. */`.
- Por quê: comentário é para quem lê o código, e código aqui é em inglês
  (IDI-02).

### COD-03 — Conhecimento que não cabe no código vai para a documentação

**DEVE**

- Regra de negócio: `README.md` do módulo. Decisão grande: `decisions/`.
  Convenção: este arquivo.
- Por quê: comentário longo envelhece escondido; documentação é revisada.

### COD-04 — Sem abstração antes da necessidade

**NÃO DEVE**

- Nada de propriedade, variante, parâmetro ou camada sem um segundo uso real.
- Camada que só repassa a chamada é ruído: apague-a.
- Por quê: decisão 0009. O custo de generalizar cedo é pago em toda leitura.

### COD-05 — React importado por nome

**DEVE**

- `import { useState } from "react"`, nunca `import * as React` em código do
  projeto. Arquivos de `ui/` são gerados e ficam de fora.
- O tipo global (`React.ReactNode`) é aceito; hook e função vêm sempre por
  nome.

### COD-06 — Função pura nasce no arquivo que a usa

**DEVERIA**

- Sobe para `src/shared/lib/` quando o segundo arquivo precisar dela.
- Por quê: `utils.ts` vira gaveta quando recebe função de um consumidor só.

## Idioma (IDI)

### IDI-01 — O que chega ao usuário é em português

**DEVE**

- Rótulo, botão, título, mensagem de erro, texto de vazio, nome acessível e
  texto de esqueleto.
- Mensagem de erro do Zod também: ela aparece no formulário.

### IDI-02 — O que só o programador lê é em inglês

**DEVE**

- Nome de arquivo, pasta, variável, função, tipo, chave de cache, evento,
  comentário e mensagem de regra do Biome.

## Componentes e shadcn (CMP)

### CMP-01 — Componente do shadcn não é editado à mão

**DEVE**

- `src/shared/components/ui/` é gerado. Para instalar:
  `pnpm exec shadcn add <componente>`; confira o diff antes de commitar.
- Precisa de comportamento diferente? Componha por fora, em
  `src/shared/components/` ou no módulo.
- O MCP do shadcn está configurado em `.mcp.json` e roda a versão do lockfile,
  respeitando o preset Base UI de `components.json`.
- Por quê: a pasta é atualizável enquanto for gerada. Editada à mão, cada
  atualização vira conflito.
- Consequência: o Biome não analisa essa pasta (veja `biome.json`), e as regras
  de estilo deste documento não valem lá. Por isso import, variável e parâmetro
  sem uso são barrados pelo Biome (`noUnused*` como erro), e não pelo
  TypeScript: o código gerado às vezes traz um import sem uso, e o
  `noUnusedLocals` quebraria o typecheck.
- `src/shared/hooks/use-mobile.ts` também é gerado pelo shadcn (junto com a
  `Sidebar`) e fica na mesma exceção, inclusive da COD-05.

### CMP-02 — Toda peça visual sai do shadcn

**DEVE** · **Cobra:** varredura da revisão

- Elemento nativo que já tem primitiva instalada em
  `src/shared/components/ui/` é proibido fora dessa pasta: `<select>`,
  `<input>`, `<textarea>`, `<button>`, `<label>`, `<table>` e família, `<hr>`.
- A primitiva ainda não existe? Consulte o MCP do shadcn para achar o
  componente e instale: `pnpm exec shadcn add <componente>`.
- O shadcn não tem essa peça? Aí sim componha à mão, a partir das primitivas
  que existem, e diga o motivo no `README.md` do módulo.
- Estrutura continua nativa: `<div>`, `<span>`, `<p>`, `<form>`, título e lista
  não têm primitiva e não precisam.
- Por quê: foco, teclado, `aria-*`, comportamento de toque e tema escuro já vêm
  resolvidos e testados. Escrito à mão, cada peça resolve um pedaço e esquece
  outro — e o que esquece não dá erro.

### CMP-03 — Composição por `render`, nunca `asChild`

**NÃO DEVE**

- Base UI usa `render`: `<DropdownMenuTrigger render={<Button />} />`.
- Por quê: `asChild` é a API do Radix. Aqui ela não existe e falha calada.

### CMP-04 — Peça usada por mais de um módulo mora em `src/shared/components/`

**DEVE**

- Enquanto só um módulo usa, ela fica dentro do módulo.
- O prefixo `app-` é para as peças que montam estrutura de tela inteira
  (`app-shell.tsx`, `app-confirm.tsx`). Peça de apoio não precisa do prefixo
  (`theme-provider.tsx`).
- `src/shared` nunca importa de `src/features`.

### CMP-07 — Carregamento mostra esqueleto no formato da tela

**DEVERIA**

- Um esqueleto com a mesma altura e o mesmo número de blocos da tela pronta
  (a árvore do vault, por exemplo, com linhas no formato dos itens).
- Marque a região com `aria-busy` e um texto "Carregando…" em `sr-only`.
- Por quê: esqueleto fora de escala faz a tela pular quando o dado chega.

### CMP-08 — A cor nunca é a única portadora do significado

**DEVE**

- Situação, erro e aviso vêm com texto ou ícone junto.
- Por quê: daltonismo, tema escuro e impressão.

### CMP-09 — Avisos usam o sonner, com um `<Toaster>` só

**DEVE**

- O `<Toaster>` mora em `src/app/root.tsx`, importado de `sonner`, com as
  cores vindas dos tokens do bloco `[data-sonner-toaster]` de `styles.css`. Em
  qualquer outro lugar, `toast.success(...)` / `toast.error(...)`.
- Por quê: dois `Toaster` empilham dois avisos para o mesmo evento.

### CMP-10 — Todo controle tem nome acessível

**DEVE**

- Botão de ícone recebe `<span className="sr-only">`; campo recebe `<Label>`
  ligado por `htmlFor`; busca recebe `aria-label`.
- Por quê: sem isso o botão é anunciado como "botão" e o teste por papel
  (TST-03) não acha nada.

## Cores e estilo (COR)

### COR-01 — Componente nunca escreve cor pronta

**NÃO DEVE**

- Nada de `bg-blue-500`, `text-green-700` ou `#0f172a` no `className`.
- Use os tokens: `bg-card`, `text-muted-foreground`, `text-destructive`,
  `ring-foreground/10`.
- Por quê: cor pronta ignora o tema escuro e o dia em que a marca mudar.

### COR-02 — Token novo em três lugares

**DEVE**

- `src/styles.css`: valor em `:root`, valor em `.dark` e registro
  `--color-<nome>` em `@theme inline`.
- Faltando um dos três, a classe não existe ou o tema escuro fica com a cor do
  claro — sem erro nenhum.

### COR-03 — Medida entre colchetes é proibida

**NÃO DEVE** escrever `w-[327px]` ou `text-[13px]`.

- Use a escala do Tailwind. Se a medida se repetir e não estiver na escala,
  vire token no tema (COR-02).

### COR-04 — O tema vem do `ThemeProvider`

**DEVE**

- Leia com `useTheme()`. Nenhum componente lê `localStorage` de tema direto nem
  escreve a classe `dark` na mão.
- Por quê: a escolha "sistema" depende de um `matchMedia` só, e o valor é lido
  antes da primeira pintura em `initializeTheme()`.

## Layout (LAY)

Copiadas de `arquitetura.md` §6.3. A constituição (princípio V) torna as nove
obrigatórias; o nível de cada uma diz o quanto.

### LAY-01 — Toda tela vive dentro do `app-shell`

**DEVE**

- Nenhuma feature cria estrutura própria de página.

### LAY-02 — Lista de notas usa `app-note-list`

**DEVE**

- Busca, backlinks, histórico e snippets exibem notas do mesmo jeito.

### LAY-03 — Painel lateral usa `app-panel`

**DEVE**

- Mesmo cabeçalho, rolagem e estado vazio em todos os painéis.

### LAY-04 — Ação destrutiva confirma com `app-confirm`

**DEVE**

- Cobre RN-NOTA-002, RN-NOTA-009 e restauração de versão.

### LAY-05 — Redimensionar só com `Resizable`

**NÃO DEVE** usar arraste feito à mão.

### LAY-06 — Todo comando tem atalho visível com `Kbd`

**DEVERIA**

- Na paleta, em tooltips e menus.

### LAY-07 — Editor e canvas são as únicas exceções ao shadcn

**DEVE**

- CodeMirror e React Flow não existem no shadcn. Ficam dentro de
  `app-editor-frame` e `app-canvas-frame`, usam só tokens de `styles.css`
  (COR-01) e o motivo fica no `README.md` da feature (CMP-02).
- Toda interface ao redor deles (barras, menus, diálogos) continua shadcn.

### LAY-08 — Componente novo passa primeiro pelo MCP do shadcn

**DEVE**

- Antes de compor algo, consultar se o shadcn já tem a peça; compor só se não
  tiver.

### LAY-09 — Cores, fontes e medidas vêm de `docs/brand.md`

**DEVE**

- Ações usam `primary`; destaque e links usam `brand`. Cor nova só entra pelo
  `brand.md` e pelos três lugares da COR-02.

## Estado (EST)

### EST-02 — Campo de formulário é do TanStack Form

**DEVE**

- Nada de um `useState` por campo.
- Exceção: o campo único de edição inline da árvore do vault (nova pasta,
  renomear) guarda valor e erro em `useState`. Não há formulário, só um nome
  confirmado com Enter e validado por `validateName`.

### EST-03 — Estado efêmero fica no componente

**DEVERIA**

| Estado | Dono |
|---|---|
| conteúdo das notas | os arquivos do vault, lidos por `@/shared/vault` |
| vault aberto, árvore, nota ativa, edição pendente | store Zustand da feature (`vault.store.ts`, `note.store.ts`) |
| valor de campo enquanto edita | TanStack Form |
| menu aberto, confirmação pendente, termo digitado | `useState` do componente |
| tema | `ThemeProvider` |

- Exceção registrada no ADR-006 (`decisions/0012-zustand-workspace-state.md`):
  estado de workspace compartilhado pelo explorador, pelo editor, pelo
  observador de arquivos e pelos diálogos fica numa store Zustand da feature
  dona dele. Nenhuma outra store é criada sem um estado que não caiba em
  nenhuma linha dessa tabela.
- A store guarda o que foi lido do disco, não uma cópia que vira verdade: o
  arquivo prevalece (constituição, princípio II).

## Formulários (FRM)

### FRM-01 — O formulário valida pela mesma regra do modelo

**DEVE**

- `validators: { onSubmit: propertySchema }`, com o esquema vindo de
  `types/<módulo>.schemas.ts`, ou a função de validação de `model/`.
- Por quê: duas validações diferentes divergem, e a da tela é a que mente.

### FRM-02 — O `<form>` usa `noValidate`

**DEVE**

- Quem valida é o Zod; a bolha do navegador tem outro texto e outro idioma.

### FRM-03 — Todo campo tem rótulo ligado, estado e mensagem

**DEVE**

- `<Label htmlFor>`, `aria-invalid` quando houver erro e mensagem apontada por
  `aria-describedby`.
- Por quê: sem isso o erro existe na tela e não existe para quem usa leitor.

### FRM-04 — Mensagem de erro em português, escrita no esquema

**DEVE**

- `.min(2, "Informe pelo menos 2 caracteres.")` — não a mensagem padrão do Zod,
  que é em inglês.

### FRM-05 — O formulário não conhece o disco

**DEVE**

- Ele recebe `initialValues`, `isPending`, `error` e `onSave`. Quem chama a
  gravação é a store da feature.
- Por quê: assim o mesmo formulário serve para criar e editar, e o teste dele
  não precisa do vault.

## Datas, dinheiro e números (FMT)

### FMT-01 — Formatação só por `@/shared/lib/format`

**DEVE**

- `formatDate`, `formatNumber`, `formatCurrency`. Nenhum `Intl.` ou
  `toLocaleDateString` espalhado pela tela.
- Data inválida vira `—`, não "Invalid Date".

### FMT-02 — Idioma, moeda e fuso vêm de `config/app.ts`

**DEVE**

- Nunca `"pt-BR"` escrito dentro de um componente.

## Ambiente e publicação (AMB)

### AMB-01 — Nada de segredo em variável de ambiente

**NÃO DEVE**

- Tudo que começa com `VITE_` é substituído no build e fica legível no
  aplicativo. Chave, senha e token não entram ali.
- Hoje o app não usa nenhuma variável `VITE_*`.

### AMB-02 — `.env` é só de desenvolvimento

**DEVE**

- Nenhum `.env` é versionado. Se um existir, fica fora do git.

### AMB-03 — A simulação nunca chega ao build

**DEVE**

- O adapter de vault em memória e o vault de demonstração (`src/mocks/`) só
  entram no modo `mock` (`pnpm dev:mock` e Playwright), escolhidos em
  `src/shared/vault/index.ts` por `import.meta.env.MODE === "mock"`, que o Vite
  resolve no build.
- `pnpm build` roda `scripts/check-build.mjs`, que falha se o adapter de
  memória, o gancho de teste `__devnotesMock` ou o vault de demonstração
  aparecerem em `dist/`, ou se algum arquivo carregar recurso de rede
  (constituição, princípio I).
- Teste pode importar de `src/mocks/`; código de aplicação, não (o Biome
  recusa). A única exceção é o `import()` dinâmico de `shared/vault/index.ts`.

## Ferramentas e dependências (FER)

### FER-01 — O gerenciador é o pnpm

**DEVE**

- Declarado em `packageManager`, com Node 24 (`.node-version`, `engines`).
- `npm install` ou `yarn` criam outra trava, com outras versões. Decisão 0007.

### FER-02 — Dependência nova precisa de consumidor concreto

**DEVE**

- Versão exata no `package.json` (sem `^`), como as que já estão lá.
- Atualize famílias relacionadas juntas (Tauri e plugins, CodeMirror, Testing
  Library), leia o guia de migração e registre no `CHANGELOG.md` o que muda.
- No Rust (`src-tauri/Cargo.toml`), a versão também é exata: `"=2.12.0"`.
- Para descobrir a versão instalada: `node_modules/<pacote>/package.json`.

## Testes (TST)

### TST-01 — Teste o que a funcionalidade promete, não cada arquivo

**DEVERIA**

- Vale testar: regra de validação, reescrita de links, estado de erro,
  conflito com alteração externa, falha parcial e o caminho que o usuário
  percorre. Todo critério `CA-*` vira teste com o ID no nome, contra o adapter
  de vault em memória (constituição).
- Não vale: componente que só repassa propriedade, getter trivial, retrato
  extenso (`snapshot`) de HTML.

### TST-02 — Nome e lugar do teste

**DEVE**

| Alvo | Lugar |
|---|---|
| módulo | `src/features/<módulo>/tests/<assunto>.test.tsx` |
| integração entre módulos (o que só o `app/` liga) | `src/app/tests/<assunto>.test.tsx` |
| `shared/vault` | `src/shared/vault/tests/<assunto>.test.ts` |
| peça compartilhada | ao lado do arquivo: `app-confirm.test.tsx` |
| jornada no navegador | `e2e/<assunto>.spec.ts` |
| comando Rust | `#[cfg(test)]` no próprio arquivo de `src-tauri/src/` |

- O nome do arquivo repete o nome do que ele testa. O teste que percorre a
  jornada inteira do módulo, e não um arquivo, chama-se
  `<assunto>-flow.test.ts`.

### TST-03 — Busque pelo que o usuário vê

**DEVE**

- `getByRole`, `getByLabelText`, `findByText`. Nada de `container.querySelector`
  nem de classe CSS como seletor.
- Por quê: teste presa à marcação quebra em toda troca de componente e passa
  mesmo quando a tela está inacessível.

### TST-04 — Interação com `user-event`

**DEVE**

- `await userEvent.click(...)`, não `fireEvent`.

### TST-05 — Sem limpeza manual entre testes

**NÃO DEVE** escrever `cleanup()` ou `afterEach(cleanup)`.

- `globals: true` no `vitest.config.ts` já faz a Testing Library limpar sozinha.

### TST-07 — Playwright só para jornada crítica

**DEVERIA**

- As jornadas da constituição: criar, linkar, renomear, mover e excluir, mais
  o conflito com alteração externa. O resto é mais barato e mais estável em
  Vitest.
- O comando sobe e derruba o próprio servidor e exige a porta livre; ele não
  reaproveita uma aplicação já rodando.

### TST-08 — O prazo de espera é global

**DEVE**

- `asyncUtilTimeout` está no `vitest.setup.ts`. Nenhum teste passa `timeout`
  próprio para disfarçar lentidão.
