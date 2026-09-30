# Política de segurança

## Versões suportadas

Vale o que está em `main`. Ainda não há versões mantidas em paralelo.

## Como relatar

Use o relato privado de vulnerabilidade do GitHub, em **Security → Report a
vulnerability** neste repositório. Ele cria uma conversa privada e não expõe a
falha antes de existir correção.

Não abra issue pública para falha de segurança. Issue é o lugar certo para
todo o resto.

Diga o que dá para fazer com a falha, não só o que está errado, e como
reproduzir.

## O que está no escopo

- O núcleo Rust em `src-tauri/`: os comandos `vault_*` e a validação que
  impede ler, gravar ou mandar para a lixeira qualquer caminho fora da pasta do
  vault (`resolve_in_vault`), inclusive por link simbólico.
- As permissões do app desktop em `src-tauri/capabilities/`.
- O acesso ao disco em `src/shared/vault/`: nada pode ser excluído de vez nem
  gravado fora do vault.
- A garantia de que o vault de demonstração e o adapter em memória ficam fora
  do build, e de que o app não carrega nada da rede, que é o que
  `scripts/check-build.mjs` confere.
- Os workflows em `.github/workflows/`, que rodam com o `GITHUB_TOKEN` do
  repositório.

## O que está fora do escopo

- O conteúdo das notas do usuário: ele fica só no computador dele e o app não
  envia nada a servidor nenhum.
- Vulnerabilidade em dependência sem caminho de exploração neste código. Os
  alertas do Dependabot já cobrem esse caso e viram PR.
