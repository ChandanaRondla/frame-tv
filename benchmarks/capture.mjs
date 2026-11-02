import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });

const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1
});

async function waitForArtwork() {
  await page.evaluate(async () => {
    const visibleImages = [...document.querySelectorAll('.tile img')]
      .filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.top < window.innerHeight &&
               rect.bottom > 0 &&
               rect.left < window.innerWidth &&
               rect.right > 0;
      });

    await Promise.all(visibleImages.map(async img => {
      if (!img.complete) {
        await new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }
    }));

    const hero = document.querySelector('.hero');
    const background = getComputedStyle(hero).backgroundImage;
    const match = background.match(/url\(["']?(.*?)["']?\)/);

    if (match) {
      const image = new Image();
      image.src = match[1];

      try {
        await image.decode();
      } catch {
        console.log('Hero image could not be decoded');
      }
    }
  });

  await page.waitForTimeout(800);
}

try {
  await page.goto('http://127.0.0.1:5173');

  await page.getByTestId('row-0').waitFor({
    state: 'visible',
    timeout: 30000
  });

  await waitForArtwork();

  await page.screenshot({
    path: 'docs/media/discovery.png',
    animations: 'disabled'
  });

  await page.locator('header nav button')
    .filter({ hasText: 'SERIES' }).click();

  await waitForArtwork();

  await page.screenshot({
    path: 'docs/media/series.png',
    animations: 'disabled'
  });

  await page.locator('header .search-trigger').click();
  await page.getByRole('searchbox').fill('Interstellar');

  await page.getByTestId('title-movie-157336')
    .waitFor({ state: 'visible', timeout: 20000 });

  await waitForArtwork();

  await page.screenshot({
    path: 'docs/media/search.png',
    animations: 'disabled'
  });

  console.log('All screenshots captured successfully.');
} finally {
  await browser.close();
}
