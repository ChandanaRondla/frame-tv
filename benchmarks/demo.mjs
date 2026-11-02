import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

fs.mkdirSync('docs/media', { recursive: true });

const browser = await chromium.launch({ headless: true });

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: {
    dir: 'docs/media',
    size: { width: 1440, height: 900 }
  }
});

const page = await context.newPage();

try {
  await page.goto('http://127.0.0.1:5173');

  await page.getByTestId('row-0').waitFor();

  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.tile img')]
      .filter(img => {
        const r = img.getBoundingClientRect();
        return r.top < innerHeight &&
               r.bottom > 0 &&
               r.left < innerWidth &&
               r.right > 0;
      });

    return images.length > 0 &&
           images.every(img => img.complete && img.naturalWidth > 0);
  }, { timeout: 15000 });

  await page.evaluate(async () => {
    const background = getComputedStyle(
      document.querySelector('.hero')
    ).backgroundImage;

    const match = background.match(/url\(["']?(.*?)["']?\)/);

    if (match) {
      const img = new Image();
      img.src = match[1];
      await img.decode();
    }
  });

  await page.waitForTimeout(1000);

  // Show discovery
  await page.locator('.shelves .tile').first().focus();
  await page.waitForTimeout(1200);

  // Navigate with D-pad
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(900);

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(900);

  await page.keyboard.press('Enter');
  await page.waitForTimeout(1800);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);

  // Browse series
  await page.locator('header nav button')
    .filter({ hasText: 'SERIES' }).click();

  await page.waitForTimeout(1800);

  // Search across categories
  await page.locator('header .search-trigger').click();
  await page.getByRole('searchbox').fill('Interstellar');

  await page.getByTestId('title-movie-157336')
    .waitFor({ state: 'visible', timeout: 20000 });

  await page.waitForTimeout(1800);

} finally {
  await page.close();
  const video = page.video();
  const videoPath = video ? await video.path() : null;
  await context.close();
  await browser.close();

  if (videoPath) {
    const destination = 'docs/media/demo.webm';
    fs.copyFileSync(videoPath, destination);
    console.log(`Video saved: ${destination}`);
  }
}
