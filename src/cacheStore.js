const fs = require('fs');
const path = require('path');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function readCache(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function isCacheFresh(cache, ttlMinutes) {
  if (!cache || !cache.updatedAt) return false;
  const ageMs = Date.now() - new Date(cache.updatedAt).getTime();
  return ageMs >= 0 && ageMs <= ttlMinutes * 60 * 1000;
}

module.exports = { readCache, writeCache, isCacheFresh };
