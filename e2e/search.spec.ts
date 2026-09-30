import { expect, type Page, test } from "@playwright/test"

/* Runs on `pnpm dev:mock`: the demo vault lives in memory (src/mocks).
   Only Ctrl+P needs a real browser (it must not open the print dialog, TST-07);
   the rest of the search is covered in Vitest. */

const tree = (page: Page) =>
  page.getByRole("navigation", { name: "Arquivos do vault" })

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await expect(tree(page)).toBeVisible()
})

test("busca rápida: Ctrl+P, parte do nome e Enter abrem a nota", async ({
  page,
}) => {
  await page.keyboard.press("ControlOrMeta+KeyP")
  const field = page.getByPlaceholder("Nome da nota")
  await expect(field).toBeFocused()
  /* "depl" would also match snippets/deploy-api, the most recent (spec 002 order). */
  await field.fill("checkl")
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("region", { name: "checklist", exact: true })
  ).toBeVisible()
  await expect(field).toBeHidden()
})
