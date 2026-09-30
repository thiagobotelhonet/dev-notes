import { expect, type Page, test } from "@playwright/test"

/* Runs on `pnpm dev:mock`: the demo vault lives in memory (src/mocks). */

const tree = (page: Page) =>
  page.getByRole("navigation", { name: "Arquivos do vault" })
const editor = (page: Page) =>
  page.getByRole("textbox", { name: "Conteúdo da nota" })

async function itemAction(page: Page, name: string, action: RegExp) {
  await tree(page).getByRole("button", { name, exact: true }).hover()
  await page
    .getByRole("button", { name: `Ações de ${name}`, exact: true })
    .click()
  await page.getByRole("menuitem", { name: action }).click()
}

async function openNote(page: Page, name: string) {
  await tree(page).getByRole("button", { name, exact: true }).click()
  await expect(page.getByRole("region", { name, exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await expect(tree(page)).toBeVisible()
})

test("criar uma nota e escrever nela", async ({ page }) => {
  await page.getByRole("button", { name: "Ações da raiz do vault" }).click()
  await page.getByRole("menuitem", { name: /Nova nota/ }).click()
  await expect(page.getByRole("region", { name: "Sem título" })).toBeVisible()
  await editor(page).click()
  await page.keyboard.type("# Primeira nota\n\nescrita no Dev Notes")
  await expect(page.getByText("Não gravado")).toBeVisible()
  await expect(page.getByText("Não gravado")).toBeHidden()
  await expect(
    tree(page).getByRole("button", { name: "Sem título", exact: true })
  ).toBeVisible()
})

test("com infra aberta, renomear deploy para release atualiza o link no editor", async ({
  page,
}) => {
  await openNote(page, "infra")
  await itemAction(page, "deploy", /Renomear/)
  const field = page.getByRole("textbox", { name: "Novo nome de deploy" })
  await field.fill("release")
  await field.press("Enter")
  await expect(editor(page)).toContainText("[[release]]")
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await expect(
    tree(page).getByRole("button", { name: "release", exact: true })
  ).toBeVisible()
})

test("criar a pasta servicos, mover backend/api para ela e ver o link de infra acompanhar", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Ações da raiz do vault" }).click()
  await page.getByRole("menuitem", { name: /Nova pasta/ }).click()
  const field = page.getByRole("textbox", { name: "Nome da nova pasta" })
  await field.fill("servicos")
  await field.press("Enter")
  await tree(page).getByRole("button", { name: "backend", exact: true }).click()
  await itemAction(page, "api", /Mover para/)
  await page
    .getByRole("dialog")
    .getByRole("option", { name: "servicos" })
    .click()
  /* A new folder starts expanded. */
  await expect(
    tree(page).getByRole("button", { name: "api", exact: true })
  ).toBeVisible()
  await openNote(page, "infra")
  /* The demo vault also has frontend/api (spec 002), so the name stays
     repeated and the link keeps the folder (RN-LINK-004). */
  await expect(editor(page)).toContainText("API: [[servicos/api]]")
})

test("excluir com confirmação mantém o link no texto das outras notas", async ({
  page,
}) => {
  await itemAction(page, "deploy", /Excluir/)
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toContainText("Excluir “deploy”?")
  await dialog.getByRole("button", { name: "Excluir" }).click()
  await expect(
    tree(page).getByRole("button", { name: "deploy", exact: true })
  ).toHaveCount(0)
  await openNote(page, "infra")
  await expect(editor(page)).toContainText("[[deploy]]")
})

for (const choice of [
  "Manter minha versão",
  "Usar versão do arquivo",
] as const) {
  test(`conflito com alteração externa resolvido por “${choice}”`, async ({
    page,
  }) => {
    await openNote(page, "deploy")
    await editor(page).click()
    await page.keyboard.press("End")
    await page.keyboard.type(" minha edição")
    await page.evaluate(() =>
      window.__devnotesMock?.simulateExternal(
        { kind: "modified", path: "deploy.md" },
        "# Deploy\n\nescrito por fora\n"
      )
    )
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toContainText(
      "“deploy” foi alterada fora do Dev Notes"
    )
    await dialog.getByRole("button", { name: choice }).click()
    await expect(dialog).toHaveCount(0)
    if (choice === "Manter minha versão")
      await expect(editor(page)).toContainText("minha edição")
    else await expect(editor(page)).toContainText("escrito por fora")
  })
}
