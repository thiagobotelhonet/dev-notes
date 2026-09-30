import { expect, type Page, test } from "@playwright/test"

/* Runs on `pnpm dev:mock`: the demo vault lives in memory (src/mocks). */

const tree = (page: Page) =>
  page.getByRole("navigation", { name: "Arquivos do vault" })
const editor = (page: Page) =>
  page.getByRole("textbox", { name: "Conteúdo da nota" })

async function openNote(page: Page, name: string) {
  await tree(page).getByRole("button", { name, exact: true }).click()
  await expect(page.getByRole("region", { name, exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await expect(tree(page)).toBeVisible()
})

test("linkar: Ctrl+clique no link pendente cria e abre a nota na pasta da nota atual", async ({
  page,
}) => {
  await openNote(page, "infra")
  await page
    .getByTitle(/Nota ainda não existe/)
    .filter({ hasText: "[[ideia nova]]" })
    .click({ modifiers: ["ControlOrMeta"] })
  await expect(
    page.getByRole("region", { name: "ideia nova", exact: true })
  ).toBeVisible()
  await expect(
    page.getByText("Nota “ideia nova” criada em raiz.")
  ).toBeVisible()
  await expect(
    tree(page).getByRole("button", { name: "ideia nova", exact: true })
  ).toBeVisible()
})

test("linkar: o autocomplete com nome repetido insere a pasta", async ({
  page,
}) => {
  await openNote(page, "deploy")
  await editor(page).click()
  await page.keyboard.press("ControlOrMeta+End")
  await page.keyboard.type("\nVer [[api")
  const list = page.getByRole("listbox")
  await expect(list.getByRole("option")).toHaveCount(2)
  await list.getByRole("option", { name: /backend/ }).click()
  await expect(editor(page)).toContainText("Ver [[backend/api]]")
})

test("a incorporação mostra o conteúdo e acompanha a original alterada por fora", async ({
  page,
}) => {
  await openNote(page, "runbook")
  const block = page.getByRole("figure", {
    name: "Incorporação de checklist",
    exact: true,
  })
  await expect(block).toContainText("testes verdes")
  await page.evaluate(() =>
    window.__devnotesMock?.simulateExternal(
      { kind: "modified", path: "checklist.md" },
      "# Checklist\n\n## Antes do deploy\n\n- revisar o changelog\n"
    )
  )
  await expect(block).toContainText("revisar o changelog")
  await expect(editor(page)).toContainText("![[checklist]]")
})

test("link ambíguo pede a escolha da nota", async ({ page }) => {
  await openNote(page, "infra")
  await page
    .getByTitle(/Mais de uma nota com esse nome/)
    .click({ modifiers: ["ControlOrMeta"] })
  const dialog = page.getByRole("dialog", { name: "Qual nota abrir?" })
  await expect(dialog.getByRole("option")).toHaveCount(2)
  await dialog.getByRole("option", { name: /frontend/ }).click()
  await expect(
    page.getByRole("region", { name: "util", exact: true })
  ).toContainText("Util do frontend")
})
