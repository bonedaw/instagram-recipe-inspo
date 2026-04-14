const fs = require('fs');
const path = require('path');

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  const raw = fs.readFileSync(filepath, 'utf8');
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

const rootDir = path.resolve(__dirname, '..');
loadEnvFile(path.join(rootDir, '.env'));

const config = {
  port: Number(process.env.PORT || 8787),
  igUsername: process.env.IG_USERNAME || 'the.real.cg.lagar.mat',
  igMediaLimit: Math.max(1, Number(process.env.IG_MEDIA_LIMIT || 40)),
  igScrapeUserAgent:
    process.env.IG_SCRAPE_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  igScrapeAppId: process.env.IG_SCRAPE_APP_ID || '936619743392459',
  igSessionId: process.env.IG_SESSION_ID || '',
  cacheFile: path.resolve(rootDir, process.env.CACHE_FILE || './data/recipes.json'),
  seedFile: path.resolve(rootDir, process.env.SEED_FILE || './data/seed-recipes.json'),
  cacheTtlMinutes: Math.max(1, Number(process.env.CACHE_TTL_MINUTES || 120)),
};

function assertRequired() {
  const missing = [];
  if (!config.igUsername) missing.push('IG_USERNAME');
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
}

module.exports = { config, assertRequired };
