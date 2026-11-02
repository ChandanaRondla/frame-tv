import { test, expect, type Page } from '@playwright/test';

const movie = {
  id: 'movie-157336',
  tmdbId: 157336,
  kind: 'movie',
  name: 'Interstellar',
  year: 2014,
  genre: 'Science Fiction',
  description: 'A journey beyond Earth.',
  poster: null,
  backdrop: null,
  rating: 8.6
};

const series = {
  id: 'tv-1399',
  tmdbId: 1399,
  kind: 'tv',
  name: 'Northern Kingdom',
  year: 2011,
  genre: 'Drama',
  description: 'An epic television drama.',
  poster: null,
  backdrop: null,
  rating: 8.4
};

async function mockGraphQL(page: Page) {
  await page.route('**/graphql', async route => {
    const request = route.request().postDataJSON();
    const query = request.query as string;

    let data: Record<string, unknown>;

    if (query.includes('catalog')) {
      data = {
        catalog: {
          uniqueTitles: 2,
          source: 'Mock fixture',
          rows: [
            { id: 0, label: 'Trending Movies', items: [movie, movie] },
            { id: 1, label: 'Trending Series', items: [series, series] }
          ]
        }
      };
    } else if (query.includes('search(')) {
      data = {
        search: [movie, series].filter(title =>
          title.name.toLowerCase().includes(
            String(request.variables?.query ?? '').toLowerCase()
          )
        )
      };
    } else if (query.includes('trailer(')) {
      data = { trailer: null };
    } else {
      data = { health: 'ready' };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data })
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockGraphQL(page);
  await page.goto('/');
  await expect(page.getByTestId('row-0')).toBeVisible();
});

test('@mock catalog loads without TMDB', async ({ page }) => {
  await expect(page.getByText(/2 collections/)).toBeVisible();
  await expect(page.getByTestId('title-movie-157336').first()).toBeVisible();
});

test('@mock category filters work', async ({ page }) => {
  await page.locator('header nav button').filter({ hasText: 'SERIES' }).click();
  await expect(page.getByText('Trending Series')).toBeVisible();
  await expect(page.getByText('Trending Movies')).toHaveCount(0);

  await page.locator('header nav button').filter({ hasText: 'FILMS' }).click();
  await expect(page.getByText('Trending Movies')).toBeVisible();
});

test('@mock global search ignores active category', async ({ page }) => {
  await page.locator('header nav button').filter({ hasText: 'SERIES' }).click();
  await page.locator('header .search-trigger').click();
  await page.getByRole('searchbox').fill('Interstellar');
  await expect(page.getByTestId('title-movie-157336')).toBeVisible();
});

test('@mock details open and close', async ({ page }) => {
  await page.locator('.shelves .tile').first().click();
  await expect(page.getByTestId('movie-details')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('movie-details')).toBeHidden();
});

test('@mock D-pad focus is restored', async ({ page }) => {
  const first = page.getByTestId('row-0').locator('.tile').first();
  await first.focus();

  await page.keyboard.press('ArrowRight');
  const second = page.getByTestId('row-0').locator('.tile').nth(1);
  await expect(second).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('movie-details')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(second).toBeFocused();
});
