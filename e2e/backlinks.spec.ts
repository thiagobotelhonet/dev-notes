import { expect, type Page, test } from "@playwright/test"

/* Runs on `pnpm dev:mock`: the demo vault lives in memory (src/mocks). */

const tree = (page: Page) =>
  page.getByRole("navigation", { name: "Arquivos do vault" })
const panel = (page: Page) => page.getByRole("region", { name: "Backlinks" })

async function openNote(page: Page, name: string) {
  await tree(page).getByRole("button", { name, exact: true }).click()
  await expect(page.getByRole("region", { name, exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await expect(tree(page)).toBeVisible()
})

test("backlinks: o painel mostra quem aponta, as menções, e linkar uma menção grava o link", async ({
  page,
}) => {
  await openNote(page, "deploy")
  await expect(
    panel(page).getByRole("button", { name: /Deploy: \[\[deploy\]\]/ })
  ).toBeVisible()

  const mentions = panel(page).getByRole("button", {
    name: /^Menções sem link/,
  })
  await expect(mentions).toHaveAttribute("aria-expanded", "false")
  await mentions.click()
  await expect(
    panel(page).getByRole("button", { name: /Rodar o Deploy de novo/ })
  ).toBeVisible()

  /* infra cites "Deploy:" too; the button next to the chosen snippet is the one. */
  await panel(page)
    .getByRole("button", { name: /o deploy falhou/ })
    .locator("..")
    .getByRole("button", { name: "Linkar menção em infra" })
    .click()
  await expect(page.getByText("Menção em “infra” virou link.")).toBeVisible()
  await expect(
    panel(page).getByRole("button", { name: /Ontem o \[\[deploy\]\] falhou/ })
  ).toBeVisible()

  await openNote(page, "infra")
  await expect(
    page.getByRole("textbox", { name: "Conteúdo da nota" })
  ).toContainText("Ontem o [[deploy]] falhou")
})

test("backlinks: clicar num trecho abre a nota que aponta e Ctrl+Shift+B esconde o painel", async ({
  page,
}) => {
  await openNote(page, "deploy")
  await panel(page)
    .getByRole("button", { name: /Rollback: \[\[deploy#Rollback\]\]/ })
    .click()
  await expect(
    page.getByRole("region", { name: "infra", exact: true })
  ).toBeVisible()
  await expect(panel(page)).toBeVisible()
  await page.keyboard.press("ControlOrMeta+Shift+B")
  await expect(panel(page)).toBeHidden()
  await page.keyboard.press("ControlOrMeta+Shift+B")
  await expect(panel(page)).toBeVisible()
})
