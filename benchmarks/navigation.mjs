import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

try {
  await page.goto('http://127.0.0.1:5173');

  const firstTile = page.locator('.shelves .tile').first();
  await firstTile.waitFor({ state: 'visible', timeout: 30000 });
  await firstTile.focus();

  const latencies = [];

  for (let i = 0; i < 50; i++) {
    const result = await page.evaluate(async (direction) => {
      return new Promise(resolve => {
        const before = document.activeElement;
        const start = performance.now();

        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: direction,
          bubbles: true
        }));

        function check() {
          if (document.activeElement !== before) {
            resolve(performance.now() - start);
          } else if (performance.now() - start > 1000) {
            resolve(null);
          } else {
            requestAnimationFrame(check);
          }
        }

        requestAnimationFrame(check);
      });
    }, i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');

    if (result !== null) latencies.push(result);
  }

  latencies.sort((a, b) => a - b);

  const percentile = p =>
    latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))];

  const memory = await page.evaluate(() =>
    performance.memory?.usedJSHeapSize ?? null
  );

  console.log(JSON.stringify({
    samples: latencies.length,
    p50NavigationMs: percentile(0.5),
    p95NavigationMs: percentile(0.95),
    maxNavigationMs: latencies.at(-1),
    usedJSHeapMB: memory === null ? null : memory / 1024 / 1024
  }, null, 2));

} finally {
  await browser.close();
}
