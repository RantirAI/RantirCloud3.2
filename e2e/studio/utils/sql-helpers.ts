import { expect, Page } from '@playwright/test'
import { toUrl } from './to-url.js'

export const runSQL = async (page: Page, ref: string, sql: string) => {
  await page.goto(toUrl(`/project/${ref}/sql/new`))
  await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 })

  await page.locator('.view-lines').click()
  await page.keyboard.press('ControlOrMeta+KeyA')
  await page.evaluate((text) => navigator.clipboard.writeText(text), sql)
  await page.keyboard.press('ControlOrMeta+KeyV')

  await page.getByTestId('sql-run-button').click()

  const confirmButton = page.getByRole('button', { name: 'Run this query' })
  if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmButton.click()
  }

  await expect(
    page.getByText('Success. No rows returned').or(page.getByText(/^\d+ rows?$/)).first()
  ).toBeVisible({ timeout: 30000 })
}
