const http = require('http');
const { URL } = require('url');
const { config, assertRequired } = require('./config');
const { scrapeProfileMedia } = require('./instagramScraper');
const { mediaListToRecipes } = require('./recipeParser');
const { readCache, writeCache, isCacheFresh } = require('./cacheStore');
const { parseCsv, searchRecipes } = require('./search');

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function currentCache() {
  return readCache(config.cacheFile);
}

async function refreshCache(force = false) {
  const existing = currentCache();
  if (!force && isCacheFresh(existing, config.cacheTtlMinutes)) {
    return { cache: existing, refreshed: false };
  }

  assertRequired();
  const media = await scrapeProfileMedia({
    username: config.igUsername,
    limit: config.igMediaLimit,
    userAgent: config.igScrapeUserAgent,
    appId: config.igScrapeAppId,
    sessionId: config.igSessionId,
  });

  const recipes = mediaListToRecipes(media);
  const cache = {
    source: 'instagram-web-scrape',
    username: config.igUsername,
    updatedAt: new Date().toISOString(),
    count: recipes.length,
    recipes,
  };
  writeCache(config.cacheFile, cache);
  return { cache, refreshed: true };
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = reqUrl.pathname;

  if (path === '/health') {
    return json(res, 200, { ok: true, service: 'instagram-recipe-inspo' });
  }

  if (path === '/api/refresh') {
    try {
      const force = reqUrl.searchParams.get('force') === '1';
      const { cache, refreshed } = await refreshCache(force);
      return json(res, 200, {
        ok: true,
        refreshed,
        updatedAt: cache.updatedAt,
        count: cache.count,
      });
    } catch (err) {
      return json(res, 500, { ok: false, error: err.message });
    }
  }

  if (path === '/api/recipes') {
    try {
      const { cache } = await refreshCache(false);
      return json(res, 200, {
        ok: true,
        source: cache.source,
        username: cache.username || config.igUsername,
        updatedAt: cache.updatedAt,
        count: cache.count,
        recipes: cache.recipes,
      });
    } catch (err) {
      return json(res, 500, { ok: false, error: err.message });
    }
  }

  if (path === '/api/random') {
    try {
      const { cache } = await refreshCache(false);
      if (!cache.recipes.length) return json(res, 404, { ok: false, error: 'No recipes found' });
      const idx = Math.floor(Math.random() * cache.recipes.length);
      return json(res, 200, { ok: true, recipe: cache.recipes[idx] });
    } catch (err) {
      return json(res, 500, { ok: false, error: err.message });
    }
  }

  if (path === '/api/search' || path === '/api/suggestions') {
    try {
      const count = Math.max(1, Number(reqUrl.searchParams.get('count') || 3));
      const ingredients = parseCsv(
        reqUrl.searchParams.get('ingredients') || reqUrl.searchParams.get('includeTags')
      );
      const excludeIngredients = parseCsv(
        reqUrl.searchParams.get('excludeIngredients') || reqUrl.searchParams.get('excludeTags')
      );
      const protein = String(reqUrl.searchParams.get('protein') || 'all').toLowerCase();
      const query = String(reqUrl.searchParams.get('query') || '');

      const { cache } = await refreshCache(false);
      const suggestions = searchRecipes(cache.recipes, {
        count,
        ingredients,
        excludeIngredients,
        protein,
        query,
      });

      return json(res, 200, {
        ok: true,
        source: cache.source,
        username: cache.username || config.igUsername,
        updatedAt: cache.updatedAt,
        count: suggestions.length,
        suggestions,
      });
    } catch (err) {
      return json(res, 500, { ok: false, error: err.message });
    }
  }

  return json(res, 404, { ok: false, error: 'Not found' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    json(res, 500, { ok: false, error: err.message || 'Unhandled server error' });
  });
});

server.listen(config.port, () => {
  console.log(`instagram-recipe-inspo listening on http://localhost:${config.port}`);
});
