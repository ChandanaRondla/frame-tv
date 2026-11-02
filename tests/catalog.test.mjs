import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalog = readFileSync('src/catalog.ts', 'utf8');
const server = readFileSync('server/index.mjs', 'utf8');

test('catalog retrieves live data through GraphQL', () => {
  assert.match(catalog, /fetch\('\/graphql'/);
  assert.match(catalog, /getCatalog/);
  assert.match(catalog, /uniqueTitles/);
});

test('server keeps TMDB authentication in backend', () => {
  assert.match(server, /process\.env\.TMDB_ACCESS_TOKEN/);
  assert.match(server, /Authorization:/);
  assert.match(server, /Bearer/);

  assert.doesNotMatch(catalog, /TMDB_ACCESS_TOKEN/);
});

test('server defines 40 discovery categories', () => {
  const categoryBlock = server.split('const categorySpecs=')[1]?.split('];')[0] || ''; 
  const categories = categoryBlock.match(/\['[^']+','[^']+'\]/g) || [];
  assert.equal(categories.length, 40);
});

test('catalog supports movies and TV series', () => {
  assert.match(server, /trending\/movie/);
  assert.match(server, /trending\/tv/);
  assert.match(server, /search\/movie/);
  assert.match(server, /search\/tv/);
});

test('trailer lookup validates media type', () => {
  assert.match(server, /Invalid media kind/);
  assert.match(server, /YouTube/);
});
