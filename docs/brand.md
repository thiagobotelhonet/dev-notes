# Dev Notes — Identidade visual

| Campo | Valor |
| --- | --- |
| Versão | 0.1 |
| Data | 2026-09-29 |
| Local no repositório | `docs/brand.md` |
| Origem | Proposta visual (logo, paleta, tipografia e tokens) aprovada em 2026-09-29 |

> Este documento é a fonte das cores, fontes e medidas. Componente não escreve cor pronta (COR-01): usa sempre os tokens abaixo.

---

## 1. Marca

| Item | Definição |
| --- | --- |
| Nome | `[a definir]` — "DevNotes" (como no logo) ou "Dev Notes" |
| Slogan | Markdown workspace for developers |
| Logo principal | Símbolo (nota com canto dobrado e `< >`) + nome, "Dev" em navy e "Notes" em azul |
| Ícone do app | Símbolo sobre fundo navy com cantos arredondados |

### 1.1 Onde o logo é usado

| Uso | Arquivo |
| --- | --- |
| Favicon | `public/favicon.svg` |
| Topo da sidebar | `src/shared/components/app-shell.tsx` |
| Ícones do app desktop (Windows, Linux, macOS) | `src-tauri/icons/`, gerados com `pnpm tauri icon <arquivo>` a partir de um PNG 1024×1024 |
| Repositório | `README.md` |

### 1.2 Pendências do logo

- A arte atual é imagem gerada por IA (PNG). Precisa ser redesenhada em **SVG** antes de virar favicon e ícone.
- As duas versões apresentadas têm pequenas diferenças no ícone; escolher uma como oficial.

---

## 2. Paleta

### 2.1 Cores da marca

| Nome | Hex | Uso |
| --- | --- | --- |
| Azul marca | `#3B82F6` | Logo, destaques, links no tema escuro, anel de foco |
| Azul ação | `#2563EB` | Botão primário e ações (ver 2.3) |
| Navy | `#0F172A` | Texto principal no tema claro, "Dev" do logo |
| Gray 600 | `#475569` | Texto secundário no tema claro |
| Gray 400 | `#94A3B8` | Texto secundário no tema escuro |
| Gray 200 | `#E2E8F0` | Bordas no tema claro |
| Gray 50 | `#F8FAFC` | Fundos secundários no tema claro |
| Background escuro | `#0B1220` | Fundo do tema escuro |
| Gray 800 | `#1F2937` | Superfícies (cards, painéis) no tema escuro |
| Gray 700 | `#334155` | Bordas no tema escuro |
| Accent escuro | `#1E3A8A` | Item selecionado no tema escuro |

### 2.2 Tokens do shadcn

| Token | Claro | Escuro |
| --- | --- | --- |
| `--background` | `#FFFFFF` | `#0B1220` |
| `--foreground` | `#0F172A` | `#F8FAFC` |
| `--card` / `--popover` | `#FFFFFF` | `#1F2937` |
| `--card-foreground` / `--popover-foreground` | `#0F172A` | `#F8FAFC` |
| `--primary` | `#2563EB` | `#2563EB` |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` |
| `--secondary` / `--muted` | `#F8FAFC` | `#1F2937` |
| `--secondary-foreground` | `#0F172A` | `#F8FAFC` |
| `--muted-foreground` | `#475569` | `#94A3B8` |
| `--accent` | `#E2E8F0` | `#1E3A8A` |
| `--accent-foreground` | `#0F172A` | `#F8FAFC` |
| `--destructive` | `#DC2626` `[inferido]` | `#EF4444` `[inferido]` |
| `--border` / `--input` | `#E2E8F0` | `#334155` |
| `--ring` | `#3B82F6` | `#3B82F6` |
| `--sidebar` | `#F8FAFC` | `#0B1220` |
| `--sidebar-foreground` | `#0F172A` | `#F8FAFC` |
| `--sidebar-primary` | `#2563EB` | `#2563EB` |
| `--sidebar-primary-foreground` | `#FFFFFF` | `#FFFFFF` |
| `--sidebar-accent` | `#E2E8F0` | `#1E3A8A` |
| `--sidebar-accent-foreground` | `#0F172A` | `#F8FAFC` |
| `--sidebar-border` | `#E2E8F0` | `#334155` |
| `--sidebar-ring` | `#3B82F6` | `#3B82F6` |
| `--radius` | `0.5rem` | `0.5rem` |

`--destructive` não estava na proposta visual; o valor é sugestão e pode ser trocado.

### 2.3 Acessibilidade (contraste)

| Combinação | Contraste | Resultado |
| --- | --- | --- |
| Branco sobre `#3B82F6` | 3,68:1 | Reprovado para texto normal (mínimo 4,5:1) |
| Branco sobre `#2563EB` | 5,17:1 | Aprovado → por isso `--primary` é `#2563EB` |
| `#3B82F6` sobre `#0B1220` | 5,09:1 | Aprovado → links e destaques no tema escuro |
| `#475569` sobre branco | 7,58:1 | Aprovado |
| `#94A3B8` sobre `#0B1220` | 7,30:1 | Aprovado |
| `#94A3B8` sobre `#1F2937` | 5,72:1 | Aprovado |
| `#0F172A` sobre `#3B82F6` a 20% em branco | 14,16:1 | Aprovado → destaque de ocorrência no tema claro |
| `#F8FAFC` sobre `#3B82F6` a 20% em `#0B1220` | 13,97:1 | Aprovado → destaque de ocorrência no tema escuro |

### 2.4 Destaque de ocorrência

A palavra encontrada num trecho (busca, backlinks) usa `bg-brand/20 text-foreground`: o azul da
marca em fundo translúcido com o texto normal por cima. Vale para toda lista de notas e é
desenhado só pelo `app-note-list`.

- Por que não `accent`: é a cor de item selecionado, e o destaque aparece dentro de itens que podem
  estar selecionados.
- Por que não `brand` sólido: com texto claro por cima fica em 3,68:1 (reprovado); com texto escuro,
  4,85:1, no limite e pesado demais em trechos com várias ocorrências.

---

## 3. Tipografia

| Uso | Fonte | Tamanho / altura de linha |
| --- | --- | --- |
| Título (H1) | Inter Bold | 36 / 44 |
| Subtítulo (H2) | Inter Semibold | 24 / 32 |
| Texto | Inter Regular | 16 / 24 |
| Código e editor | JetBrains Mono | 14 / 20 |

Fontes instaladas localmente (o app funciona offline), substituindo a Geist do template:

```
pnpm add @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

---

## 4. Medidas

| Item | Valores |
| --- | --- |
| Raio | none 0 · sm 4px · md 8px (padrão) · lg 12px · xl 16px |
| Borda | 1px sólida, cor `--border` |
| Sombra | sm, md, lg (padrões do Tailwind) |
| Espaçamento | Base 8px: 4 · 8 · 16 · 24 · 32 · 48 |
| Ícones | lucide (padrão do template) |

---

## 5. Implementação em `src/styles.css`

Segue a regra COR-02 do template (token novo em três lugares: tema claro, tema escuro e `@theme inline`).

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@fontsource-variable/inter";
@import "@fontsource-variable/jetbrains-mono";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.5rem;
  --background: #ffffff;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --secondary: #f8fafc;
  --secondary-foreground: #0f172a;
  --muted: #f8fafc;
  --muted-foreground: #475569;
  --accent: #e2e8f0;
  --accent-foreground: #0f172a;
  --destructive: #dc2626;
  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #3b82f6;
  --brand: #3b82f6;
  --sidebar: #f8fafc;
  --sidebar-foreground: #0f172a;
  --sidebar-primary: #2563eb;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #e2e8f0;
  --sidebar-accent-foreground: #0f172a;
  --sidebar-border: #e2e8f0;
  --sidebar-ring: #3b82f6;
}

.dark {
  --background: #0b1220;
  --foreground: #f8fafc;
  --card: #1f2937;
  --card-foreground: #f8fafc;
  --popover: #1f2937;
  --popover-foreground: #f8fafc;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --secondary: #1f2937;
  --secondary-foreground: #f8fafc;
  --muted: #1f2937;
  --muted-foreground: #94a3b8;
  --accent: #1e3a8a;
  --accent-foreground: #f8fafc;
  --destructive: #ef4444;
  --border: #334155;
  --input: #334155;
  --ring: #3b82f6;
  --brand: #3b82f6;
  --sidebar: #0b1220;
  --sidebar-foreground: #f8fafc;
  --sidebar-primary: #2563eb;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1e3a8a;
  --sidebar-accent-foreground: #f8fafc;
  --sidebar-border: #334155;
  --sidebar-ring: #3b82f6;
}

@theme inline {
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, monospace;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 4px);
  --radius-xl: calc(var(--radius) + 8px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-brand: var(--brand);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}
```

O token `--brand` (`text-brand`) é o azul da marca para destaques e links; ações usam `--primary`.

---

## 6. Pendências

| Item | Situação |
| --- | --- |
| Nome oficial (DevNotes x Dev Notes) | `[a definir]` |
| Logo e ícone em SVG | A redesenhar a partir da proposta |
| Versão oficial do ícone | Escolher entre as duas apresentadas |
| Cor `--destructive` | Sugestão, confirmar |
