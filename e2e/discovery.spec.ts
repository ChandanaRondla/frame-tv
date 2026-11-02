import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('row-0')).toBeVisible({
    timeout: 30000,
  });
});

test('loads the TMDB catalog', async ({ page }) => {
  await expect(page.getByText(/40 collections/)).toBeVisible();
  await expect(page.locator('.tile').first()).toBeVisible();
});

test('header and category filters stay synchronized', async ({ page }) => {
  await page.getByRole('button', { name: 'SERIES', exact: true }).click();

  await expect(
    page.getByRole('button', { name: 'Series', exact: true })
      .filter({ hasNot: page.locator('nav button') })
  ).toHaveAttribute('aria-pressed', 'true');

  await expect(page.getByText('Trending Series')).toBeVisible();

  await page.getByRole('button', { name: 'FILMS', exact: true }).click();
  await expect(page.getByText('Trending Movies')).toBeVisible();
});

test('global search finds movies while Series is selected', async ({ page }) => {
  await page.locator('header nav button').filter({ hasText: 'SERIES' }).click();

  await page.getByRole('button', { name: /Search/ }).click();
  await page.getByRole('searchbox').fill('interstellar');

  await expect(
    page.getByTestId('title-movie-157336')
  ).toBeVisible({ timeout: 20000 });
});

test('opens and closes movie details', async ({ page }) => {
  await page.locator('.shelves .tile').first().click();

  await expect(page.getByTestId('movie-details')).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.getByTestId('movie-details')).toBeHidden();
});
