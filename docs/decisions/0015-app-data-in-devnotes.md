---
status: aceita
date: 2026-09-30
id: ADR-009
---

# ADR-009 — Dados do app em `.devnotes/`

## Contexto

- A spec 002 precisa diferenciar link quebrado (a nota existia e foi
  excluída) de link pendente (a nota nunca existiu), inclusive depois de
  fechar e reabrir o app (FR-003). Os arquivos não guardam essa informação.
- O registro é do vault: se a pasta for copiada para outra máquina, ele deve
  ir junto. A configuração global do app (qual foi o último vault) continua
  na pasta de configuração do sistema (constituição, princípio II).
- No Unix, o escopo `raiz/**` do Tauri não cobre pastas iniciadas por ponto
  (`require_literal_leading_dot`, `tauri` 2.12.0, `src/scope/fs.rs`); no
  Windows cobre. Usar o `plugin-fs` funcionaria diferente entre sistemas
  (`specs/002-links-incorporacao/research.md`, R4).

## Decisão

- Dados do app referentes a um vault ficam em `<vault>/.devnotes/`, em JSON
  validado por Zod. O primeiro é `deleted-notes.json`, o registro de notas
  excluídas: guarda só caminhos e datas, nunca conteúdo.
- O acesso é pela interface `AppDataStore` de `shared/vault`
  (`read(name)`, `write(name, content)`), nos dois adapters.
- No Tauri, por dois comandos Rust próprios, `vault_app_data_read` e
  `vault_app_data_write`. Eles só aceitam nomes `^[a-z0-9-]+\.json$`, só
  tocam `<raiz>/.devnotes/<name>` e recusam `.devnotes` ou arquivo que seja
  link simbólico ou que, canonizado, saia da raiz.

## Consequências

- Vault portátil: o registro acompanha a pasta.
- Uma pasta extra no vault, que o usuário precisará ignorar quando houver
  Git (tradeoff da `arquitetura.md` §11).
- Os dados de `.devnotes/` nunca são verdade sobre as notas: arquivo ausente,
  inválido ou de versão desconhecida vira dado vazio, sem erro para o
  usuário, e apagar a pasta não perde nota nenhuma.
- `.devnotes/` não aparece na árvore nem chega ao `FileWatcher`, como todo
  nome iniciado por ponto (FR-002 da spec 001).
- Histórico e configurações do vault, quando existirem, usam o mesmo
  caminho.
