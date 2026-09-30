# Módulos (features)

Cada pasta aqui dentro é um assunto do produto, dono de todo o seu próprio
código: regras puras (`model/`), esquemas (`types/`), estado, componentes,
testes e README. Entender ou apagar uma funcionalidade inteira é mexer em uma
pasta só.

A forma de um módulo, a fronteira entre módulos e o que fica em `src/shared`
estão em [`docs/arquitetura.md`](../../docs/arquitetura.md) §5. O motivo da
organização está em
[`docs/decisions/0002-folders-by-business-module.md`](../../docs/decisions/0002-folders-by-business-module.md).

Regras que valem aqui: NOM-03 (outro módulo só pelo `index.ts`), NOM-04 (o nome
do arquivo começa pelo assunto), NOM-05 (só existe o arquivo que o módulo usa)
e NOM-06 (o `index.ts` exporta só o que sai do módulo).

Cada módulo tem um `README.md` com o que ele faz e as regras de negócio dele.

| Módulo | O que é |
|---|---|
| [`vault`](vault/README.md) | explorador, criar, renomear, mover e excluir (RN-NOTA-*) |
| [`editor`](editor/README.md) | nota aberta, gravação automática e conflito com alteração externa |
| [`links`](links/README.md) | leitura e reescrita de links e cartões de canvas |
