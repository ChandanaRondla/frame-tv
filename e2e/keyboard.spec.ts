import { test, expect } from '@playwright/test';

test('D-pad navigation moves focus and restores it after details close', async ({ page }) => {
  await page.goto('/');

  const firstRow = page.getByTestId('row-0');
  const firstTile = firstRow.locator('button').first();

  await expect(firstTile).toBeVisible({ timeout: 30000 });
  await firstTile.focus();

  await page.keyboard.press('ArrowRight');
  await expect(firstRow.locator('button').nth(1)).toBeFocused();

  await page.keyboard.press('ArrowDown');

  const secondRow = page.getByTestId('row-1');
  const selectedTile = secondRow.locator('button').nth(1);

  await expect(selectedTile).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('movie-details')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('movie-details')).toBeHidden();

  await expect(selectedTile).toBeFocused();
});
