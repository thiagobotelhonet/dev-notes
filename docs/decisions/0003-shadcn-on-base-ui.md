---
status: aceita
date: 2026-09-20
---

# shadcn sobre Base UI, com a pasta `ui/` gerada

## Contexto

- Acessibilidade de menu, diálogo, seleção e campo é cara de escrever à mão e
  cara de manter.
- O shadcn copia o código para dentro do projeto em vez de publicar um pacote;
  o preset usado aqui é o Base UI, declarado em `components.json`.

## Decisão

As primitivas ficam em `src/shared/components/ui/`, instaladas por
`pnpm exec shadcn add <componente>` e não editadas à mão (CMP-01). Composição
pela propriedade `render` do Base UI, nunca `asChild` (CMP-03).

## Consequências

- O Biome não analisa essa pasta, e as regras de estilo deste repositório não
  valem lá (`biome.json`).
- Precisando de comportamento diferente, compõe-se por fora, em
  `src/shared/components/` ou no módulo.
- `asChild` é a API do Radix. Escrito aqui, não dá erro: simplesmente não faz
  nada.
- O MCP do shadcn em `.mcp.json` roda a versão do lockfile, evitando que um
  agente instale componente de outra versão.
- Peça visual escrita à mão tendo primitiva instalada é defeito, não escolha
  (CMP-02). A fronteira é o que o shadcn oferece: o que ele não tem, compõe-se
  a partir do que ele tem.
