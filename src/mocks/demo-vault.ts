import type { VaultPath } from "@/shared/vault"

/** Demo vault of `pnpm dev:mock` and Playwright (quickstart §4 of specs 001 to 004). */
export const demoVault: Record<VaultPath, string> = {
  "infra.md": [
    "# Infra",
    "",
    "Deploy: [[deploy]]",
    "API: [[backend/api]]",
    "Rollback: [[deploy#Rollback]]",
    "Pendente: [[ideia nova]]",
    "Repetido: [[util]]",
    "Canvas: [[mapa.canvas]]",
    "",
    "Ontem o deploy falhou por falta de espaço.",
    "",
    "Tags: #backend",
    "",
  ].join("\n"),
  "deploy.md": [
    "# Deploy",
    "",
    "Passo a passo do deploy.",
    "",
    "## Rollback",
    "",
    "Voltar para a versão anterior.",
    "",
  ].join("\n"),
  "runbook.md": [
    "# Runbook",
    "",
    "![[checklist]]",
    "",
    "Só a primeira parte:",
    "",
    "![[checklist#Antes do deploy]]",
    "",
    "Se falhar, Rodar o Deploy de novo.",
    "",
    "```bash",
    "kubectl rollout restart deployment/api",
    "```",
    "",
  ].join("\n"),
  "checklist.md": [
    "# Checklist",
    "",
    "## Antes do deploy",
    "",
    "- testes verdes",
    "",
    "## Depois",
    "",
    "- avisar o time",
    "",
  ].join("\n"),
  "a.md": "# A\n\n![[b]]\n",
  "rapido.md": "# Rápido\n\nrapidamente, api-gateway e api_v2\n",
  "notas.md":
    "# Notas\n\n[[backend/api]] e [[api]]; a api (nova) sai amanhã.\n",
  "db.md": "# DB\n\nNome curto: não gera menções.\n",
  "b.md": "# B\n\n![[a]]\n",
  "mapa.canvas": JSON.stringify(
    {
      nodes: [
        {
          id: "n1",
          type: "file",
          file: "deploy.md",
          x: 0,
          y: 0,
          width: 400,
          height: 400,
        },
      ],
      edges: [],
    },
    null,
    "\t"
  ),
  "backend/api.md": "# API\n",
  "backend/util.md": "# Util do backend\n",
  "frontend/api.md": "# API do frontend\n",
  "frontend/util.md": "# Util do frontend\n",
  "Configuração.md": "# Configuração\n\nConfiguração do proxy da empresa.\n",
  "snippets/deploy-api.md":
    "---\nlinguagem: csharp\n---\n# Deploy da API\n\n#backend\n\nComo fazer o deploy da API em C#.\n",
  "snippets/hello-py.md":
    '---\nlinguagem: python\ntags: [backend/api]\n---\n# Hello\n\nprint("olá")\n',
  "snippets/dotnet/build.md":
    "---\nlinguagem: csharp\n---\n# Build\n\nAntes do deploy, rodar o build do .NET.\n",
}
