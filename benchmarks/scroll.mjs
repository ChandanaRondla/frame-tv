import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 }
});

try {
  await page.goto('http://127.0.0.1:5173');

  await page.locator('.shelves .tile').first()
    .waitFor({ state: 'visible', timeout: 30000 });

  await page.evaluate(() => document.fonts.ready);

  const result = await page.evaluate(async () => {
    const samples = [];
    const duration = 5000;
    const start = performance.now();
    let previous = start;

    return new Promise(resolve => {
      function frame(now) {
        if (now - start >= duration) {
          const sorted = [...samples].sort((a, b) => a - b);
          resolve({
            frames: samples.length,
            durationSeconds: (now - start) / 1000,
            averageFPS: samples.length / ((now - start) / 1000),
            p95FrameTimeMs: sorted[
              Math.floor(sorted.length * 0.95)
            ] ?? null
          });
          return;
        }

        samples.push(now - previous);
        previous = now;

        window.scrollBy(0, 12);
        requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    });
  });

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
